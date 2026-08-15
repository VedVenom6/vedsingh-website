const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];

const commands = [
  {
    label: "Movies & TV",
    hint: "Jellyfin",
    url: "/movies",
    keys: "movies tv jellyfin watch"
  },
  {
    label: "Requests",
    hint: "Seerr",
    url: "https://seerr.vedsingh.com",
    keys: "requests seerr movies shows"
  },
  {
    label: "Music",
    hint: "Navidrome",
    url: "/music",
    keys: "music navidrome songs albums"
  },
  {
    label: "Add Music",
    hint: "Aurral",
    url: "https://aurral.vedsingh.com",
    keys: "add request music aurral lidarr albums artists"
  },
  {
    label: "Books & Comics",
    hint: "Kavita",
    url: "/books",
    keys: "books comics manga kavita"
  },
  {
    label: "Audiobooks",
    hint: "Audiobookshelf",
    url: "/audiobooks",
    keys: "audiobooks listen"
  },
  {
    label: "Games",
    hint: "RetroAssembly",
    url: "/games",
    keys: "games retroassembly roms play"
  },
  {
    label: "System Status",
    hint: "Uptime Kuma",
    url: "/status",
    keys: "status uptime health"
  }
];

const universes = [
  {
    id: "2099",
    earth: "EARTH-928",
    title: "2099",
    node: "SPIDER-NET NODE",
    footer: "Earth-928 // 2099 interface",
    line:
      "Movies, music, books, audiobooks, games, requests, and server status — connected through one futuristic 2099 control deck."
  },
  {
    id: "1610",
    earth: "EARTH-1610",
    title: "1610",
    node: "ULTIMATE WEB NODE",
    footer: "Earth-1610 // Ultimate interface",
    line:
      "Your media network, re-rendered like a bold Ultimate-universe comic panel."
  },
  {
    id: "616",
    earth: "EARTH-616",
    title: "616",
    node: "PRIMARY WEB NODE",
    footer: "Earth-616 // Classic interface",
    line:
      "The prime-universe view — clean, familiar, and deliberately straightforward."
  },
  {
    id: "noir",
    earth: "EARTH-90214",
    title: "NOIR",
    node: "NOIR WEB NODE",
    footer: "Earth-90214 // Spider-Noir interface",
    line:
      "A black-and-white detective-network view with film grain, hard shadows, and zero color."
  }
];

let selectedCommand = 0;
let deferredPrompt = null;

/*
  Random universe every fresh page load.
  Nothing is saved to localStorage.
*/
let universeIndex = Math.floor(Math.random() * universes.length);

let universeTimer = null;

/*
  Automatic universe change interval:
  240000 ms = 4 minutes
*/
const UNIVERSE_INTERVAL_MS = 240000;


/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {
  const year = $("#year");
  const clock = $("#localClock");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (clock) {
    clock.textContent = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

async function getJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  return response.json();
}

const normalize = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));


/* =========================================================
   UPTIME KUMA STATUS
   ========================================================= */

async function loadStatus() {
  const top = $("#statusSummary");

  try {
    const data = await getJSON("/api/status");

    const retiredMonitorNames = new Set([
      "mylar3",
      "shelfarr",
      "syncthing",
      "adguardhome",
      "adguard home"
    ]);

    const monitors = (Array.isArray(data.monitors)
      ? data.monitors
      : []
    ).filter(monitor =>
      !retiredMonitorNames.has(normalize(monitor.name))
    );

    const byName = new Map(
      monitors.map(monitor => [
        normalize(monitor.name),
        monitor
      ])
    );

    const findMonitor = expectedName => {
      const expected = normalize(expectedName);

      if (byName.has(expected)) {
        return byName.get(expected);
      }

      return monitors.find(monitor => {
        const actual = normalize(monitor.name);
        return actual.includes(expected) || expected.includes(actual);
      });
    };

    let online = 0;
    let degraded = 0;
    let offline = 0;

    monitors.forEach(monitor => {
      if (monitor.state === "ok") {
        online++;
      } else if (monitor.state === "down") {
        offline++;
      } else {
        degraded++;
      }
    });

    $$(".service-card").forEach(card => {
      const monitor = findMonitor(
        card.dataset.monitor
      );

      const state = monitor?.state || "warn";

      card.dataset.state = state;

      const stateLabel = $(".monitor-state", card);

      if (stateLabel) {
        stateLabel.textContent =
          state === "ok"
            ? "Online"
            : state === "down"
            ? "Offline"
            : "Unknown";
      }
    });

    if ($("#serviceCount")) {
      $("#serviceCount").textContent =
        monitors.length || "—";
    }

    if ($("#onlineCount")) {
      $("#onlineCount").textContent =
        online || "—";
    }

    if ($("#pulseOnline")) {
      $("#pulseOnline").textContent = online;
    }

    if ($("#pulseDegraded")) {
      $("#pulseDegraded").textContent = degraded;
    }

    if ($("#pulseOffline")) {
      $("#pulseOffline").textContent = offline;
    }

    const uptimeValues = monitors
      .map(monitor => Number(monitor.uptime))
      .filter(Number.isFinite);

    const filteredUptime = uptimeValues.length
      ? (
          uptimeValues.reduce((sum, value) => sum + value, 0) /
          uptimeValues.length
        ).toFixed(2)
      : null;

    if ($("#pulseUptime")) {
      $("#pulseUptime").textContent =
        filteredUptime !== null
          ? `${filteredUptime}%`
          : "—";
    }

    const healthPercent = monitors.length
      ? Math.round(
          (online / monitors.length) * 100
        )
      : 0;

    if ($("#systemLineFill")) {
      $("#systemLineFill").style.width =
        `${healthPercent}%`;
    }

    if ($("#pulseNote")) {
      $("#pulseNote").textContent =
        monitors.length
          ? `${online} of ${monitors.length} monitored services are online.`
          : "No status data.";
    }

    if (top) {
      if (offline > 0) {
        top.dataset.state = "down";

        if ($("#statusSummaryText")) {
          $("#statusSummaryText").textContent =
            `${offline} offline`;
        }
      } else if (degraded > 0) {
        top.dataset.state = "warn";

        if ($("#statusSummaryText")) {
          $("#statusSummaryText").textContent =
            `${degraded} unknown`;
        }
      } else {
        top.dataset.state = "ok";

        if ($("#statusSummaryText")) {
          $("#statusSummaryText").textContent =
            "All systems operational";
        }
      }
    }
  } catch (error) {
    if (top) {
      top.dataset.state = "warn";
    }

    if ($("#statusSummaryText")) {
      $("#statusSummaryText").textContent =
        "Status unavailable";
    }

    if ($("#pulseNote")) {
      $("#pulseNote").textContent =
        "Could not reach Uptime Kuma.";
    }
  }
}


/* =========================================================
   UNIFIED CURRENT ACTIVITY
   ========================================================= */

function renderActivityItem(item) {
  const progress = Math.max(
    0,
    Math.min(100, Number(item.progressPercent || 0))
  );

  return `
    <a class="activity-item" href="${escapeHTML(item.url || "#")}">
      <img
        class="activity-art"
        src="${escapeHTML(item.image || "/icon.svg")}"
        alt=""
        loading="lazy"
      >
      <div class="activity-copy">
        <div class="activity-meta">
          <span>${escapeHTML((item.action || "ACTIVE").toUpperCase())}</span>
          <small>${escapeHTML(item.source || "")}</small>
        </div>
        <h3>${escapeHTML(item.title || "Untitled")}</h3>
        <p>${escapeHTML(item.subtitle || "")}</p>
        ${
          Number.isFinite(Number(item.progressPercent))
            ? `<div class="progress"><span style="width:${progress}%"></span></div>`
            : ""
        }
      </div>
      <span class="activity-arrow">↗</span>
    </a>
  `;
}

async function loadActivity() {
  const grid = $("#activityGrid");
  if (!grid) return;

  try {
    const data = await getJSON("/api/activity");
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      grid.innerHTML = `
        <div class="activity-empty">
          <span class="pulse-orb"></span>
          <div>
            <strong>Nothing active right now.</strong>
            <p>Watching, listening and reading activity will appear here.</p>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = items
      .slice(0, 4)
      .map(renderActivityItem)
      .join("");
  } catch (error) {
    grid.innerHTML = `
      <div class="activity-empty">
        <span class="pulse-orb"></span>
        <div>
          <strong>Activity integrations are ready.</strong>
          <p>Configured media services will appear here automatically.</p>
        </div>
      </div>
    `;
  }
}


/* =========================================================
   MULTI-LIBRARY RECENTLY ADDED
   ========================================================= */

const recentSources = {
  movies: { label: "Movies & TV", url: "/movies" },
  music: { label: "Music", url: "/music" },
  books: { label: "Books & Comics", url: "/books" },
  audiobooks: { label: "Audiobooks", url: "/audiobooks" },
  games: { label: "Games", url: "/games" }
};

let recentSource = "movies";

function setRecentLoading() {
  const grid = $("#recentGrid");
  if (!grid) return;
  grid.innerHTML = Array.from(
    { length: 4 },
    () => '<div class="recent-skeleton glass"></div>'
  ).join("");
}

function setRecentSource(source, shouldScroll = false) {
  if (!recentSources[source]) return;

  recentSource = source;

  $$(".media-tab").forEach(button => {
    const active = button.dataset.recentSource === source;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const openLink = $("#recentOpenLink");
  const config = recentSources[source];

  if (openLink) {
    openLink.href = config.url;
    openLink.textContent = `Open ${config.label} ↗`;
  }

  setRecentLoading();
  loadRecent(source);

  if (shouldScroll) {
    $("#recent")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function loadRecent(source = recentSource) {
  const grid = $("#recentGrid");
  if (!grid) return;

  const config = recentSources[source] || recentSources.movies;

  try {
    const data = await getJSON(
      `/api/recent?source=${encodeURIComponent(source)}&limit=8`
    );

    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      const message =
        data.reason === "retroassembly-api-unavailable"
          ? "RetroAssembly does not expose a stable recent-games feed yet."
          : data.configured === false
          ? `${config.label} live data is not connected yet.`
          : `Nothing new in ${config.label} right now.`;

      grid.innerHTML = `
        <div class="empty-recent glass">
          <strong>${escapeHTML(config.label)}</strong>
          <p>${escapeHTML(message)}</p>
          <a class="inline-open" href="${escapeHTML(config.url)}">
            Open ${escapeHTML(config.label)} ↗
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = items
      .map(item => `
        <a
          class="recent-card glass"
          href="${escapeHTML(item.url || config.url)}"
        >
          <img
            class="recent-image"
            src="${escapeHTML(item.image || "/icon.svg")}"
            alt=""
            loading="lazy"
          >
          <div class="recent-info">
            <div class="recent-type">
              ${escapeHTML((item.type || config.label).toUpperCase())}
            </div>
            <div class="recent-title">
              ${escapeHTML(item.title || "Untitled")}
            </div>
            <div class="recent-subtitle">
              ${escapeHTML(item.subtitle || "")}
            </div>
          </div>
        </a>
      `)
      .join("");
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-recent glass">
        <strong>${escapeHTML(config.label)}</strong>
        <p>This library is temporarily unavailable from the portal.</p>
        <a class="inline-open" href="${escapeHTML(config.url)}">
          Open ${escapeHTML(config.label)} ↗
        </a>
      </div>
    `;
  }
}


/* =========================================================
   ROUTED PORTAL PAGES
   ========================================================= */

const portalRoutes = {
  "/movies": {
    key: "movies",
    kicker: "WATCH",
    title: "Movies & TV",
    description: "Your Jellyfin library, inside the Ved Singh portal.",
    serviceName: "Jellyfin",
    embed: "https://movies.vedsingh.com",
    direct: "https://movies.vedsingh.com",
    secondaryLabel: "Request Something ＋",
    secondaryUrl: "https://seerr.vedsingh.com"
  },
  "/music": {
    key: "music",
    kicker: "LISTEN",
    title: "Music",
    description: "Navidrome stays below the same portal navigation.",
    serviceName: "Navidrome",
    embed: "https://music.vedsingh.com",
    direct: "https://music.vedsingh.com",
    secondaryLabel: "Add Music ＋",
    secondaryUrl: "https://aurral.vedsingh.com"
  },
  "/books": {
    key: "books",
    kicker: "READ",
    title: "Books & Comics",
    description: "Browse Kavita without leaving the Ved Singh shell.",
    serviceName: "Kavita",
    embed: "https://books.vedsingh.com",
    direct: "https://books.vedsingh.com"
  },
  "/audiobooks": {
    key: "audiobooks",
    kicker: "LISTEN",
    title: "Audiobooks",
    description: "Audiobookshelf embedded beneath your persistent navigation.",
    serviceName: "Audiobookshelf",
    embed: "https://audiobooks.vedsingh.com",
    direct: "https://audiobooks.vedsingh.com"
  },
  "/games": {
    key: "games",
    kicker: "PLAY",
    title: "Games",
    description: "RetroAssembly lives here as the gaming section of the portal.",
    serviceName: "RetroAssembly",
    embed: "https://games.vedsingh.com",
    direct: "https://games.vedsingh.com"
  },
  "/status": {
    key: "status",
    kicker: "NETWORK",
    title: "Status",
    description: "Uptime Kuma and the full service-health view.",
    serviceName: "Uptime Kuma",
    embed: "https://status.vedsingh.com",
    direct: "https://status.vedsingh.com"
  }
};

function normalizedPath() {
  const raw = window.location.pathname.replace(/\/+$/, "");
  return raw || "/";
}

function activatePortalTab(name) {
  $$(".portal-tab").forEach(link => {
    const active = link.dataset.portal === name;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function loadPortalRoute() {
  const path = normalizedPath();
  const config = portalRoutes[path];

  if (!config) {
    document.body.classList.remove("service-route");
    activatePortalTab("home");
    return;
  }

  document.body.classList.add("service-route");
  activatePortalTab(config.key);

  const title = $("#routeTitle");
  const kicker = $("#routeKicker");
  const description = $("#routeDescription");
  const direct = $("#routeDirect");
  const secondary = $("#routeSecondary");
  const frame = $("#serviceFrame");
  const frameName = $("#frameServiceName");

  if (title) title.textContent = config.title;
  if (kicker) kicker.textContent = config.kicker;
  if (description) description.textContent = config.description;
  if (frameName) frameName.textContent = config.serviceName;

  if (direct) {
    direct.href = config.direct;
    direct.setAttribute("aria-label", `Open ${config.serviceName} directly`);
  }

  if (secondary) {
    if (config.secondaryUrl) {
      secondary.hidden = false;
      secondary.href = config.secondaryUrl;
      secondary.textContent = config.secondaryLabel;
    } else {
      secondary.hidden = true;
      secondary.removeAttribute("href");
      secondary.textContent = "";
    }
  }

  if (frame) {
    frame.title = `${config.serviceName} embedded application`;
    frame.src = config.embed;
  }

  document.title = "Ved Singh";
  window.scrollTo(0, 0);
}

$$(".media-tab").forEach(button => {
  button.addEventListener("click", () => {
    setRecentSource(button.dataset.recentSource);
  });
});

loadPortalRoute();


/* =========================================================
   COMMAND PALETTE
   ========================================================= */

function renderCommands(query = "") {
  const q = query
    .trim()
    .toLowerCase();

  const list = commands.filter(command =>
    `
      ${command.label}
      ${command.hint}
      ${command.keys}
    `
      .toLowerCase()
      .includes(q)
  );

  selectedCommand = Math.min(
    selectedCommand,
    Math.max(
      0,
      list.length - 1
    )
  );

  const results =
    $("#commandResults");

  if (!results) return;

  results.innerHTML =
    list.length
      ? list
          .map(
            (
              command,
              index
            ) => `
            <button
              class="command-item ${
                index ===
                selectedCommand
                  ? "selected"
                  : ""
              }"
              data-url="${
                command.url
              }"
              type="button"
            >
              <span>
                ${escapeHTML(
                  command.label
                )}
                <br>
                <small>
                  ${escapeHTML(
                    command.hint
                  )}
                </small>
              </span>

              <span>↗</span>
            </button>
          `
          )
          .join("")
      : `
        <div class="state-message">
          <div>
            <strong>
              No route found.
            </strong>

            <p>
              Try movies, music,
              books, status…
            </p>
          </div>
        </div>
      `;

  $$(".command-item")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          window.location.href =
            button.dataset.url;
        }
      );
    });
}

function openPalette() {
  const backdrop =
    $("#commandBackdrop");

  if (!backdrop) return;

  backdrop.hidden = false;

  selectedCommand = 0;

  const input =
    $("#commandInput");

  if (input) {
    input.value = "";
  }

  renderCommands();

  requestAnimationFrame(() => {
    input?.focus();
  });
}

function closePalette() {
  const backdrop =
    $("#commandBackdrop");

  if (backdrop) {
    backdrop.hidden = true;
  }

  $("#commandTrigger")
    ?.focus();
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {
      toast.classList.remove(
        "show"
      );
    }, 2200);
}


/* =========================================================
   UNIVERSE SELECTOR
   ========================================================= */

function renderUniverseDots() {
  const wrap =
    $("#universeDots");

  if (!wrap) return;

  wrap.innerHTML =
    universes
      .map(
        (
          universe,
          index
        ) => `
        <button
          class="universe-dot ${
            index ===
            universeIndex
              ? "active"
              : ""
          }"
          type="button"
          data-universe-index="${index}"
          aria-label="Switch to ${
            universe.earth
          }"
        ></button>
      `
      )
      .join("");

  $$(".universe-dot")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          setUniverse(
            Number(
              button.dataset
                .universeIndex
            ),
            true
          );
        }
      );
    });
}

function setUniverse(
  index,
  manual = false
) {
  universeIndex =
    (
      index +
      universes.length
    ) %
    universes.length;

  const universe =
    universes[
      universeIndex
    ];

  document.body.dataset.universe =
    universe.id;

  if ($("#brandDimension")) {
    $("#brandDimension").textContent =
      `// ${universe.earth}`;
  }

  if ($("#universeNodeLabel")) {
    $("#universeNodeLabel").textContent =
      universe.node;
  }

  if ($("#sigilUniverse")) {
    $("#sigilUniverse").textContent =
      universe.title;
  }

  if ($("#consoleUniverse")) {
    $("#consoleUniverse").textContent =
      universe.earth;
  }

  if ($("#universeTitle")) {
    $("#universeTitle").textContent =
      universe.title;
  }

  if ($("#footerUniverse")) {
    $("#footerUniverse").textContent =
      universe.footer;
  }

  if ($("#heroUniverseLine")) {
    $("#heroUniverseLine").textContent =
      universe.line;
  }

  renderUniverseDots();

  document.body
    .classList
    .add("glitch");

  setTimeout(() => {
    document.body
      .classList
      .remove("glitch");
  }, 500);

  if (manual) {
    showToast(
      `DIMENSION SHIFT // ${universe.earth}`
    );

    restartUniverseCycle();
  }
}

function nextUniverse(
  manual = false
) {
  setUniverse(
    universeIndex + 1,
    manual
  );
}

function previousUniverse() {
  setUniverse(
    universeIndex - 1,
    true
  );
}

function restartUniverseCycle() {
  clearInterval(
    universeTimer
  );

  universeTimer =
    setInterval(() => {
      nextUniverse(false);
    }, UNIVERSE_INTERVAL_MS);
}


/* =========================================================
   CTRL + K UNIVERSE COMMANDS
   ========================================================= */

function switchUniverseFromCommand(
  value
) {
  const q = value
    .trim()
    .toLowerCase();

  const aliases = {
    "2099": "2099",
    "928": "2099",
    "earth-928": "2099",

    "1610": "1610",
    "earth-1610": "1610",

    "616": "616",
    "earth-616": "616",

    "noir": "noir",
    "90214": "noir",
    "earth-90214": "noir"
  };

  const targetId =
    aliases[q];

  if (!targetId) {
    return false;
  }

  const index =
    universes.findIndex(
      universe =>
        universe.id ===
        targetId
    );

  if (index < 0) {
    return false;
  }

  setUniverse(
    index,
    true
  );

  return true;
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

$("#commandTrigger")
  ?.addEventListener(
    "click",
    openPalette
  );

$("#commandClose")
  ?.addEventListener(
    "click",
    closePalette
  );

$("#commandBackdrop")
  ?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        $("#commandBackdrop")
      ) {
        closePalette();
      }
    }
  );

$("#commandInput")
  ?.addEventListener(
    "input",
    event => {
      const value =
        event.target.value;

      switchUniverseFromCommand(
        value
      );

      renderCommands(
        value
      );
    }
  );

document.addEventListener(
  "keydown",
  event => {
    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      event.key.toLowerCase() ===
        "k"
    ) {
      event.preventDefault();
      openPalette();
      return;
    }

    const backdrop =
      $("#commandBackdrop");

    if (
      event.key ===
        "Escape" &&
      backdrop &&
      !backdrop.hidden
    ) {
      event.preventDefault();
      closePalette();
      return;
    }

    if (
      !backdrop ||
      backdrop.hidden
    ) {
      return;
    }

    const items =
      $$(".command-item");

    if (!items.length) {
      return;
    }

    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();

      selectedCommand =
        (
          selectedCommand +
          1
        ) %
        items.length;
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();

      selectedCommand =
        (
          selectedCommand -
          1 +
          items.length
        ) %
        items.length;
    }

    if (
      event.key ===
      "Enter"
    ) {
      event.preventDefault();

      items[
        selectedCommand
      ]?.click();

      return;
    }

    items.forEach(
      (
        item,
        index
      ) => {
        item.classList.toggle(
          "selected",
          index ===
            selectedCommand
        );
      }
    );

    items[
      selectedCommand
    ]?.scrollIntoView({
      block: "nearest"
    });
  }
);

$("#nextUniverse")
  ?.addEventListener(
    "click",
    () => {
      nextUniverse(true);
    }
  );

$("#prevUniverse")
  ?.addEventListener(
    "click",
    previousUniverse
  );

$("#sigil")
  ?.addEventListener(
    "click",
    () => {
      nextUniverse(true);
    }
  );


/* =========================================================
   PWA INSTALL
   ========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  event => {
    event.preventDefault();

    deferredPrompt =
      event;
  }
);

$("#installPwa")
  ?.addEventListener(
    "click",
    async () => {
      if (!deferredPrompt) {
        showToast(
          "Use browser menu → Install app / Add to Home Screen."
        );

        return;
      }

      deferredPrompt.prompt();

      await deferredPrompt
        .userChoice;

      deferredPrompt = null;
    }
  );


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator
        .serviceWorker
        .register("/sw.js")
        .catch(() => {});
    }
  );
}


/* =========================================================
   STARTUP
   ========================================================= */

/*
  Every fresh page load:
  - chooses one of the 4 universes randomly
  - does NOT remember the last universe

  Then:
  - automatically changes universe every 4 minutes
  - manual switching resets the 4-minute timer
*/

updateClock();

setInterval(
  updateClock,
  30000
);

setUniverse(
  universeIndex,
  false
);

restartUniverseCycle();

loadStatus();
loadActivity();
loadRecent();

setInterval(
  loadStatus,
  60000
);

setInterval(
  loadActivity,
  30000
);