const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];

const commands = [
  {
    label: "Movies & TV",
    hint: "Jellyfin",
    url: "https://movies.vedsingh.com",
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
    url: "https://music.vedsingh.com",
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
    url: "https://books.vedsingh.com",
    keys: "books comics manga kavita"
  },
  {
    label: "Audiobooks",
    hint: "Audiobookshelf",
    url: "https://audiobooks.vedsingh.com",
    keys: "audiobooks listen"
  },
  {
    label: "System Status",
    hint: "Uptime Kuma",
    url: "https://status.vedsingh.com",
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
      "Movies, music, books, audiobooks, requests, and server status — connected through one futuristic 2099 control deck."
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

    const monitors = Array.isArray(data.monitors)
      ? data.monitors
      : [];

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

    if ($("#pulseUptime")) {
      $("#pulseUptime").textContent =
        data.overallUptime
          ? `${data.overallUptime}%`
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
   JELLYFIN NOW PLAYING
   ========================================================= */

async function loadNowPlaying() {
  const container = $("#nowPlayingContent");

  if (!container) return;

  try {
    const data =
      await getJSON(
        "/api/jellyfin/now-playing"
      );

    const item = data.items?.[0];

    if (!item) {
      container.className = "state-message";

      container.innerHTML = `
        <span class="pulse-orb"></span>
        <div>
          <strong>Nothing playing right now.</strong>
          <p>The node is quiet.</p>
        </div>
      `;

      return;
    }

    container.className = "now-playing-item";

    container.innerHTML = `
      <img
        class="now-art"
        src="${item.image || "/icon.svg"}"
        alt=""
      >

      <div class="now-copy">
        <div class="eyeline">
          ${escapeHTML(
            item.user || "JELLYFIN"
          )} // NOW PLAYING
        </div>

        <h3>
          ${escapeHTML(
            item.title || "Unknown"
          )}
        </h3>

        <p>
          ${escapeHTML(
            item.subtitle || ""
          )}
        </p>

        <div class="progress">
          <span
            style="width:${Math.max(
              0,
              Math.min(
                100,
                item.progressPercent || 0
              )
            )}%"
          ></span>
        </div>
      </div>
    `;
  } catch (error) {
    container.className = "state-message";

    container.innerHTML = `
      <span class="pulse-orb"></span>

      <div>
        <strong>Now Playing is ready.</strong>
        <p>
          Add the Jellyfin Worker secret
          to enable it.
        </p>
      </div>
    `;
  }
}


/* =========================================================
   JELLYFIN RECENTLY ADDED
   ========================================================= */

async function loadRecent() {
  const grid = $("#recentGrid");

  if (!grid) return;

  try {
    const data =
      await getJSON(
        "/api/jellyfin/recent?limit=8"
      );

    const items = data.items || [];

    if (!items.length) {
      throw new Error("empty");
    }

    grid.innerHTML = items
      .map(item => `
        <a
          class="recent-card glass"
          href="${
            item.url ||
            "https://movies.vedsingh.com"
          }"
        >
          <img
            class="recent-image"
            src="${
              item.image ||
              "/icon.svg"
            }"
            alt=""
            loading="lazy"
          >

          <div class="recent-info">
            <div class="recent-type">
              ${escapeHTML(
                (
                  item.type ||
                  "MEDIA"
                ).toUpperCase()
              )}
            </div>

            <div class="recent-title">
              ${escapeHTML(
                item.title ||
                "Untitled"
              )}
            </div>

            <div class="recent-subtitle">
              ${escapeHTML(
                item.subtitle ||
                ""
              )}
            </div>
          </div>
        </a>
      `)
      .join("");
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-recent glass">
        <strong>
          Recently Added is ready.
        </strong>

        <p>
          Add the Jellyfin API key
          as a Worker secret to
          populate this panel.
        </p>
      </div>
    `;
  }
}


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
loadNowPlaying();
loadRecent();

setInterval(
  loadStatus,
  60000
);

setInterval(
  loadNowPlaying,
  30000
);