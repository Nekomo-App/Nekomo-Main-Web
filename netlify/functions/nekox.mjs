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
        // Each provider returns {streams:[{url,type,referer,quality}]}; they run in
        // order, so every provider is a backup for the one before it.
        const providers = [
            async (title, ep) => {
                // Internet Archive — public media library, direct mp4 files.
                const q = encodeURIComponent(`title:(${title}) AND mediatype:(movies)`);
                const r = await fetch(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&rows=5&page=1&output=json`);
                const item = (await r.json())?.response?.docs?.[0]?.identifier;
                if (!item) return null;
                const meta = await (await fetch(`https://archive.org/metadata/${item}`)).json();
                const vids = (meta?.files || []).filter(f => /\.(mp4|mkv|avi)$/i.test(f.name || "") && !(f.format || "").includes("Preview"));
                if (!vids.length) return null;
                const pick = vids[Math.min(ep - 1, vids.length - 1)];
                return { streams: [{ url: `https://archive.org/download/${item}/${encodeURIComponent(pick.name)}`, type: "mp4", referer: "", quality: "auto" }], provider: "archive.org" };
            },
        ];

        const ex = route.match(/^\/extract\/(\d+)$/);
        if (ex) {
            const info = (await gql(INFO, { id: +ex[1] }))?.data?.Media;
            const title = info?.title?.english || info?.title?.romaji || "";
            const ep = parseInt((params.e || "1").split(":").pop() || "1", 10);
            for (const p of providers) {
                const r = await p(title, ep).catch(() => null);
                if (r?.streams?.length) return json({ ssub: r, sdub: r, provider: r.provider });
            }
            return json({ error: "No provider returned streams", title, ep }, 404);
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
        return json({ ok: true, service: "nekomo-nekox" });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
};
