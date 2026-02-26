// ===== Exports =====
// Builds the Text Entry pane and wires its behavior.
export function buildTextEntryPane(options = {}) {
  const title = options.title || "Text";
  const textareaId = options.textareaId || "text-entry";
  const placeholder = options.placeholder || "Type here...";
  const initialValue = options.initialValue || "";
  const onInput = typeof options.onInput === "function" ? options.onInput : null;
  const elementRef = options.elementRef || null;

  // ===== Builders =====
  // Build the pane structure and editable text area.
  const node = document.createElement("div");
  node.className = "pane-text-entry";

  const section = document.createElement("section");
  section.className = "pane pane--text-entry";

  const h2 = document.createElement("h2");
  h2.className = "pane-title";
  h2.textContent = title;

  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const div = document.createElement("div");
  div.id = textareaId;
  div.className = "letter";
  div.contentEditable = "true";
  div.setAttribute("data-placeholder", placeholder);

  if (initialValue) {
    div.textContent = String(initialValue);
  }

  wrapper.appendChild(div);
  section.appendChild(h2);
  section.appendChild(wrapper);
  node.appendChild(section);

  if (elementRef && typeof elementRef === "object") {
    elementRef.current = div;
  }

  const handleInput = () => {
    if (onInput) onInput(div.textContent || "", div);
  };

  // ===== Event Wiring =====
  // Attach input listener for external updates.
  if (onInput) {
    div.addEventListener("input", handleInput);
  }

  // ===== Lifecycle =====
  return {
    node,
    destroy() {
      // Remove event listeners created by this pane.
      if (onInput) {
        div.removeEventListener("input", handleInput);
      }
    },
  };
}
