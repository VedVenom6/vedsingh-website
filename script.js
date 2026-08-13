(() => {
  const THEMES = [
    { id: "616", label: "EARTH-616" },
    { id: "1610", label: "EARTH-1610" },
    { id: "2099", label: "EARTH-928" },
    { id: "noir", label: "EARTH-90214" }
  ];

  // Theme rotation is intentionally slow.
  // A new universe is chosen every 12–24 minutes while the page remains open.
  const MIN_CHANGE_MS = 12 * 60 * 1000;
  const MAX_CHANGE_MS = 24 * 60 * 1000;

  const root = document.documentElement;
  const universeLabel = document.getElementById("universeLabel");
  const footerUniverse = document.getElementById("footerUniverse");
  const themeButton = document.getElementById("themeButton");

  let timer = null;

  function themeById(id) {
    return THEMES.find(theme => theme.id === id) || THEMES[0];
  }

  function randomTheme(excludeId = null) {
    const pool = THEMES.filter(theme => theme.id !== excludeId);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function applyTheme(theme, animate = true) {
    if (!theme) return;

    if (animate) {
      document.body.classList.add("theme-transition");
      window.setTimeout(() => {
        document.body.classList.remove("theme-transition");
      }, 700);
    }

    root.dataset.theme = theme.id;

    if (universeLabel) universeLabel.textContent = theme.label;
    if (footerUniverse) footerUniverse.textContent = theme.label;

    // Remember only during this tab session.
    // A fresh visit still lands on a random universe.
    sessionStorage.setItem("ved-current-theme", theme.id);
  }

  function scheduleNextChange() {
    if (timer) window.clearTimeout(timer);

    const delay =
      Math.floor(Math.random() * (MAX_CHANGE_MS - MIN_CHANGE_MS + 1)) +
      MIN_CHANGE_MS;

    timer = window.setTimeout(() => {
      const next = randomTheme(root.dataset.theme);
      applyTheme(next);
      scheduleNextChange();
    }, delay);
  }

  function nextTheme() {
    const currentIndex = THEMES.findIndex(theme => theme.id === root.dataset.theme);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    applyTheme(next);
    scheduleNextChange();
  }

  // Requirement: every fresh page/tab visit lands on a random universe.
  const firstTheme = randomTheme();
  applyTheme(firstTheme, false);
  scheduleNextChange();

  if (themeButton) {
    themeButton.addEventListener("click", nextTheme);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) window.clearTimeout(timer);
    } else {
      scheduleNextChange();
    }
  });
})();
