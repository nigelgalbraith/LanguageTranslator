// ===== Builders =====
function applyTheme(theme) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  const isLight = theme === "light";
  btn.setAttribute("aria-pressed", String(isLight));

  const icon = btn.querySelector(".theme-toggle-icon");
  if (icon) icon.textContent = isLight ? "☀" : "☾";
}

// ===== Exports =====
// Initializes theme toggle behavior.
export function initThemeToggle() {
  const saved = localStorage.getItem("theme");
  const systemPrefersLight =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;

  const initial = saved || (systemPrefersLight ? "light" : "dark");
  applyTheme(initial);

  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;

  // ===== Event Wiring =====
  // Attach toggle behavior to the theme button.
  btn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });
}
