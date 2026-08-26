const PUBLIC = {
  jellyfin: "https://movies.vedsingh.com",
  kuma: "https://status.vedsingh.com",
  navidrome: "https://music.vedsingh.com/music",
  kavita: "https://books.vedsingh.com",
  audiobookshelf: "https://audiobooks.vedsingh.com",
  games: "https://games.vedsingh.com"
};

/* =========================================================
   PLATFORM ARCHITECTURE (locked v2.0.0)

   One Worker, one static asset directory, five hostnames.
   Each world's document lives at a fixed path in ./public;
   the fetch handler below picks which one to serve based on
   the request's Host header. This avoids duplicating the app
   five times while still giving each world its own address.

   The seven existing service subdomains (movies, music, books,
   audiobooks, games, seerr, status) are NOT handled here. They
   are separate, already-existing destinations this Worker only
   ever links to.
   ========================================================= */
const WORLD_INDEX = {
  "vedsingh.com": "/",
  "www.vedsingh.com": "/",
  "work.vedsingh.com": "/work/",
  "personal.vedsingh.com": "/personal/",
  "lab.vedsingh.com": "/lab/",
  "media.vedsingh.com": "/media/"
};

/* Pre-v2.0.0 bookmarks pointed at vedsingh.com/movies etc, which
   used to serve an embedded shell. Those services now live on
   their own subdomains; send old links there instead of 404ing. */
const LEGACY_PORTAL_REDIRECTS = {
  "/movies": PUBLIC.jellyfin,
  "/music": "https://music.vedsingh.com",
  "/books": PUBLIC.kavita,
  "/audiobooks": PUBLIC.audiobookshelf,
  "/games": PUBLIC.games,
  "/status": PUBLIC.kuma
};

const WORLD_PATH_REDIRECTS = {
  "/work": "https://work.vedsingh.com",
  "/media": "https://media.vedsingh.com",
  "/personal": "https://personal.vedsingh.com",
  "/lab": "https://lab.vedsingh.com"
};

const boundedLimit = value => {
  const parsed = Number.parseInt(String(value || "8"), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : 8;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") return status(env);
    if (url.pathname === "/api/activity") return activity(env);

    if (url.pathname === "/api/recent") {
      const source = String(url.searchParams.get("source") || "movies").toLowerCase();
      const limit = boundedLimit(url.searchParams.get("limit"));
      return recentBySource(env, source, limit);
    }

    if (url.pathname === "/api/media-image") {
      return mediaImage(env, url.searchParams);
    }

    // Preserve the old API routes for compatibility.
    if (url.pathname === "/api/jellyfin/recent") {
      const limit = boundedLimit(url.searchParams.get("limit"));
      return jellyfinRecent(env, limit);
    }
    if (url.pathname === "/api/jellyfin/now-playing") {
      return jellyfinActivity(env);
    }

    const cleanPath = url.pathname.replace(/\/+$/, "") || "/";
    if (LEGACY_PORTAL_REDIRECTS[cleanPath]) {
      return Response.redirect(LEGACY_PORTAL_REDIRECTS[cleanPath], 302);
    }
    if (WORLD_PATH_REDIRECTS[cleanPath]) {
      return Response.redirect(WORLD_PATH_REDIRECTS[cleanPath], 302);
    }

    // Prefer the Host header over url.hostname: in front of
    // Cloudflare's edge these usually agree, but the header is the
    // one guaranteed to reflect what the client actually asked for
    // (matters for local dev and for any future reverse proxy hop).
    const hostname = (request.headers.get("host") || url.hostname)
      .toLowerCase()
      .split(":")[0];

    if (url.pathname === "/" && WORLD_INDEX[hostname]) {
      const assetUrl = new URL(WORLD_INDEX[hostname], url);
      // Drop the original Host header: it still says (say) work.vedsingh.com
      // while assetUrl's authority is this Worker's own request URL, and a
      // mismatched Host confuses the assets binding's own routing.
      const assetHeaders = new Headers(request.headers);
      assetHeaders.delete("host");
      const assetResponse = await env.ASSETS.fetch(
        new Request(assetUrl, { method: request.method, headers: assetHeaders })
      );

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        headers: assetResponse.headers
      });
    }

    return env.ASSETS.fetch(request);
  }
};

const jr = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const cleanBase = value => String(value || "").replace(/\/+$/, "");

function sourceBase(env, source) {
  if (source === "jellyfin") return cleanBase(env.JELLYFIN_URL || PUBLIC.jellyfin);
  if (source === "navidrome") return cleanBase(env.NAVIDROME_URL || PUBLIC.navidrome);
  if (source === "kavita") return cleanBase(env.KAVITA_URL || PUBLIC.kavita);
  if (source === "audiobookshelf") return cleanBase(env.AUDIOBOOKSHELF_URL || PUBLIC.audiobookshelf);
  return "";
}

function jellyfinHeaders(env) {
  if (!env.JELLYFIN_API_KEY) throw new Error("missing-key");
  return {
    accept: "application/json",
    "X-Emby-Token": env.JELLYFIN_API_KEY
  };
}

function kavitaHeaders(env) {
  if (!env.KAVITA_API_KEY) throw new Error("missing-key");
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": env.KAVITA_API_KEY
  };
}

function absHeaders(env) {
  if (!env.AUDIOBOOKSHELF_API_KEY) throw new Error("missing-key");
  return {
    accept: "application/json",
    Authorization: `Bearer ${env.AUDIOBOOKSHELF_API_KEY}`
  };
}

function passwordHex(password) {
  return [...new TextEncoder().encode(String(password || ""))]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function navidromeParams(env, extra = {}) {
  if (!env.NAVIDROME_USERNAME || !env.NAVIDROME_PASSWORD) {
    throw new Error("missing-key");
  }

  return new URLSearchParams({
    u: env.NAVIDROME_USERNAME,
    p: `enc:${passwordHex(env.NAVIDROME_PASSWORD)}`,
    v: "1.16.1",
    c: "vedsingh-home",
    f: "json",
    ...extra
  });
}

function ndPayload(raw) {
  return raw?.["subsonic-response"] || raw?.subsonicResponse || {};
}



async function probePublicService(name, url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cf: { cacheTtl: 0 }
    });

    return {
      id: `probe:${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      state: response.status >= 200 && response.status < 500 ? "ok" : "down",
      uptime: null,
      source: "probe"
    };
  } catch {
    return {
      id: `probe:${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      state: "down",
      uptime: null,
      source: "probe"
    };
  }
}

/* =========================
   UPTIME KUMA
   ========================= */

async function status(env) {
  try {
    const base = cleanBase(env.KUMA_URL || PUBLIC.kuma);
    const slug = env.KUMA_SLUG || "vsnas";

    const [pageResponse, heartbeatResponse] = await Promise.all([
      fetch(`${base}/api/status-page/${encodeURIComponent(slug)}`, {
        headers: { accept: "application/json" }
      }),
      fetch(`${base}/api/status-page/heartbeat/${encodeURIComponent(slug)}`, {
        headers: { accept: "application/json" }
      })
    ]);

    if (!pageResponse.ok || !heartbeatResponse.ok) {
      return jr({ error: "kuma" }, 502);
    }

    const page = await pageResponse.json();
    const raw = await heartbeatResponse.json();
    const heartbeats = raw.heartbeatList || {};
    const uptimeList = raw.uptimeList || {};

    const names = new Map();
    for (const group of page.publicGroupList || []) {
      for (const monitor of group.monitorList || []) {
        if (monitor?.id != null) {
          names.set(String(monitor.id), monitor.name || `Monitor ${monitor.id}`);
        }
      }
    }

    const ids = new Set([...Object.keys(heartbeats), ...names.keys()]);

    const monitors = [...ids].map(id => {
      const beats = heartbeats[id];
      const last = Array.isArray(beats) && beats.length ? beats[beats.length - 1] : null;
      const rawStatus = last?.status;
      const state = rawStatus === 1 ? "ok" : rawStatus === 0 ? "down" : "warn";
      const name = names.get(String(id)) || `Monitor ${id}`;

      const exactKey = `${id}_24`;
      const uptimeKey = Object.prototype.hasOwnProperty.call(uptimeList, exactKey)
        ? exactKey
        : Object.keys(uptimeList).find(key => key.startsWith(`${id}_`));

      const rawUptime = uptimeKey != null ? Number(uptimeList[uptimeKey]) * 100 : null;
      const uptime = Number.isFinite(rawUptime)
        ? Number(rawUptime.toFixed(2))
        : null;

      return { id, name, state, uptime };
    });

    const hasRetroAssembly = monitors.some(monitor => {
      const name = String(monitor.name || "").trim().toLowerCase();
      return ["retroassembly", "retro assembly", "games"].includes(name);
    });

    if (!hasRetroAssembly) {
      monitors.push(
        await probePublicService(
          "RetroAssembly",
          cleanBase(env.RETROASSEMBLY_URL || PUBLIC.games)
        )
      );
    }

    const known = monitors.filter(monitor => monitor.uptime != null);
    const overallUptime = known.length
      ? Number(
          (
            known.reduce((sum, monitor) => sum + monitor.uptime, 0) /
            known.length
          ).toFixed(2)
        )
      : null;

    return jr({ monitors, overallUptime });
  } catch {
    return jr({ error: "kuma-unreachable" }, 502);
  }
}


/* =========================
   JELLYFIN
   ========================= */

async function jellyfinRecentData(env, limit) {
  const base = sourceBase(env, "jellyfin");
  const response = await fetch(
    `${base}/Items/Latest?Limit=${limit}&IncludeItemTypes=Movie,Series,Episode&Fields=ProductionYear,SeriesName`,
    { headers: jellyfinHeaders(env) }
  );

  if (!response.ok) throw new Error("jellyfin");

  const items = await response.json();

  return (Array.isArray(items) ? items : []).map(item => ({
    id: item.Id,
    title: item.Name,
    subtitle: item.SeriesName || item.ProductionYear || "",
    type: item.Type || "Media",
    image: `${base}/Items/${encodeURIComponent(item.Id)}/Images/Primary?quality=85`,
    url: `${PUBLIC.jellyfin}/web/#/details?id=${encodeURIComponent(item.Id)}`
  }));
}

async function jellyfinRecent(env, limit) {
  try {
    return jr({ items: await jellyfinRecentData(env, limit), configured: true });
  } catch (error) {
    return jr(
      {
        items: [],
        configured: error.message !== "missing-key",
        error: error.message === "missing-key" ? "missing-key" : "jellyfin-unreachable"
      },
      error.message === "missing-key" ? 200 : 503
    );
  }
}

async function jellyfinActivityData(env) {
  const base = sourceBase(env, "jellyfin");
  const response = await fetch(`${base}/Sessions`, {
    headers: jellyfinHeaders(env)
  });

  if (!response.ok) throw new Error("jellyfin");

  const sessions = await response.json();

  return (Array.isArray(sessions) ? sessions : [])
    .filter(session => session.NowPlayingItem && session.PlayState)
    .map(session => {
      const item = session.NowPlayingItem;
      const position = Number(session.PlayState.PositionTicks || 0);
      const duration = Number(item.RunTimeTicks || 0);

      return {
        source: "Jellyfin",
        action: session.PlayState.IsPaused ? "Paused" : "Watching",
        title: item.Name,
        subtitle: item.SeriesName || item.AlbumArtist || item.ProductionYear || "",
        user: "Jellyfin",
        progressPercent: duration
          ? Number(((position / duration) * 100).toFixed(1))
          : 0,
        image: `${base}/Items/${encodeURIComponent(item.Id)}/Images/Primary?quality=80`,
        url: PUBLIC.jellyfin
      };
    });
}

async function jellyfinActivity(env) {
  try {
    return jr({ items: await jellyfinActivityData(env), configured: true });
  } catch (error) {
    return jr(
      { items: [], configured: error.message !== "missing-key" },
      error.message === "missing-key" ? 200 : 503
    );
  }
}


/* =========================
   NAVIDROME
   ========================= */

async function navidromeJSON(env, method, extra = {}) {
  const base = sourceBase(env, "navidrome");
  const params = navidromeParams(env, extra);
  const response = await fetch(`${base}/rest/${method}.view?${params.toString()}`, {
    headers: { accept: "application/json" }
  });

  if (!response.ok) throw new Error("navidrome");

  const payload = ndPayload(await response.json());
  if (payload.status && payload.status !== "ok") throw new Error("navidrome");

  return payload;
}

async function navidromeRecentData(env, limit) {
  const payload = await navidromeJSON(env, "getAlbumList2", {
    type: "newest",
    size: String(limit)
  });

  const albums = payload.albumList2?.album || [];

  return albums.map(album => ({
    id: album.id,
    title: album.name || album.title || "Untitled Album",
    subtitle: album.artist || "",
    type: "Album",
    image: `/api/media-image?source=navidrome&id=${encodeURIComponent(album.coverArt || album.id)}`,
    url: PUBLIC.navidrome.replace(/\/music\/?$/, "")
  }));
}

async function navidromeActivityData(env) {
  const payload = await navidromeJSON(env, "getNowPlaying");
  const entries = payload.nowPlaying?.entry || [];

  return entries.slice(0, 2).map(song => ({
    source: "Navidrome",
    action: "Listening",
    title: song.title || "Unknown Track",
    subtitle: [song.artist, song.album].filter(Boolean).join(" · "),
    progressPercent:
      Number(song.duration) > 0 && Number.isFinite(Number(song.minutesAgo))
        ? undefined
        : undefined,
    image: `/api/media-image?source=navidrome&id=${encodeURIComponent(song.coverArt || song.albumId || song.id)}`,
    url: PUBLIC.navidrome.replace(/\/music\/?$/, "")
  }));
}


/* =========================
   KAVITA
   ========================= */

async function kavitaRecentData(env, limit) {
  const base = sourceBase(env, "kavita");

  const response = await fetch(
    `${base}/api/Series/recently-added-v2?PageNumber=1&PageSize=${limit}`,
    {
      method: "POST",
      headers: kavitaHeaders(env),
      body: JSON.stringify({})
    }
  );

  if (!response.ok) throw new Error("kavita");

  const raw = await response.json();
  const series = Array.isArray(raw) ? raw : raw?.result || raw?.items || [];

  return series.slice(0, limit).map(item => ({
    id: item.id,
    title: item.name || item.localizedName || "Untitled",
    subtitle: item.libraryName || item.format || "",
    type: "Series",
    image: `/api/media-image?source=kavita&id=${encodeURIComponent(item.id)}`,
    url: PUBLIC.kavita
  }));
}

async function kavitaActivityData(env) {
  const base = sourceBase(env, "kavita");

  const response = await fetch(
    `${base}/api/Stats/reading-history?PageNumber=1&PageSize=1`,
    { headers: kavitaHeaders(env) }
  );

  if (!response.ok) throw new Error("kavita");

  const raw = await response.json();
  const entries = Array.isArray(raw) ? raw : raw?.result || raw?.items || [];
  const item = entries[0];
  if (!item) return [];

  const pagesRead = Number(item.pagesRead || 0);
  const totalPages = Number(item.totalPages || 0);

  return [{
    source: "Kavita",
    action: "Recent reading",
    title: item.seriesName || item.chapterTitle || item.title || "Reading",
    subtitle: item.libraryName || item.chapterTitle || "",
    progressPercent: totalPages > 0
      ? Number(((pagesRead / totalPages) * 100).toFixed(1))
      : undefined,
    image: item.seriesId != null
      ? `/api/media-image?source=kavita&id=${encodeURIComponent(item.seriesId)}`
      : "/icon.svg",
    url: PUBLIC.kavita
  }];
}


/* =========================
   AUDIOBOOKSHELF
   ========================= */

async function absJSON(env, path) {
  const base = sourceBase(env, "audiobookshelf");
  const response = await fetch(`${base}${path}`, {
    headers: absHeaders(env)
  });

  if (!response.ok) throw new Error("audiobookshelf");
  return response.json();
}

async function absBookLibrary(env) {
  const data = await absJSON(env, "/api/libraries");
  const libraries = Array.isArray(data?.libraries)
    ? data.libraries
    : Array.isArray(data)
    ? data
    : [];

  return libraries.find(library => library.mediaType === "book") || libraries[0] || null;
}

function absBookMeta(item) {
  const meta = item?.media?.metadata || item?.mediaMetadata || item?.metadata || {};
  const authors = Array.isArray(meta.authors)
    ? meta.authors.map(author => author?.name || author).filter(Boolean)
    : [];

  return {
    title: meta.title || item?.displayTitle || item?.name || "Untitled",
    author: authors.join(", ") || meta.author || item?.displayAuthor || "",
    year: meta.publishedYear || ""
  };
}

async function audiobookshelfRecentData(env, limit) {
  const library = await absBookLibrary(env);
  if (!library?.id) return [];

  const data = await absJSON(
    env,
    `/api/libraries/${encodeURIComponent(library.id)}/items?limit=${limit}&page=0&sort=addedAt&desc=1&minified=0`
  );

  const items = data?.results || [];

  return items.slice(0, limit).map(item => {
    const meta = absBookMeta(item);
    return {
      id: item.id,
      title: meta.title,
      subtitle: meta.author || meta.year,
      type: "Audiobook",
      image: `/api/media-image?source=audiobookshelf&id=${encodeURIComponent(item.id)}`,
      url: PUBLIC.audiobookshelf
    };
  });
}

async function audiobookshelfActivityData(env) {
  const data = await absJSON(env, "/api/me/items-in-progress?limit=1");
  const item = data?.libraryItems?.[0];
  if (!item) return [];

  const meta = absBookMeta(item);

  let progressPercent;
  try {
    const progress = await absJSON(env, `/api/me/progress/${encodeURIComponent(item.id)}`);
    const value = Number(progress?.progress);
    if (Number.isFinite(value)) {
      progressPercent = Number((value * 100).toFixed(1));
    }
  } catch {}

  return [{
    source: "Audiobookshelf",
    action: "Audiobook",
    title: meta.title,
    subtitle: meta.author,
    progressPercent,
    image: `/api/media-image?source=audiobookshelf&id=${encodeURIComponent(item.id)}`,
    url: PUBLIC.audiobookshelf
  }];
}


/* =========================
   AGGREGATED MEDIA ROUTES
   ========================= */

async function activity(env) {
  const sources = [
    ["jellyfin", jellyfinActivityData],
    ["navidrome", navidromeActivityData],
    ["kavita", kavitaActivityData],
    ["audiobookshelf", audiobookshelfActivityData]
  ];

  const settled = await Promise.allSettled(
    sources.map(([, fn]) => fn(env))
  );

  const items = [];
  const integrations = {};

  settled.forEach((result, index) => {
    const source = sources[index][0];
    integrations[source] = result.status === "fulfilled";

    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value);
    }
  });

  return jr({ items: items.slice(0, 4), integrations });
}

async function recentBySource(env, source, limit) {
  try {
    if (source === "movies") {
      return jr({
        items: await jellyfinRecentData(env, limit),
        configured: true
      });
    }

    if (source === "music") {
      return jr({
        items: await navidromeRecentData(env, limit),
        configured: true
      });
    }

    if (source === "books") {
      return jr({
        items: await kavitaRecentData(env, limit),
        configured: true
      });
    }

    if (source === "audiobooks") {
      return jr({
        items: await audiobookshelfRecentData(env, limit),
        configured: true
      });
    }

    if (source === "games") {
      return jr({
        items: [],
        configured: true,
        reason: "retroassembly-api-unavailable"
      });
    }

    return jr({ items: [], configured: false, error: "unknown-source" }, 400);
  } catch (error) {
    return jr({
      items: [],
      configured: error.message !== "missing-key",
      error: error.message
    });
  }
}


/* =========================
   AUTHENTICATED IMAGE PROXY
   ========================= */

async function mediaImage(env, params) {
  const source = String(params.get("source") || "");
  const id = String(params.get("id") || "");

  if (!source || !id) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    let response;

    if (source === "navidrome") {
      const base = sourceBase(env, "navidrome");
      const query = navidromeParams(env, { id });
      response = await fetch(
        `${base}/rest/getCoverArt.view?${query.toString()}`
      );
    } else if (source === "kavita") {
      const base = sourceBase(env, "kavita");
      response = await fetch(
        `${base}/api/Image/series-cover?seriesId=${encodeURIComponent(id)}`,
        { headers: kavitaHeaders(env) }
      );
    } else if (source === "audiobookshelf") {
      const base = sourceBase(env, "audiobookshelf");
      response = await fetch(
        `${base}/api/items/${encodeURIComponent(id)}/cover`,
        { headers: absHeaders(env) }
      );
    } else {
      return new Response("Not Found", { status: 404 });
    }

    if (!response.ok) {
      return new Response("Image unavailable", { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", response.headers.get("content-type") || "image/jpeg");
    headers.set("cache-control", "public, max-age=3600");

    return new Response(response.body, {
      status: 200,
      headers
    });
  } catch {
    return new Response("Image unavailable", { status: 404 });
  }
}
