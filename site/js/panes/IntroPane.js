// ===== Exports =====
// Builds the Intro pane and wires its behavior.
export function buildIntroPane(options = {}) {
  const introKey = options.introKey || "home";
  const introMap = options.introMap || {};

  // ===== Builders =====
  // Build the pane root and inject intro markup.
  const node = document.createElement("div");
  node.className = "intro-text pane-intro-text";
  node.innerHTML = introMap[introKey] || "";

  // ===== Lifecycle =====
  return {
    node,
    destroy() {},
  };
}
