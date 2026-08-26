const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];

/* =========================================================
   Real cross-subdomain destinations. media.vedsingh.com is a
   portal: it links to and embeds these services, it does not
   absorb them into its own paths.
   ========================================================= */
const commands = [
  { label: "Movies & TV", hint: "Jellyfin", url: "https://movies.vedsingh.com", keys: "movies tv jellyfin watch" },
  { label: "Request Something", hint: "Seerr", url: "https://seerr.vedsingh.com", keys: "requests seerr movies shows" },
  { label: "Music", hint: "Navidrome", url: "https://music.vedsingh.com", keys: "music navidrome songs albums" },
  { label: "Add Music", hint: "Aurral", url: "https://aurral.vedsingh.com", keys: "add request music aurral lidarr albums artists" },
  { label: "Books & Comics", hint: "Kavita", url: "https://books.vedsingh.com", keys: "books comics manga kavita" },
  { label: "Audiobooks", hint: "Audiobookshelf", url: "https://audiobooks.vedsingh.com", keys: "audiobooks listen" },
  { label: "Games", hint: "RetroAssembly", url: "https://games.vedsingh.com", keys: "games retroassembly roms play" },
  { label: "System Status", hint: "Uptime Kuma", url: "https://status.vedsingh.com", keys: "status uptime health" },
  { label: "Home", hint: "vedsingh.com", url: "https://vedsingh.com", keys: "home hub index" },
  { label: "Work", hint: "HLIF and projects", url: "https://work.vedsingh.com", keys: "work hlif projects" },
  { label: "Personal", hint: "Collections, reading, notes", url: "https://personal.vedsingh.com", keys: "personal collections reading notes" },
  { label: "Lab", hint: "Prototypes and experiments", url: "https://lab.vedsingh.com", keys: "lab ai prototypes experiments linux servers" }
];

let selectedCommand = 0;
const getJSON = async url => {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
};

const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

/* =========================================================
   UPTIME KUMA STATUS — same /api/status contract as before.
   ========================================================= */

async function loadStatus() {
  const top = $("#statusSummary");

  try {
    const data = await getJSON("/api/status");

    const retiredMonitorNames = new Set(["mylar3", "shelfarr", "syncthing", "adguardhome", "adguard home"]);

    const monitors = (Array.isArray(data.monitors) ? data.monitors : [])
      .filter(monitor => !retiredMonitorNames.has(normalize(monitor.name)));

    const byName = new Map(monitors.map(monitor => [normalize(monitor.name), monitor]));

    const monitorAliases = {
      "retroassembly": ["retroassembly", "retro assembly", "games"],
      "uptime kuma": ["uptime kuma", "uptime-kuma", "kuma"],
      "jellyfin": ["jellyfin"],
      "navidrome": ["navidrome"],
      "kavita": ["kavita"],
      "audiobookshelf": ["audiobookshelf"],
      "seerr": ["seerr"]
    };

    const findMonitor = expectedName => {
      const expected = normalize(expectedName);
      if (byName.has(expected)) return byName.get(expected);
      const aliases = monitorAliases[expected] || [expected];
      return monitors.find(monitor => {
        const actual = normalize(monitor.name);
        return aliases.some(alias => actual === alias || actual.includes(alias) || alias.includes(actual));
      });
    };

    let online = 0, degraded = 0, offline = 0;
    monitors.forEach(monitor => {
      if (monitor.state === "ok") online++;
      else if (monitor.state === "down") offline++;
      else degraded++;
    });

    $$(".panel").forEach(panel => {
      const monitor = findMonitor(panel.dataset.monitor);
      const state = monitor?.state || "warn";
      const dot = $("[data-role='dot']", panel);
      const label = $("[data-role='state']", panel);
      if (dot) dot.dataset.state = state;
      if (label) label.textContent = state === "ok" ? "online" : state === "down" ? "offline" : "unknown";
    });

    if ($("#pulseOnline")) $("#pulseOnline").textContent = online;
    if ($("#pulseDegraded")) $("#pulseDegraded").textContent = degraded;
    if ($("#pulseOffline")) $("#pulseOffline").textContent = offline;

    const uptimeValues = monitors.map(monitor => Number(monitor.uptime)).filter(Number.isFinite);
    const avgUptime = uptimeValues.length
      ? (uptimeValues.reduce((sum, value) => sum + value, 0) / uptimeValues.length).toFixed(2)
      : null;

    if ($("#pulseUptime")) $("#pulseUptime").textContent = avgUptime !== null ? `${avgUptime}%` : "—";

    if ($("#pulseNote")) {
      $("#pulseNote").textContent = monitors.length
        ? `${online} of ${monitors.length} monitored services are online.`
        : "No status data.";
    }

    if (top) {
      if (offline > 0) {
        top.dataset.state = "down";
        if ($("#statusSummaryText")) $("#statusSummaryText").textContent = `${offline} offline`;
      } else if (degraded > 0) {
        top.dataset.state = "warn";
        if ($("#statusSummaryText")) $("#statusSummaryText").textContent = `${degraded} unknown`;
      } else {
        top.dataset.state = "ok";
        if ($("#statusSummaryText")) $("#statusSummaryText").textContent = "All systems operational";
      }
    }
  } catch {
    if (top) top.dataset.state = "warn";
    if ($("#statusSummaryText")) $("#statusSummaryText").textContent = "Status unavailable";
    if ($("#pulseNote")) $("#pulseNote").textContent = "Could not reach Uptime Kuma.";
  }
}

/* =========================================================
   CURRENT ACTIVITY — same /api/activity contract as before.
   ========================================================= */

function renderActivityItem(item) {
  const progress = Math.max(0, Math.min(100, Number(item.progressPercent || 0)));

  return `
    <a class="activity-item" href="${escapeHTML(item.url || "#")}">
      <img class="activity-art" src="${escapeHTML(item.image || "/icon.svg")}" alt="" loading="lazy">
      <div>
        <div class="activity-meta">
          <span>${escapeHTML((item.action || "Active").toUpperCase())}</span>
          <small>${escapeHTML(item.source || "")}</small>
        </div>
        <h3>${escapeHTML(item.title || "Untitled")}</h3>
        <p>${escapeHTML(item.subtitle || "")}</p>
        ${Number.isFinite(Number(item.progressPercent))
          ? `<div class="activity-progress"><span style="width:${progress}%"></span></div>`
          : ""}
      </div>
      <span class="activity-arrow" aria-hidden="true">&#8599;</span>
    </a>
  `;
}

async function loadActivity() {
  const grid = $("#activityGrid");
  if (!grid) return;

  try {
    const data = await getJSON("/api/activity");
    const items = Array.isArray(data.items) ? data.items : [];

    grid.innerHTML = items.length
      ? items.slice(0, 4).map(renderActivityItem).join("")
      : `<div class="activity-empty"><strong>Nothing active right now.</strong><span>Watching, listening and reading activity will appear here.</span></div>`;
  } catch {
    grid.innerHTML = `<div class="activity-empty"><strong>Activity integrations are ready.</strong><span>Configured media services will appear here automatically.</span></div>`;
  }
}

/* =========================================================
   RECENTLY ADDED — same /api/recent contract as before.
   ========================================================= */

const recentSources = {
  movies: { label: "Movies & TV", url: "https://movies.vedsingh.com" },
  music: { label: "Music", url: "https://music.vedsingh.com" },
  books: { label: "Books & Comics", url: "https://books.vedsingh.com" },
  audiobooks: { label: "Audiobooks", url: "https://audiobooks.vedsingh.com" },
  games: { label: "Games", url: "https://games.vedsingh.com" }
};

let recentSource = "movies";

function setRecentSource(source) {
  if (!recentSources[source]) return;
  recentSource = source;

  $$(".media-tab").forEach(button => {
    const active = button.dataset.recentSource === source;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  const panel = $("#recentGrid");
  const activeTab = $(`.media-tab[data-recent-source="${source}"]`);
  if (panel && activeTab) panel.setAttribute("aria-labelledby", activeTab.id);

  const openLink = $("#recentOpenLink");
  const config = recentSources[source];
  if (openLink) {
    openLink.href = config.url;
    openLink.textContent = `Open ${config.label} →`;
  }

  loadRecent(source);
}

async function loadRecent(source = recentSource) {
  const grid = $("#recentGrid");
  if (!grid) return;

  const config = recentSources[source] || recentSources.movies;
  grid.setAttribute("aria-busy", "true");

  try {
    const data = await getJSON(`/api/recent?source=${encodeURIComponent(source)}&limit=8`);
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      const message = data.reason === "retroassembly-api-unavailable"
        ? "RetroAssembly does not expose a stable recent-games feed yet."
        : data.configured === false
        ? `${config.label} live data is not connected yet.`
        : `Nothing new in ${config.label} right now.`;

      grid.innerHTML = `
        <div class="empty-recent">
          <strong>${escapeHTML(config.label)}</strong>
          <p>${escapeHTML(message)}</p>
          <a href="${escapeHTML(config.url)}">Open ${escapeHTML(config.label)} →</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="strip-card">
        <a class="strip-thumb" href="${escapeHTML(item.url || config.url)}">
          <img src="${escapeHTML(item.image || "/icon.svg")}" alt="" loading="lazy">
          <span class="k">${escapeHTML(item.type || config.label)}</span>
        </a>
        <div class="strip-title">${escapeHTML(item.title || "Untitled")}</div>
        <div class="strip-sub">${escapeHTML(item.subtitle || "")}</div>
      </div>
    `).join("");
  } catch {
    grid.innerHTML = `
      <div class="empty-recent">
        <strong>${escapeHTML(config.label)}</strong>
        <p>This library is temporarily unavailable from the portal.</p>
        <a href="${escapeHTML(config.url)}">Open ${escapeHTML(config.label)} →</a>
      </div>
    `;
  } finally {
    grid.removeAttribute("aria-busy");
  }
}

$$(".media-tab").forEach(button => {
  button.addEventListener("click", () => setRecentSource(button.dataset.recentSource));
  button.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = $$(".media-tab");
    const current = tabs.indexOf(button);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
      ? tabs.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    setRecentSource(tabs[next].dataset.recentSource);
  });
});

/* =========================================================
   COMMAND PALETTE
   ========================================================= */

function renderCommands(query = "") {
  const q = query.trim().toLowerCase();
  const list = commands.filter(command => `${command.label} ${command.hint} ${command.keys}`.toLowerCase().includes(q));
  selectedCommand = Math.min(selectedCommand, Math.max(0, list.length - 1));

  const results = $("#commandResults");
  if (!results) return;

  results.innerHTML = list.length
    ? list.map((command, index) => `
        <button class="command-item ${index === selectedCommand ? "selected" : ""}" data-url="${escapeHTML(command.url)}" type="button">
          <span>${escapeHTML(command.label)}<br><small>${escapeHTML(command.hint)}</small></span>
          <span aria-hidden="true">&#8599;</span>
        </button>
      `).join("")
    : `<div class="command-item command-empty"><span><strong>No route found.</strong><br><small>Try movies, music, books, status&hellip;</small></span></div>`;

  $$(".command-item[data-url]").forEach(button => {
    button.addEventListener("click", () => { window.location.href = button.dataset.url; });
  });
}

function openPalette() {
  const backdrop = $("#commandBackdrop");
  if (!backdrop) return;
  backdrop.hidden = false;
  selectedCommand = 0;
  const input = $("#commandInput");
  if (input) input.value = "";
  renderCommands();
  requestAnimationFrame(() => input?.focus());
}

function closePalette() {
  const backdrop = $("#commandBackdrop");
  if (backdrop) backdrop.hidden = true;
  $("#commandTrigger")?.focus();
}

$("#commandTrigger")?.addEventListener("click", openPalette);
$("#commandClose")?.addEventListener("click", closePalette);
$("#commandBackdrop")?.addEventListener("click", event => {
  if (event.target === $("#commandBackdrop")) closePalette();
});
$("#commandInput")?.addEventListener("input", event => renderCommands(event.target.value));

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
    return;
  }

  const backdrop = $("#commandBackdrop");

  if (event.key === "Escape" && backdrop && !backdrop.hidden) {
    event.preventDefault();
    closePalette();
    return;
  }

  if (!backdrop || backdrop.hidden) return;

  if (event.key === "Tab") {
    const focusable = $$('input, button, a[href], [tabindex]:not([tabindex="-1"])', backdrop)
      .filter(element => !element.disabled && !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }

  const items = $$(".command-item[data-url]");
  if (!items.length) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedCommand = (selectedCommand + 1) % items.length;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedCommand = (selectedCommand - 1 + items.length) % items.length;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    items[selectedCommand]?.click();
    return;
  }

  items.forEach((item, index) => item.classList.toggle("selected", index === selectedCommand));
  items[selectedCommand]?.scrollIntoView({ block: "nearest" });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/* =========================================================
   STARTUP
   ========================================================= */

loadStatus();
loadActivity();
loadRecent();

setInterval(loadStatus, 60000);
setInterval(loadActivity, 30000);
