// ===== Builders =====
function notifyTicker(tickerController, detail) {
  if (!tickerController || typeof tickerController.showTemporary !== "function") return;
  tickerController.showTemporary(detail || {});
}

function setLaneVisible(laneNode, isVisible) {
  laneNode.style.display = isVisible ? "" : "none";
  laneNode.dataset.active = isVisible ? "true" : "false";
  laneNode.setAttribute("aria-hidden", isVisible ? "false" : "true");

  const focusable = laneNode.querySelectorAll("button, input, textarea, [tabindex]");
  focusable.forEach((el) => {
    if (isVisible) {
      if (el.hasAttribute("data-prev-tabindex")) {
        const prev = el.getAttribute("data-prev-tabindex");
        if (prev === "__none__") el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", prev);
        el.removeAttribute("data-prev-tabindex");
      }
      return;
    }

    if (!el.hasAttribute("data-prev-tabindex")) {
      const prev = el.getAttribute("tabindex");
      el.setAttribute("data-prev-tabindex", prev == null ? "__none__" : prev);
    }
    el.setAttribute("tabindex", "-1");
  });
}

// ===== Exports =====
// Builds the Button Switch pane and wires its behavior.
export function buildButtonSwitchPane(options = {}) {
  const lanes = Array.isArray(options.lanes) ? options.lanes : [];
  const tickerController = options.tickerController || null;
  const tickerId = options.tickerId || null;

  const labelPrefix = options.labelPrefix || "Mode: ";
  const buttonPrefix = options.buttonPrefix || "Switch to: ";
  const switchMsgPrefix = options.switchMsgPrefix || "Switched to ";

  // Build the switch control container.
  const node = document.createElement("div");
  node.className = "pane-button-switch";

  if (!lanes.length) {
    return {
      node,
      destroy() {},
    };
  }

  let activeIndex = 0;
  lanes.forEach((lane, idx) => {
    setLaneVisible(lane.node, idx === 0);
  });

  const controls = document.createElement("div");
  controls.className = "actions button-switch-controls";

  const labelSpan = document.createElement("span");
  labelSpan.className = "button-switch-label";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "secondary";

  const laneTitle = (idx) => {
    const lane = lanes[idx];
    if (!lane) return `Mode ${idx + 1}`;
    return lane.title || `Mode ${idx + 1}`;
  };

  const updateUI = () => {
    const currentTitle = laneTitle(activeIndex);
    const nextIndex = (activeIndex + 1) % lanes.length;
    const nextTitle = laneTitle(nextIndex);

    labelSpan.textContent = `${labelPrefix}${currentTitle}`;
    btn.textContent = `${buttonPrefix}${nextTitle}`;
  };

  const onClick = () => {
    setLaneVisible(lanes[activeIndex].node, false);
    activeIndex = (activeIndex + 1) % lanes.length;
    setLaneVisible(lanes[activeIndex].node, true);

    notifyTicker(tickerController, {
      tickerId,
      text: `${switchMsgPrefix}${laneTitle(activeIndex)}`,
      ms: 2500,
      color: "var(--accent)",
    });

    updateUI();
  };

  // ===== Event Wiring =====
  // Attach lane switch behavior to the control button.
  btn.addEventListener("click", onClick);
  updateUI();

  controls.appendChild(labelSpan);
  controls.appendChild(btn);
  node.appendChild(controls);

  // ===== Lifecycle =====
  return {
    node,
    destroy() {
      // Remove event listeners created by this pane.
      btn.removeEventListener("click", onClick);
    },
  };
}
