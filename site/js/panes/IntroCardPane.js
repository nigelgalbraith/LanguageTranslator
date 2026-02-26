// ===== Exports =====
// Builds the Intro Card pane and wires its behavior.
export function buildIntroCardPane(options = {}) {
  const cardKey = options.cardKey || "";
  const cardsMap = options.cardsMap || {};
  const card = cardsMap[cardKey];

  // ===== Builders =====
  // Build the pane root for the card.
  const node = document.createElement("div");

  if (!card) {
    node.innerHTML = `<p>Card not found: ${cardKey || "unknown"}</p>`;
    return {
      node,
      destroy() {},
    };
  }

  // Build the card link, title, and description.
  node.className = "translator-card";

  const link = document.createElement("a");
  link.href = card.link;

  const title = document.createElement("h2");
  title.textContent = card.title;

  const description = document.createElement("p");
  description.textContent = String(card.description || "").trim();

  link.appendChild(title);
  link.appendChild(description);
  node.appendChild(link);

  // ===== Lifecycle =====
  return {
    node,
    destroy() {},
  };
}
