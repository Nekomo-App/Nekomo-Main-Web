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
            token: process.env.NETLIFY_BLOBS_TOKEN || "",
        });
        const body = () => { try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; } };
        const auth = () => {
            const t = (params.token || (event.headers.authorization || "").replace(/^Bearer /, "")).split(".");
            if (t.length !== 3) return false;
            const [u, exp, sig] = t;
            return Date.now() < +exp && sha(`${u}:${exp}:${SECRET}`) === sig && STAFF_HASHES.includes(sha(`${u}:${SECRET}`));
        };

        if (route === "/invite/validate") {
            const key = (params.key || "").trim();
            if (!key) return json({ ok: false, error: "key required" }, 400);
            const store = await blob("invites");
            for (const h of SEED_HASHES) await store.set(h, JSON.stringify({ seed: true }));
            const rec = await store.get(keyHash(key));
            return json({ ok: !!rec });
        }
        if (route === "/presence") { // member heartbeat: ?key=<invitekey>
            const key = (params.key || "").trim();
            if (!key) return json({ ok: false }, 400);
            const store = await blob("presence");
            await store.set(sha(key), JSON.stringify({ lastSeen: Date.now() }));
            return json({ ok: true });
        }
        if (route === "/staff/login") {
            const { u, p } = body();
            if (!u || !p) return json({ ok: false, error: "u/p required" }, 400);
            if (!STAFF_HASHES.includes(sha(`${p}:nx-staff-s1`))) return json({ ok: false }, 403);
            const exp = Date.now() + 6 * 3600 * 1000;
            return json({ ok: true, user: u, token: `${u}.${exp}.${sha(`${u}:${exp}:${SECRET}`)}` });
        }
        if (route.startsWith("/admin/")) {
            if (!auth()) return json({ ok: false, error: "staff login required" }, 401);
            if (route === "/admin/members") {
                const store = await blob("presence");
                const { blobs } = await store.list();
                const now = Date.now();
                const members = await Promise.all(blobs.map(async (b) => {
                    const d = JSON.parse((await store.get(b.key)) || "{}");
                    return { id: b.key.slice(0, 12), lastSeen: d.lastSeen, online: now - (d.lastSeen || 0) < 240000 };
                }));
                return json({ ok: true, members, online: members.filter(m => m.online).length });
            }
            if (route === "/admin/keys") {
                const store = await blob("invites");
                if (route === "/admin/keys" && event.httpMethod === "DELETE") {
                    await store.delete(params.hash || ""); return json({ ok: true });
                }
                if (params.mint) { // ?mint=name -> returns the plaintext key once
                    const newKey = `NX-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
                    await store.set(keyHash(newKey), JSON.stringify({ name: params.mint, at: Date.now() }));
                    return json({ ok: true, key: newKey });
                }
                const { blobs } = await store.list();
                const keys = await Promise.all(blobs.map(async (b) => ({ hash: b.key.slice(0, 10), ...(JSON.parse((await store.get(b.key)) || "{}")) })));
                return json({ ok: true, keys, count: keys.length });
            }
            return json({ ok: true });
        }
        return json({ ok: true, service: "nekomo-nekox" });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
};
