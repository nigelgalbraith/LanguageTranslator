// ===== State =====
const DEFAULT_TICKER_MESSAGES = [
  "Tip: Load a profile JSON to get started.",
  "You can always export your current setup.",
];

const TYPING_DELAY = 70;
const HOLD_DELAY = 4000;
const BETWEEN_DELAY = 800;
const INITIAL_DELAY = 600;
const TEMP_MESSAGE_MS = 5000;

// ===== Builders =====
function loadTickerMessages(url) {
  if (!url) return Promise.resolve(DEFAULT_TICKER_MESSAGES.slice());

  // Fetch rotating ticker messages from the configured source.
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.messages)) return data.messages;
      return DEFAULT_TICKER_MESSAGES.slice();
    })
    .catch(() => DEFAULT_TICKER_MESSAGES.slice());
}

class StatusTicker {
  constructor(el, messages, opts) {
    this.el = el;
    this.messages = messages || [];
    this.opts = opts || {};

    this.opts.typingDelay = this.opts.typingDelay || TYPING_DELAY;
    this.opts.holdDelay = this.opts.holdDelay || HOLD_DELAY;
    this.opts.betweenDelay = this.opts.betweenDelay || BETWEEN_DELAY;
    this.opts.initialDelay = this.opts.initialDelay || INITIAL_DELAY;

    this.idx = 0;
    this.running = false;
    this.stopFlag = false;
    this.interrupt = false;
    this.tempSeq = 0;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async type(text) {
    this.el.textContent = "";

    for (let i = 0; i < text.length; i += 1) {
      if (this.interrupt || this.stopFlag) return;
      this.el.textContent += text.charAt(i);
      await this.sleep(this.opts.typingDelay);
    }
  }

  async loop() {
    this.running = true;
    await this.sleep(this.opts.initialDelay);

    while (!this.stopFlag) {
      if (!this.messages.length) {
        await this.sleep(1000);
        continue;
      }

      const text = this.messages[this.idx % this.messages.length];
      this.idx += 1;

      this.interrupt = false;
      await this.type(text);
      if (this.interrupt || this.stopFlag) break;

      await this.sleep(this.opts.holdDelay);
      if (this.interrupt || this.stopFlag) break;

      await this.sleep(this.opts.betweenDelay);
    }

    this.running = false;
  }

  start() {
    if (this.running) return;
    this.stopFlag = false;
    this.interrupt = false;
    this.loop();
  }

  stop() {
    this.stopFlag = true;
    this.interrupt = true;
  }

  setMessages(msgs) {
    this.messages = msgs || [];
    this.idx = 0;
  }

  showTemporary(text, ms) {
    const token = ++this.tempSeq;

    this.stop();
    this.el.textContent = text;

    this.sleep(ms || TEMP_MESSAGE_MS).then(() => {
      if (token !== this.tempSeq) return;
      if (!this.messages || !this.messages.length) return;
      this.stopFlag = false;
      this.interrupt = false;
      this.start();
    });
  }
}

// ===== Exports =====
// Builds the Status Ticker pane and wires its behavior.
export function buildStatusTickerPane(options = {}) {
  const messagesUrl = options.messagesUrl || null;
  const tickerId = options.tickerId || "default";
  const controller = options.controller || null;

  // Build the ticker host and status text node.
  const node = document.createElement("div");
  node.className = "profile-loader-ticker pane-status-ticker";

  const status = document.createElement("div");
  status.className = "status-text";
  node.appendChild(status);

  let ticker = null;

  const applyColor = (color) => {
    status.style.color = color ? String(color) : "";
  };

  const handleTemporary = (detail = {}) => {
    if (detail.tickerId && detail.tickerId !== tickerId) return;

    const text = String(detail.text || "");
    if (!text) return;

    applyColor(detail.color);

    if (ticker) {
      ticker.showTemporary(text, detail.ms);
    } else {
      status.textContent = text;
    }

    const seq = ticker ? ticker.tempSeq : 0;
    const ms = detail.ms || TEMP_MESSAGE_MS;

    setTimeout(() => {
      if (!ticker) return;
      if (ticker.tempSeq !== seq) return;
      applyColor("");
    }, ms + 50);
  };

  const handleSetMessages = (detail = {}) => {
    if (detail.tickerId && detail.tickerId !== tickerId) return;
    if (!Array.isArray(detail.messages)) return;
    if (ticker) ticker.setMessages(detail.messages);
  };

  if (controller && typeof controller === "object") {
    controller.showTemporary = handleTemporary;
    controller.setMessages = handleSetMessages;
  }

  loadTickerMessages(messagesUrl).then((msgs) => {
    ticker = new StatusTicker(status, msgs, {});
    status.classList.add("show");
    applyColor("");
    ticker.start();
  });

  // ===== Lifecycle =====
  return {
    node,
    destroy() {
      // Stop ticker loops and detach controller callbacks.
      if (ticker) ticker.stop();
      if (controller && typeof controller === "object") {
        if (controller.showTemporary === handleTemporary) {
          controller.showTemporary = () => {};
        }
        if (controller.setMessages === handleSetMessages) {
          controller.setMessages = () => {};
        }
      }
    },
  };
}
