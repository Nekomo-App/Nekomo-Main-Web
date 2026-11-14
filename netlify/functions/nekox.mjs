// NekōX private API — Netlify function serving the app's AniList-shaped endpoints.
// Metadata comes from AniList's public GraphQL; stream extraction is not provided here.

const ANILIST = "https://graphql.anilist.co";

const json = (body, status = 200) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
});

async function gql(query, variables = {}) {
    const r = await fetch(ANILIST, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query, variables }),
    });
    return r.json();
}

const PAGE = `query($page:Int,$per:Int,$sort:[MediaSort],$search:String,$genre:[String]){
  Page(page:$page,perPage:$per){
    media(sort:$sort,search:$search,genre_in:$genre,type:ANIME){
      id title{romaji english native} coverImage{extraLarge large}
      episodes status format seasonYear description nextAiringEpisode{episode}
      siteUrl genres studios(isMain:true){edges{node{name}}} startDate{year}
    }
  }
}`;

const SCHEDULE = `query($page:Int,$per:Int){
  Page(page:$page,perPage:$per){
    airingSchedules(sort:TIME,notYetAired:true){
      episode airingAt media{title{romaji english} coverImage{large} id}
    }
  }
}`;

const INFO = `query($id:Int){
  Media(id:$id,type:ANIME){
    id title{romaji english native} coverImage{extraLarge large}
    episodes status format seasonYear description nextAiringEpisode{episode}
    siteUrl genres studios(isMain:true){edges{node{name}}} startDate{year}
  }
}`;

export const handler = async (event) => {
    try {
        // Path arrives as /.netlify/functions/nekox/<route> (or /api/anime/<route> via redirect).
        const route = event.path
            .replace(/^\/api\/anime/, "")
            .replace(/^\/\.netlify\/functions\/nekox/, "") || "/";
        const params = event.queryStringParameters || {};
        // Members-only API: requests must come from the app (X-Nekox-App header).
        // Exempt: /qr/approve (the phone's browser pair page, already gated by
        // code+key) and /staff/* (HMAC-signed admin auth of its own).
        const open = route === "/qr/approve" || route.startsWith("/staff/") || route.startsWith("/admin/");
        const appTok = (event.headers || {})["x-nekox-app"] || (event.headers || {})["X-Nekox-App"];
        if (!open && appTok !== "nx-app-7f3a9c") {
            return json({ ok: false, error: "app_only" }, 403);
        }
        const page = parseInt(params.page || "1", 10);
        const per = Math.min(parseInt(params.per_page || "30", 10), 50);

        const list = async (sort, extra = {}) => {
            const r = await gql(PAGE, { page, per, sort, ...extra });
            return json({ results: r?.data?.Page?.media || [] });
        };

        if (route === "/spotlight" || route === "/trending") return list(["TRENDING_DESC"]);
        if (route === "/popular") return list(["POPULARITY_DESC"]);
        if (route === "/recent") return list(["UPDATED_AT_DESC"]);
        if (route === "/search") return list(["SEARCH_MATCH"], { search: params.query || "" });
        if (route === "/filter") {
            const genre = params.genre;
            return list(["POPULARITY_DESC"], genre ? { genre: [genre] } : {});
        }
        if (route === "/schedule") {
            const r = await gql(SCHEDULE, { page, per });
            return json({ results: r?.data?.Page?.airingSchedules || [] });
        }
        const m = route.match(/^\/info\/(\d+)$/);
        if (m) {
            const r = await gql(INFO, { id: +m[1] });
            return json({ result: r?.data?.Media || null });
        }
        const e = route.match(/^\/episodes\/(\d+)$/);
        if (e) {
            const r = await gql(INFO, { id: +e[1] });
            const n = r?.data?.Media?.episodes || r?.data?.Media?.nextAiringEpisode?.episode || 0;
            const eps = Array.from({ length: n }, (_, i) => ({
                id: `${e[1]}:${i + 1}`, number: i + 1, title: `Episode ${i + 1}`,
            }));
            return json({ results: eps });
        }
        // ---- Stream sources (server-side providers) ----
        // Zangetsu providers are plain JS modules using global fetch — run them
        // here in a Node VM so the whole scraper stack lives on the site, private.
        const ZG_INDEX = "https://raw.githubusercontent.com/Spyou/zangetsu-providers/main/index.json";
        const ZG_BASE = "https://raw.githubusercontent.com/Spyou/zangetsu-providers/main/";
        const vm = await import("node:vm");
        const codeCache = {};
        const loadProvider = async (id) => {
            if (codeCache[id]) return codeCache[id];
            const code = await (await fetch(`${ZG_BASE}providers/${id}.js`)).text();
            // Zangetsu's host fetch returns {status, headers, body} — not a Web Response.
            const zfetch = async (u, o = {}) => {
                const r = await fetch(u, o);
                return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
            };
            const ctx = vm.createContext({
                fetch: zfetch, console, setTimeout, clearTimeout, setInterval, clearInterval,
                queueMicrotask, Buffer, URL, URLSearchParams, TextEncoder, TextDecoder,
                atob: (s) => Buffer.from(s, "base64").toString("binary"),
                btoa: (s) => Buffer.from(s, "binary").toString("base64"),
                crypto, Uint8Array, Promise, ArrayBuffer, DataView,
                // Zangetsu host-API helpers the providers expect as globals.
                htmlText: (s) => String(s || "")
                    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
                    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
                    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
                    .replace(/&nbsp;/g, " "),
                base64ToBytes: (s) => Array.from(Buffer.from(String(s || ""), "base64")),
                absUrl: (href, base) => { try { return new URL(href, base || "https://localhost/").href; } catch { return href; } },
            });
            const api = vm.runInContext(
                `(function(){${code}; return {getInfo, search, getDetail, getEpisodes, getVideoSources};})()`,
                ctx, { timeout: 20000 });
            codeCache[id] = api;
            return api;
        };
        const zgStreams = async (id, title, ep) => {
            const tag = `zg-${id}`;
            try {
                const p = await loadProvider(id);
                const hits = await p.search(title, 1, {});
                const first = Array.isArray(hits) ? hits[0] : hits?.results?.[0] || hits?.items?.[0];
                if (!first) { errs.push(`${tag}: search empty`); return null; }
                const detail = await p.getDetail(first.url || first.id, {});
                const eps = detail?.episodes || (await p.getEpisodes?.(first.url, {})) || [];
                const target = eps[ep - 1] || eps[0];
                if (!target) { errs.push(`${tag}: no ep ${ep} of ${eps.length}`); return null; }
                const srcs = await p.getVideoSources(target.url || target.id || target);
                const streams = (srcs?.streams || srcs?.sources || (Array.isArray(srcs) ? srcs : [])).map((s) => ({
                    url: s.url || s.file, type: s.type || (s.url?.includes(".m3u8") ? "hls" : "mp4"),
                    referer: s.referer || s.headers?.Referer || "", quality: s.quality || "auto",
                })).filter((s) => s.url);
                if (!streams.length) errs.push(`${tag}: getVideoSources empty (keys ${typeof srcs === "object" && srcs ? Object.keys(srcs).join(",") : typeof srcs})`);
                return streams.length ? { streams, provider: tag } : null;
            } catch (e) { errs.push(`${tag}: ${String(e?.message || e)}`); return null; }
        };
        const errs = [];

        const providers = [
            async (title, ep) => zgStreams("hianime", title, ep),
            async (title, ep) => zgStreams("anikoto", title, ep),
            async (title, ep) => zgStreams("fourkhdhub", title, ep),
        ];

        const ex = route.match(/^\/extract\/(\d+)$/);
        if (ex) {
            const info = (await gql(INFO, { id: +ex[1] }))?.data?.Media;
            const title = info?.title?.english || info?.title?.romaji || "";
            const ep = parseInt((params.e || "1").split(":").pop() || "1", 10);
            for (const p of providers) {
                try {
                    const r = await p(title, ep);
                    if (r?.streams?.length) return json({ ssub: r, sdub: r, provider: r.provider });
                    errs.push(`${p.name || "provider"}: empty`);
                } catch (e) { errs.push(String(e?.message || e)); }
            }
            return json({ error: "No provider returned streams", title, ep, errs }, 404);
        }

        const px = route.match(/^\/proxy\/(m3u8|segment)$/);
        if (px) {
            // Pass-through proxy for manifests/subtitles (functions cap ~6MB — video
            // segments must play direct-from-CDN, which the app already prefers).
            const target = params.url;
            if (!target || !/^https?:\/\//.test(target)) return json({ error: "Bad url" }, 400);
            const r = await fetch(target, { headers: { Referer: params.referer || "", "User-Agent": "Mozilla/5.0" } });
            const buf = Buffer.from(await r.arrayBuffer());
            return {
                statusCode: r.status,
                headers: { "Content-Type": r.headers.get("content-type") || "application/octet-stream", "Access-Control-Allow-Origin": "*" },
                body: buf.toString("base64"),
                isBase64Encoded: true,
            };
        }
        // ---- Provider/source directory ----
        // The app pulls its scraper + API list from here; each entry names the kind
        // and how the app should use it.
        if (route === "/providers") {
            return json({
                metadata: [
                    { id: "hosted", kind: "rest", base: "/api/anime" },
                    { id: "anilist", kind: "graphql", base: "https://graphql.anilist.co" },
                    { id: "kitsu", kind: "rest", base: "https://kitsu.io/api/edge" },
                    { id: "jikan", kind: "rest", base: "https://api.jikan.moe/v4" },
                ],
                streams: [
                    { id: "hosted-extract", kind: "rest", base: "/api/anime/extract" },
                    { id: "hianime", kind: "zg-provider", repo: ZG_INDEX },
                    { id: "anikoto", kind: "zg-provider", repo: ZG_INDEX },
                    { id: "archive.org", kind: "rest", base: "https://archive.org" },
                ],
                providersVersion: 1,
            });
        }
        if (route.startsWith("/provider-code/")) {
            const id = route.split("/").pop();
            const code = await (await fetch(`${ZG_BASE}providers/${id}.js`)).text();
            return { statusCode: 200, headers: { "Content-Type": "text/javascript", "Access-Control-Allow-Origin": "*" }, body: code };
        }
        // ---- Member system (Netlify Blobs state) ----
        // Invite keys: hash(key:salt) stored in the "invites" blob store so staff
        // can mint/revoke live. Presence: sha256(key) -> lastSeen, online < 4 min.
        const crypto2 = await import("node:crypto");
        const sha = (s) => crypto2.createHash("sha256").update(s).digest("hex");
        const SALT = process.env.INVITE_SALT || "nx-a1b2c3d4e5f6g7h8i9j0k1l2";
        const SECRET = process.env.STAFF_SECRET || "nx-staff-tok-s2";
        const STAFF_HASHES = (process.env.STAFF_HASHES || "ac69cfc6c01bee8cf292457b750e2c14b314832ff4215ef23fc5b38eca92c67a").split(","); // admin / nekomo-staff-2025
        const SEED_HASHES = ["c88eab1d62adf64cb4ebadce17b8f4069e2e7cd5e8ff9ba31487767664d9f289"]; // NEKX-NEKO-2025
        const keyHash = (k) => sha(`${k}:${SALT}`);
        const blob = async (name) => (await import("@netlify/blobs")).getStore({
            name, siteID: "b19f8392-b12a-451d-94f3-8d64dbefc741",
            token: process.env.NX_BLOBS_TOKEN || "",
        });
        const body = () => { try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; } };
        const auth = () => {
            const t = (params.token || (event.headers.authorization || "").replace(/^Bearer /, "")).split(".");
            if (t.length !== 3) return false;
            const [u, exp, sig] = t;
            // The HMAC-signed token is the credential — issued only after a valid staff login.
            return Date.now() < +exp && sha(`${u}:${exp}:${SECRET}`) === sig;
        };
        // Discord tag check — "ok" verified / "required" missing / "invalid" not in
        // the guild / "unreachable" Discord API failed (fail closed).
        const discordCheck = async (discord) => {
            if (!discord) return "required";
            if (!(process.env.DISCORD_BOT_TOKEN || "") || !(process.env.DISCORD_GUILD_ID || "")) return "ok";
            try {
                const r = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(discord)}&limit=5`,
                    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });
                if (!r.ok) return "unreachable";
                const ms = await r.json();
                const want = discord.toLowerCase();
                return ms.some(m => {
                    const u = m.user || {};
                    const tag = `${u.username}`.toLowerCase();
                    return tag === want || `${tag}#${u.discriminator}` === want;
                }) ? "ok" : "invalid";
            } catch { return "unreachable"; }
        };

        if (route === "/invite/validate") {
            const key = (params.key || "").trim();
            const did = (params.did || "").trim();
            const name = (params.name || "").trim().slice(0, 40);
            const discord = (params.discord || "").trim().slice(0, 40);
            if (!key) return json({ ok: false, error: "key required" }, 400);
            const store = await blob("invites");
            for (const h of SEED_HASHES) await store.set(h, JSON.stringify({ seed: true }));
            const rec = JSON.parse((await store.get(keyHash(key))) || "null");
            if (!rec) return json({ ok: false });
            const isFriend = rec.type === "friend";
            const isAdmin = rec.type === "admin";
            const cap = isFriend ? 2 : isAdmin ? 999 : 3;
            // Discord tag is mandatory for member/friend sign-ins; admin keys skip it.
            // A wrong tag denies the login outright — checked before any device binding.
            let discordVerified = false;
            if (!isAdmin) {
                const dc = await discordCheck(discord);
                if (dc !== "ok") return json({ ok: false, error: `discord_${dc}` });
                discordVerified = (process.env.DISCORD_BOT_TOKEN || "") !== "";
            }
            // Device sign-in cap: member keys 3 devices, friend keys 2 devices.
            if (did) {
                const dev = await blob("devices");
                // One device may only ever sign in under ONE key — flag multi-key abuse.
                const dslot = `devicekeys:${did}`;
                const bound = JSON.parse((await dev.get(dslot)) || "null");
                if (bound && bound.keyHash !== keyHash(key)) {
                    const abuse = await blob("abuse");
                    await abuse.set(did, JSON.stringify({ keys: [...new Set([bound.keyHash, keyHash(key)])], at: Date.now() }));
                    return json({ ok: false, error: "key_abuse" });
                }
                const slot = `devices:${keyHash(key)}`;
                const d = JSON.parse((await dev.get(slot)) || "{\"devices\":{}}");
                // Auto-prune devices silent for 14+ days (uninstalled/dead) before counting.
                const cutoff = Date.now() - 14 * 86400000;
                d.devices = Object.fromEntries(Object.entries(d.devices).filter(([, t]) => t > cutoff));
                if (!(did in d.devices)) {
                    // The cap counts devices ONLINE right now (heartbeat <10 min): an
                    // offline device, a sign-out, or an uninstalled app frees the slot.
                    const pres = await blob("presence");
                    let online = 0;
                    for (const od of Object.keys(d.devices)) {
                        const pr = JSON.parse((await pres.get(`${sha(key)}:${od}`)) || "null");
                        if (pr && Date.now() - pr.lastSeen < 600000) online++;
                    }
                    if (online >= cap) {
                        return json({ ok: false, error: "max_devices", max: cap });
                    }
                }
                // Bind only after the cap check — a rejected attempt must not claim the device.
                if (!bound) await dev.set(dslot, JSON.stringify({ keyHash: keyHash(key), since: Date.now() }));
                d.devices[did] = Date.now();
                await dev.set(slot, JSON.stringify(d));
            }
            // Record the member profile (name + discord tag) for the staff board.
            // Keyed by the same unsalted hash the presence store uses.
            const prof = await blob("profiles");
            const pslot = `profile:${sha(key)}`;
            const prof0 = JSON.parse((await prof.get(pslot)) || "{}");
            // discordVerified was enforced above for member/friend keys; admins keep
            // whatever was previously recorded.
            discordVerified = discordVerified || prof0.discordVerified || false;
            if (name || discord) {
                await prof.set(pslot, JSON.stringify({
                    name: name || prof0.name || "", discord: discord || prof0.discord || "",
                    discordVerified, firstSeen: prof0.firstSeen || Date.now(), lastSeen: Date.now(),
                }));
                // Also stamp name/discord on the salted profile slot so /admin/keys
                // and the Discord verify record can see who claimed this key.
                const vslot = `profile:${keyHash(key)}`;
                const v0 = JSON.parse((await prof.get(vslot)) || "{}");
                await prof.set(vslot, JSON.stringify({ ...v0, name: name || v0.name || "", discord: discord || v0.discord || "" }));
            }
            // Admin keys bypass caps and Discord and never mint friend keys.
            if (isAdmin) return json({ ok: true, type: "admin", discordVerified });
            // Members get one friend key, auto-minted on first sign-in — share
            // with exactly one trusted friend; it signs in on up to 2 devices.
            if (!isFriend) {
                const fr = await blob("friendkeys");
                const slot = `friend:${keyHash(key)}`;
                let fk = await fr.get(slot);
                if (!fk) {
                    fk = `NX-F-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
                    await store.set(keyHash(fk), JSON.stringify({ type: "friend", parent: keyHash(key), at: Date.now() }));
                    await fr.set(slot, fk);
                }
                return json({ ok: true, type: "member", friendKey: fk, discordVerified });
            }
            return json({ ok: true, type: "friend", discordVerified });
        }
        if (route === "/devices") { // member asks "which devices are on my key?" ?key=&did=
            const key = (params.key || "").trim(), did = (params.did || "").trim();
            if (!key) return json({ ok: false }, 400);
            const dev = await blob("devices"), pres = await blob("presence");
            const d = JSON.parse((await dev.get(`devices:${keyHash(key)}`)) || "{\"devices\":{}}");
            const out = [];
            for (const [od, ts] of Object.entries(d.devices)) {
                const pr = JSON.parse((await pres.get(`${sha(key)}:${od}`)) || "null");
                out.push({
                    id: od.slice(0, 12), online: !!(pr && Date.now() - pr.lastSeen < 600000),
                    lastSeen: pr ? pr.lastSeen : ts, you: od === did,
                });
            }
            out.sort((a, b) => (b.online - a.online) || (b.lastSeen - a.lastSeen));
            return json({ ok: true, devices: out, online: out.filter(x => x.online).length });
        }
        if (route === "/presence") { // member heartbeat: ?key=<invitekey>&did=<device>
            const key = (params.key || "").trim();
            const did = (params.did || "").trim();
            if (!key) return json({ ok: false }, 400);
            // Kicked device? devicekeys binding was removed → force sign-out.
            const dev = await blob("devices");
            const bound = JSON.parse((await dev.get(`devicekeys:${did}`)) || "null");
            if (did && !bound) return json({ ok: false, kicked: true });
            const store = await blob("presence");
            await store.set(`${sha(key)}:${did || "dev"}`, JSON.stringify({ lastSeen: Date.now(), kh: keyHash(key) }));
            return json({ ok: true });
        }
        // ---- QR pairing: a TV shows a QR code; the member's phone scans it and
        // approves the sign-in (Disney+-style). The code is a one-shot 8-char
        // token, valid for 10 minutes, that carries nothing until approved.
        const QR_TTL = 600000;
        if (route === "/qr/begin") { // TV starts a pairing session -> short code
            const AL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let i = 0; i < 8; i++) code += AL[crypto2.randomInt(AL.length)];
            const store = await blob("qrpair");
            await store.set(`pair:${code}`, JSON.stringify({ at: Date.now() }));
            return json({ ok: true, code, url: `https://nekomoapp.netlify.app/pair?c=${code}`, exp: Date.now() + QR_TTL });
        }
        if (route === "/qr/poll") { // TV polls while the QR is on screen
            const code = (params.code || "").trim().toUpperCase();
            if (!code) return json({ ok: false }, 400);
            const store = await blob("qrpair");
            const rec = JSON.parse((await store.get(`pair:${code}`)) || "null");
            if (!rec || Date.now() - rec.at > QR_TTL) return json({ ok: true, status: "expired" });
            if (!rec.key) return json({ ok: true, status: "pending" });
            await store.delete(`pair:${code}`); // one-shot: only the requesting TV reads the key
            return json({ ok: true, status: "approved", key: rec.key, name: rec.name || "", discord: rec.discord || "" });
        }
        if (route === "/qr/approve" && event.httpMethod === "POST") { // phone approves a code
            const b = body();
            const code = (b.code || "").trim().toUpperCase();
            const key = (b.key || "").trim();
            if (!code || !key) return json({ ok: false, error: "code+key required" }, 400);
            const store = await blob("qrpair");
            const rec = JSON.parse((await store.get(`pair:${code}`)) || "null");
            if (!rec || Date.now() - rec.at > QR_TTL) return json({ ok: false, error: "code_expired" });
            // Only check the key exists — the TV's own /invite/validate call does
            // the device-slot binding and abuse checks.
            const inv = await blob("invites");
            const known = JSON.parse((await inv.get(keyHash(key))) || "null");
            if (!known) return json({ ok: false, error: "bad_key" });
            // Same Discord gate as sign-in — surface a bad tag on the phone, not the TV.
            if (known.type !== "admin") {
                const dc = await discordCheck((b.discord || "").trim().slice(0, 40));
                if (dc !== "ok") return json({ ok: false, error: `discord_${dc}` });
            }
            await store.set(`pair:${code}`, JSON.stringify({
                at: rec.at, key,
                name: (b.name || "").slice(0, 40), discord: (b.discord || "").slice(0, 40),
            }));
            return json({ ok: true });
        }
        if (route === "/signout") { // member signs out: frees their device slot
            const key = (params.key || "").trim(), did = (params.did || "").trim();
            if (!key || !did) return json({ ok: false }, 400);
            const dev = await blob("devices");
            const slot = `devices:${keyHash(key)}`;
            const d = JSON.parse((await dev.get(slot)) || "{\"devices\":{}}");
            delete d.devices[did];
            await dev.set(slot, JSON.stringify(d));
            await dev.delete(`devicekeys:${did}`);
            const pres = await blob("presence");
            await pres.delete(`${sha(key)}:${did}`);
            return json({ ok: true });
        }
        if (route === "/staff/login") {
            const { u, p } = body();
            if (!u || !p) return json({ ok: false, error: "u/p required" }, 400);
            // Brute-force guard: 8 failures per IP per 15 minutes.
            const ip = (event.headers || {})["x-nf-client-connection-ip"] || (event.headers || {})["client-ip"] || "?";
            const ab = await blob("abuse");
            const abKey = `loginfail:${ip}`;
            const rec = (await ab.get(abKey, { type: "json" }).catch(() => null)) || { n: 0, first: 0 };
            if (Date.now() - rec.first > 900000) { rec.n = 0; rec.first = 0; }
            if (rec.n >= 8) return json({ ok: false, error: "rate_limited" }, 429);
            if (!STAFF_HASHES.includes(sha(`${p}:nx-staff-s1`))) {
                rec.n += 1; if (!rec.first) rec.first = Date.now();
                await ab.setJSON(abKey, rec).catch(() => {});
                return json({ ok: false }, 403);
            }
            await ab.delete(abKey).catch(() => {});
            const exp = Date.now() + 24 * 3600 * 1000;
            return json({ ok: true, user: u, token: `${u}.${exp}.${sha(`${u}:${exp}:${SECRET}`)}` });
        }
        // ---- Discord bot (interactions webhook — no websocket needed) ----
        // Discord signs every POST with ed25519; verify with the app's public key.
        if (route === "/discord/interactions") {
            const pub = process.env.DISCORD_PUBLIC_KEY || "";
            const bot = process.env.DISCORD_BOT_TOKEN || "";
            const guild = process.env.DISCORD_GUILD_ID || "";
            const roleId = process.env.DISCORD_MEMBER_ROLE_ID || "";
            if (!pub) return json({ error: "discord not configured" }, 503);
            const sig = event.headers["x-signature-ed25519"] || "";
            const ts = event.headers["x-signature-timestamp"] || "";
            const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : (event.body || "");
            let valid = false;
            try {
                // Discord's public key is a raw 32-byte ed25519 key — wrap it in the
                // standard SPKI prefix so node:crypto can import it.
                const spki = Buffer.from(`302a300506032b6570032100${pub}`, "hex");
                valid = crypto2.verify(null, Buffer.from(ts + raw), { key: spki, format: "der", type: "spki" }, Buffer.from(sig, "hex"));
            } catch { valid = false; }
            if (!valid) return json({ error: "bad signature" }, 401);
            const i = JSON.parse(raw);
            if (i.type === 1) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 1 }) }; // PING
            if (i.type === 2 && i.data?.name === "verify") {
                const key = (i.data.options || []).find(o => o.name === "key")?.value?.trim() || "";
                const userId = i.member?.user?.id || "";
                const tag = i.member?.user ? `${i.member.user.username}` : "";
                const store = await blob("invites");
                const rec = JSON.parse((await store.get(keyHash(key))) || "null");
                if (!rec) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 4, data: { content: "That invite key isn't valid." } }) };
                const prof = await blob("profiles");
                await prof.set(`profile:${keyHash(key)}`, JSON.stringify({ discordId: userId, discordTag: tag, verifiedAt: Date.now() }));
                if (bot && guild && roleId) {
                    await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${userId}/roles/${roleId}`, { method: "PUT", headers: { Authorization: `Bot ${bot}` } });
                }
                return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 4, data: { content: `Verified — welcome to NekōX, ${tag}.` } }) };
            }
            return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: 4, data: { content: "Unknown command." } }) };
        }
        if (route.startsWith("/admin/")) {
            if (!auth()) return json({ ok: false, error: "staff login required" }, 401);
            if (route === "/admin/members") {
                const store = await blob("presence");
                const { blobs } = await store.list();
                const now = Date.now();
                const prof = await blob("profiles");
                // Group presence rows by member key (a key can have several devices),
                // then merge keys that belong to the same person — identified by
                // verified Discord id, else profile name, else the key itself.
                const byKey = {};
                for (const b of blobs) {
                    const d = JSON.parse((await store.get(b.key)) || "{}");
                    const keyPart = b.key.split(":")[0];
                    const did = b.key.split(":")[1] || "?";
                    const g = (byKey[keyPart] ||= { id: keyPart.slice(0, 12), kh: "", devices: 0, lastSeen: 0, online: false, deviceIds: [] });
                    g.kh = d.kh || g.kh;
                    g.devices += 1;
                    g.deviceIds.push(did.slice(0, 10));
                    g.lastSeen = Math.max(g.lastSeen, d.lastSeen || 0);
                    if (now - (d.lastSeen || 0) < 240000) g.online = true;
                }
                // Devices bound at sign-in but not heartbeating right now only exist
                // in the device bindings — merge them in, including keys that never
                // heartbeated at all (fresh sign-ins, orphaned bindings).
                const dev = await blob("devices");
                const { blobs: bound } = await dev.list({ prefix: "devicekeys:" });
                const byKh = {};
                for (const g of Object.values(byKey)) if (g.kh) byKh[g.kh] = g;
                for (const b of bound) {
                    const did = b.key.slice(11);
                    const bind = JSON.parse((await dev.get(b.key)) || "null");
                    if (!bind?.keyHash) continue;
                    let g = byKh[bind.keyHash];
                    if (!g) {
                        g = { id: bind.keyHash.slice(0, 12), kh: bind.keyHash, devices: 0, lastSeen: 0, online: false, deviceIds: [] };
                        byKh[bind.keyHash] = g;
                        byKey[`bound:${bind.keyHash}`] = g;
                    }
                    if (!g.deviceIds.includes(did.slice(0, 10))) { g.devices += 1; g.deviceIds.push(did.slice(0, 10)); }
                }
                const groups = await Promise.all(Object.entries(byKey).map(async ([keyPart, g]) => {
                    const p = JSON.parse((await prof.get(`profile:${keyPart}`)) || "{}");
                    const v = g.kh ? JSON.parse((await prof.get(`profile:${g.kh}`)) || "{}") : {};
                    return { ...g, name: p.name || v.name || "", discord: v.discordTag || p.discord || v.discord || "", discordId: v.discordId || "" };
                }));
                const people = {};
                for (const g of groups) {
                    const pid = g.discordId ? `d:${g.discordId}` : (g.name ? `n:${g.name.toLowerCase()}` : `k:${g.id}`);
                    const p = (people[pid] ||= { id: g.id, name: "", discord: "", devices: 0, keys: 0, lastSeen: 0, online: false, deviceIds: [] });
                    p.devices += g.devices; p.keys += 1;
                    p.deviceIds.push(...g.deviceIds);
                    p.name = p.name || g.name; p.discord = p.discord || g.discord;
                    p.lastSeen = Math.max(p.lastSeen, g.lastSeen);
                    p.online = p.online || g.online;
                }
                const members = Object.values(people).sort((a, b) => (b.online - a.online) || (b.lastSeen - a.lastSeen));
                return json({ ok: true, members, online: members.filter(m => m.online).length });
            }
            if (route === "/admin/keys") {
                const store = await blob("invites");
                if (route === "/admin/keys" && event.httpMethod === "DELETE") {
                    // ?hash=<full or 10-char prefix> — revoking deletes the invite so
                    // new sign-ins fail, AND kicks every device already bound to the
                    // key so the ban takes effect immediately, not at next sign-in.
                    const want = (params.hash || "").trim();
                    if (!want) return json({ ok: false, error: "hash required" }, 400);
                    const { blobs: invs } = await store.list();
                    const hit = invs.find(b => b.key === want || b.key.startsWith(want));
                    if (!hit) return json({ ok: false, error: "key not found" }, 404);
                    await store.delete(hit.key);
                    const dev = await blob("devices"), pres = await blob("presence");
                    const dd = JSON.parse((await dev.get(`devices:${hit.key}`)) || "{\"devices\":{}}");
                    for (const d of Object.keys(dd.devices)) await dev.delete(`devicekeys:${d}`);
                    await dev.delete(`devices:${hit.key}`);
                    const { blobs: ps } = await pres.list();
                    for (const b of ps) {
                        const rec = JSON.parse((await pres.get(b.key)) || "null");
                        if (rec?.kh === hit.key) await pres.delete(b.key);
                    }
                    return json({ ok: true, revoked: hit.key.slice(0, 10) });
                }
                if (params.mint) { // ?mint=name -> returns the plaintext key once
                    const newKey = `NX-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
                    await store.set(keyHash(newKey), JSON.stringify({ name: params.mint, at: Date.now() }));
                    return json({ ok: true, key: newKey });
                }
                if (params.resetDevices) { // ?resetDevices=<keyhash or 10-char prefix> frees a key's device slots
                    const want = (params.resetDevices || "").trim();
                    const { blobs: invs } = await store.list();
                    const hit = invs.find(b => b.key === want || b.key.startsWith(want));
                    if (!hit) return json({ ok: false, error: "key not found" }, 404);
                    const dev = await blob("devices");
                    const dd = JSON.parse((await dev.get(`devices:${hit.key}`)) || "{\"devices\":{}}");
                    for (const d of Object.keys(dd.devices)) await dev.delete(`devicekeys:${d}`);
                    await dev.delete(`devices:${hit.key}`);
                    return json({ ok: true });
                }
                const { blobs } = await store.list();
                const prof = await blob("profiles");
                const dev = await blob("devices");
                const keys = await Promise.all(blobs.map(async (b) => {
                    const dd = JSON.parse((await dev.get(`devices:${b.key}`)) || "{\"devices\":{}}");
                    const rec = JSON.parse((await store.get(b.key)) || "{}");
                    const p = JSON.parse((await prof.get(`profile:${b.key}`)) || "{}");
                    const n = Object.keys(dd.devices).length;
                    return { hash: b.key.slice(0, 10), type: rec.type || "member", name: p.name || rec.name || "", discord: p.discord || "", devices: n, used: n > 0, seed: !!rec.seed };
                }));
                return json({ ok: true, keys, count: keys.length, used: keys.filter(k => k.used).length, unused: keys.filter(k => !k.used).length });
            }
            if (route === "/admin/mintadmin") { // ?n=2 → elevated keys: no device cap, unlocks staff/dev in-app
                const n = Math.min(parseInt(params.n || "2"), 10);
                const inv = await blob("invites");
                const keys = [];
                for (let i = 0; i < n; i++) {
                    const k = `NEKX-ADM-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
                    await inv.set(keyHash(k), JSON.stringify({ type: "admin", minted: Date.now() }));
                    keys.push(k);
                }
                return json({ ok: true, keys });
            }
            if (route === "/admin/mintbulk") { // ?n=50 → wipe old friend keys, mint member+friend pairs
                const n = Math.min(parseInt(params.n || "50"), 200);
                const inv = await blob("invites"), fr = await blob("friendkeys");
                // Remove every friend key + friend-typed invite (fresh pairing).
                const fAll = await fr.list();
                for (const b of fAll.blobs) {
                    const fk = await fr.get(b.key);
                    if (fk) await inv.delete(keyHash(fk));
                    await fr.delete(b.key);
                }
                const iAll = await inv.list();
                for (const b of iAll.blobs) {
                    const rec = JSON.parse((await inv.get(b.key)) || "{}");
                    if (rec.type === "friend") await inv.delete(b.key);
                }
                const pairs = [];
                for (let i = 0; i < n; i++) {
                    const mk = `NEKX-${crypto2.randomBytes(2).toString("hex").toUpperCase()}-${crypto2.randomBytes(2).toString("hex").toUpperCase()}`;
                    const fk = `NX-F-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
                    await inv.set(keyHash(mk), JSON.stringify({ type: "member", minted: Date.now() }));
                    await inv.set(keyHash(fk), JSON.stringify({ type: "friend", parent: keyHash(mk), at: Date.now() }));
                    await fr.set(`friend:${keyHash(mk)}`, fk);
                    pairs.push({ member: mk, friend: fk });
                }
                return json({ ok: true, count: pairs.length, pairs });
            }
            if (route === "/admin/allkeys") { // every usable sign-in key (plaintext friend keys + member seeds)
                const inv = await blob("invites");
                const fr = await blob("friendkeys");
                const { blobs } = await fr.list();
                const friendKeys = await Promise.all(blobs.map(async (b) => ({ key: await fr.get(b.key), parent: b.key.slice(7, 17), type: "friend" })));
                const seedKeys = (process.env.NEKOX_SEED_KEYS || "NEKX-NEKO-2025").split(",").map(k => ({ key: k.trim(), type: "member" }));
                return json({ ok: true, keys: [...seedKeys, ...friendKeys] });
            }
            if (route === "/admin/kick" && params.did) { // ?did=<deviceId or 10-char prefix> unbinds that device
                const want = params.did.trim();
                const dev = await blob("devices"), pres = await blob("presence");
                const { blobs } = await dev.list({ prefix: "devicekeys:" });
                const hit = blobs.find(b => b.key === `devicekeys:${want}` || b.key.slice(11, 21) === want || b.key.endsWith(want));
                if (!hit) return json({ ok: false, error: "device not found" }, 404);
                const did = hit.key.slice(11);
                const bound = JSON.parse((await dev.get(hit.key)) || "null");
                await dev.delete(hit.key);
                if (bound) {
                    const slot = `devices:${bound.keyHash}`;
                    const d = JSON.parse((await dev.get(slot)) || "{\"devices\":{}}");
                    delete d.devices[did];
                    await dev.set(slot, JSON.stringify(d));
                    const { blobs: all } = await pres.list();
                    for (const b of all) if (b.key.endsWith(`:${did}`)) await pres.delete(b.key);
                }
                const ab = await blob("abuse");
                await ab.delete(did);
                return json({ ok: true, did });
            }
            if (route === "/admin/kick") { // ?member=<presenceId> kicks that device; &all=1 kicks every device on the key
                const mid = (params.member || "").trim();
                if (!mid) return json({ ok: false, error: "member required" }, 400);
                const pres = await blob("presence"), dev = await blob("devices");
                const rec = JSON.parse((await pres.get(mid)) || "null");
                const kh = rec?.kh, did = mid.split(":")[1];
                if (!kh) return json({ ok: false, error: "member not found" }, 404);
                const dslot = `devices:${kh}`;
                const dd = JSON.parse((await dev.get(dslot)) || "{\"devices\":{}}");
                if (params.all) {
                    for (const d of Object.keys(dd.devices)) await dev.delete(`devicekeys:${d}`);
                    dd.devices = {};
                    const { blobs } = await pres.list({ prefix: `${mid.split(":")[0]}:` });
                    for (const b of blobs) await pres.delete(b.key);
                } else {
                    delete dd.devices[did];
                    await dev.delete(`devicekeys:${did}`);
                    await pres.delete(mid);
                }
                await dev.set(dslot, JSON.stringify(dd));
                return json({ ok: true });
            }
            if (route === "/admin/signoutall") { // kick every device on every key
                const pres = await blob("presence"), dev = await blob("devices"), inv = await blob("invites");
                const { blobs: keys } = await inv.list();
                for (const k of keys) await dev.delete(`devices:${k.key}`);
                const { blobs: dbs } = await dev.list({ prefix: "devicekeys:" });
                for (const b of dbs) await dev.delete(b.key);
                const { blobs: ps } = await pres.list();
                for (const b of ps) await pres.delete(b.key);
                return json({ ok: true });
            }
            if (route === "/admin/abuse") {
                const abuse = await blob("abuse");
                const { blobs } = await abuse.list();
                const flags = await Promise.all(blobs.map(async (b) => ({ did: b.key.slice(0, 10), ...(JSON.parse((await abuse.get(b.key)) || "{}")) })));
                return json({ ok: true, abuse: flags, count: flags.length });
            }
            return json({ ok: true });
        }
        return json({ ok: true, service: "nekomo-nekox" });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
};
