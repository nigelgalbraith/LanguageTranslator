// ===== State =====
const DEFAULT_PIPER_BASE = "/api/piper";
const DEFAULT_VOICE_ID = "en_US-amy-low";

const RETRY_FIND_TARGET_MS = 50;
const RETRY_FIND_TARGET_TRIES = 40;

// ===== Builders =====
function notifyTicker(tickerController, detail) {
  if (!tickerController || typeof tickerController.showTemporary !== "function") return;
  tickerController.showTemporary(detail || {});
}

function cleanText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/  +\n/g, "\n")
    .replace(/^\s*text:\s*/i, "")
    .trim();
}

function readTargetTextFromEl(el) {
  if (!el) return "";
  if ("value" in el) return String(el.value || "");
  return String(el.textContent || "");
}

function speakViaPiper(text, base) {
  if (!text || !text.trim()) return Promise.resolve(null);

  const piperBase = base || DEFAULT_PIPER_BASE;
  const piperEndpoint = piperBase.endsWith("/") ? piperBase : `${piperBase}/`;

  // Request audio bytes from the Piper endpoint.
  return fetch(piperEndpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: cleanText(text),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Piper TTS failed (HTTP ${res.status})`);
      return res.arrayBuffer();
    })
    .then((buf) => {
      const blob = new Blob([buf], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio._blobUrl = url;

      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});

      return audio;
    });
}

// ===== Exports =====
// Builds the Generator Piper pane and wires its behavior.
export function buildGeneratorPiperPane(options = {}) {
  const base = options.piperBase || DEFAULT_PIPER_BASE;
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  const getTargetElement =
    typeof options.getTargetElement === "function"
      ? options.getTargetElement
      : () => options.targetElement || null;

  const tickerController = options.tickerController || null;
  const tickerId = options.tickerId || null;

  const tickerMsgSpeaking = options.tickerSpeaking || "Reading aloud.";
  const tickerMsgStopped = options.tickerStopped || "Stopped voice playback.";
  const tickerMsgError = options.tickerError || "Piper TTS error.";
  const tickerMsgBusy = options.tickerBusy || "Already speaking...";
  const tickerMsgEmpty = options.tickerEmpty || "Nothing to speak.";

  const autoDisable = String(options.autoDisable || "true").toLowerCase() !== "false";

  // Build the pane UI for voice details and actions.
  const node = document.createElement("div");
  node.className = "pane-generator-piper";

  const section = document.createElement("section");
  section.className = "pane pane--generator-piper";

  const h2 = document.createElement("h2");
  h2.className = "pane-title";
  h2.textContent = options.title || "Voice (Piper)";

  const details = document.createElement("div");
  details.className = "voice-details";

  const lab = document.createElement("label");
  lab.textContent = options.voiceLabel || "Voice in use";

  const voiceDiv = document.createElement("div");
  voiceDiv.className = "voice-id";
  voiceDiv.textContent = voiceId;

  const actions = document.createElement("div");
  actions.className = "actions";

  const btnSay = document.createElement("button");
  btnSay.className = "primary";
  btnSay.type = "button";
  btnSay.textContent = options.speakLabel || "Speak";

  const btnStop = document.createElement("button");
  btnStop.type = "button";
  btnStop.textContent = options.stopLabel || "Stop";

  const flashDiv = document.createElement("div");
  flashDiv.className = "flash";

  details.appendChild(lab);
  details.appendChild(voiceDiv);
  actions.appendChild(btnSay);
  actions.appendChild(btnStop);

  section.appendChild(h2);
  section.appendChild(details);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  node.appendChild(section);

  let currentAudio = null;
  let isSpeaking = false;
  let dotTimer = null;

  let targetEl = null;
  let observer = null;
  let retryTimer = null;
  let retriesLeft = RETRY_FIND_TARGET_TRIES;

  const setFlash = (msg) => {
    flashDiv.textContent = msg || "";
    flashDiv.classList.toggle("show", Boolean(msg));
  };

  const stopDots = (msg) => {
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    if (msg != null) setFlash(msg);
  };

  const startDots = (baseMsg) => {
    stopDots();
    let dots = 0;
    dotTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      setFlash(`${baseMsg}${".".repeat(dots)}`);
    }, 350);
  };

  const cleanupAudio = (audio) => {
    try {
      if (audio) audio.pause();
    } catch (_err) {
      // ignore
    }
    try {
      if (audio && audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
    } catch (_err) {
      // ignore
    }
  };

  const updateSpeakEnabled = () => {
    if (!autoDisable || isSpeaking) return;
    btnSay.disabled = !cleanText(readTargetTextFromEl(targetEl));
  };

  const stopPlayback = (opts = {}) => {
    const hadAudio = Boolean(currentAudio);
    const wasSpeaking = isSpeaking;

    if (currentAudio) cleanupAudio(currentAudio);
    currentAudio = null;
    isSpeaking = false;

    btnStop.disabled = true;
    updateSpeakEnabled();
    stopDots("Stopped.");

    if (!opts.silent && (hadAudio || wasSpeaking)) {
      notifyTicker(tickerController, {
        tickerId,
        text: tickerMsgStopped,
        ms: 2500,
        color: "var(--accent)",
      });
    }
  };

  btnStop.disabled = true;
  btnSay.disabled = autoDisable;

  const detachWatchers = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (targetEl) {
      targetEl.removeEventListener("input", updateSpeakEnabled);
      targetEl.removeEventListener("change", updateSpeakEnabled);
    }
  };

  const attachWatchers = (el) => {
    if (!autoDisable || !el) return;

    el.addEventListener("input", updateSpeakEnabled);
    el.addEventListener("change", updateSpeakEnabled);

    if (el.isContentEditable && typeof MutationObserver === "function") {
      observer = new MutationObserver(() => updateSpeakEnabled());
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    }
  };

  const tryAttachTarget = () => {
    if (targetEl) return;

    const found = getTargetElement();
    if (found) {
      targetEl = found;
      attachWatchers(targetEl);
      updateSpeakEnabled();
      return;
    }

    retriesLeft -= 1;
    if (retriesLeft <= 0) return;
    retryTimer = setTimeout(tryAttachTarget, RETRY_FIND_TARGET_MS);
  };

  tryAttachTarget();

  const onSpeakClick = () => {
    if (isSpeaking) {
      setFlash(tickerMsgBusy);
      notifyTicker(tickerController, { tickerId, text: tickerMsgBusy, ms: 2000, color: "#f97316" });
      return;
    }

    const text = cleanText(readTargetTextFromEl(targetEl));
    if (!text) {
      setFlash(tickerMsgEmpty);
      notifyTicker(tickerController, { tickerId, text: tickerMsgEmpty, ms: 2500, color: "#f97316" });
      return;
    }

    isSpeaking = true;
    btnSay.disabled = true;
    btnStop.disabled = false;

    notifyTicker(tickerController, {
      tickerId,
      text: String(tickerMsgSpeaking).replace("{voice}", voiceId),
      ms: 4000,
      color: "var(--accent)",
    });
    startDots("Speaking");

    speakViaPiper(text, base)
      .then((audio) => {
        currentAudio = audio;

        const done = () => {
          if (!audio) return;
          audio.removeEventListener("ended", done);
          audio.removeEventListener("error", done);

          cleanupAudio(audio);
          if (currentAudio === audio) currentAudio = null;

          isSpeaking = false;
          btnStop.disabled = true;
          updateSpeakEnabled();
          stopDots("Done.");
          notifyTicker(tickerController, {
            tickerId,
            text: tickerMsgStopped,
            ms: 2500,
            color: "var(--accent)",
          });
        };

        if (!audio) {
          isSpeaking = false;
          btnStop.disabled = true;
          updateSpeakEnabled();
          stopDots("Done.");
          notifyTicker(tickerController, {
            tickerId,
            text: tickerMsgStopped,
            ms: 2500,
            color: "var(--accent)",
          });
          return;
        }

        audio.addEventListener("ended", done);
        audio.addEventListener("error", done);
      })
      .catch(() => {
        if (currentAudio) cleanupAudio(currentAudio);
        currentAudio = null;

        isSpeaking = false;
        btnStop.disabled = true;
        updateSpeakEnabled();
        stopDots("Piper error - cannot speak.");
        notifyTicker(tickerController, {
          tickerId,
          text: tickerMsgError,
          ms: 3500,
          color: "#f87171",
        });
      });
  };

  const onStopClick = () => {
    stopPlayback({ silent: false });
  };

  // ===== Event Wiring =====
  // Attach primary action listeners for speak/stop.
  btnSay.addEventListener("click", onSpeakClick);
  btnStop.addEventListener("click", onStopClick);

  // ===== Lifecycle =====
  return {
    node,
    destroy() {
      // Remove observers, listeners, and playback resources.
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      detachWatchers();
      stopPlayback({ silent: true });
      if (dotTimer) clearInterval(dotTimer);

      btnSay.removeEventListener("click", onSpeakClick);
      btnStop.removeEventListener("click", onStopClick);
    },
  };
}
