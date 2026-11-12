// NekōX private API — Netlify function serving the app's AniList-shaped endpoints.
// Metadata comes from AniList's public GraphQL; stream extraction is not provided here.

const ANILIST = "https://graphql.anilist.co";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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

export default async (req) => {
    try {
        const url = new URL(req.url);
        // Path arrives as /api/anime/<route> (rewritten); also accept /.netlify/functions/nekox/<route>
        const route = url.pathname
            .replace(/^\/api\/anime/, "")
            .replace(/^\/\.netlify\/functions\/nekox/, "") || "/";
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const per = Math.min(parseInt(url.searchParams.get("per_page") || "30", 10), 50);

        const list = async (sort, extra = {}) => {
            const r = await gql(PAGE, { page, per, sort, ...extra });
            return json({ results: r?.data?.Page?.media || [] });
        };

        if (route === "/spotlight" || route === "/trending") return list(["TRENDING_DESC"]);
        if (route === "/popular") return list(["POPULARITY_DESC"]);
        if (route === "/recent") return list(["UPDATED_AT_DESC"]);
        if (route === "/search") return list(["SEARCH_MATCH"], { search: url.searchParams.get("query") || "" });
        if (route === "/filter") {
            const genre = url.searchParams.get("genre");
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
            // AniList has no per-episode list; synthesize entries from the episode count.
            const r = await gql(INFO, { id: +e[1] });
            const n = r?.data?.Media?.episodes || r?.data?.Media?.nextAiringEpisode?.episode || 0;
            const eps = Array.from({ length: n }, (_, i) => ({
                id: `${e[1]}:${i + 1}`, number: i + 1, title: `Episode ${i + 1}`,
            }));
            return json({ results: eps });
        }
        if (route.startsWith("/extract") || route.startsWith("/proxy")) {
            return json({ error: "Streaming is not served by this endpoint — needs a dedicated scraper." }, 501);
        }
        return json({ ok: true, service: "nekomo-nekox" });
    } catch (err) {
        return json({ error: err.message }, 500);
    }
};

export const config = { path: ["/api/anime", "/api/anime/*"] };
