// ===== State =====
const FLASH_AUTOHIDE_MS = 2000;

// ===== Builders =====
function notifyTicker(tickerController, detail) {
  if (!tickerController || typeof tickerController.showTemporary !== "function") return;
  tickerController.showTemporary(detail || {});
}

function makeFlash(flashDiv) {
  return (msg) => {
    flashDiv.textContent = msg || "";
    flashDiv.classList.add("show");
    setTimeout(() => {
      flashDiv.classList.remove("show");
    }, FLASH_AUTOHIDE_MS);
  };
}

async function translateText(apiUrl, text, sourceLang, targetLang) {
  const body = {
    q: text,
    source: sourceLang || "en",
    target: targetLang || "es",
  };

  // Request translated text from the API endpoint.
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let errTxt = "";
    try {
      errTxt = await resp.text();
    } catch (_err) {
      errTxt = "";
    }
    throw new Error(`Translate HTTP ${resp.status}: ${errTxt}`);
  }

  const data = await resp.json();

  if (Array.isArray(data) && data.length && data[0].translatedText) return data[0].translatedText;
  if (data && data.translatedText) return data.translatedText;

  return String(data || "");
}

function readText(el) {
  if (!el) return "";
  if ("value" in el) return String(el.value || "");
  return String(el.textContent || "");
}

// ===== Exports =====
// Builds the Translate Preview pane and wires its behavior.
export function buildTranslatePreviewPane(options = {}) {
  const apiUrl = options.translateUrl || "/api/translate";
  const sourceElement = options.sourceElement || null;
  const targetId = options.targetId || "translated-text";
  const sourceLang = options.sourceLang || "en";
  const targetLang = options.targetLang || "es";

  const titleText = options.title || "Translation";
  const buttonLabel = options.buttonLabel || "Translate";
  const targetPlaceholder = options.targetPlaceholder || "Translated text will appear here...";

  const tickerController = options.tickerController || null;
  const tickerId = options.tickerId || null;
  const tickerGenerating = options.tickerGenerating || "Translating...";
  const tickerComplete = options.tickerComplete || "Translation ready.";
  const tickerError = options.tickerError || "Translation failed.";
  const msgBusy = options.msgBusy || "Already translating...";
  const msgEmpty = options.msgEmpty || "Nothing to translate";

  const targetElementRef = options.targetElementRef || null;

  // Build the translation pane UI.
  const node = document.createElement("div");
  node.className = "pane-translator-preview";

  const section = document.createElement("section");
  section.className = "pane pane--translator-preview";

  const h2 = document.createElement("h2");
  h2.className = "pane-title";
  h2.textContent = titleText;

  const actions = document.createElement("div");
  actions.className = "actions";

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.type = "button";
  btn.textContent = buttonLabel;

  const flashDiv = document.createElement("div");
  flashDiv.className = "flash";
  const flash = makeFlash(flashDiv);

  const target = document.createElement("div");
  target.className = "letter";
  target.id = targetId;
  target.contentEditable = "true";
  target.setAttribute("data-placeholder", targetPlaceholder);

  actions.appendChild(btn);
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  section.appendChild(target);
  node.appendChild(section);

  if (targetElementRef && typeof targetElementRef === "object") {
    targetElementRef.current = target;
  }

  let isBusy = false;
  let reqSeq = 0;

  const setEnabledFromSource = () => {
    const txt = readText(sourceElement);
    btn.disabled = isBusy || !String(txt).trim();
  };

  const onClick = () => {
    if (isBusy) {
      flash(msgBusy);
      notifyTicker(tickerController, { tickerId, text: msgBusy, ms: 1500, color: "#f97316" });
      return;
    }

    const text = readText(sourceElement);
    if (!String(text).trim()) {
      flash(msgEmpty);
      notifyTicker(tickerController, { tickerId, text: msgEmpty, ms: 2000, color: "#f97316" });
      setEnabledFromSource();
      return;
    }

    isBusy = true;
    btn.disabled = true;
    setEnabledFromSource();

    const mySeq = ++reqSeq;

    notifyTicker(tickerController, {
      tickerId,
      text: tickerGenerating,
      ms: 4000,
      color: "var(--accent)",
    });
    flash("Translating...");

    translateText(apiUrl, text, sourceLang, targetLang)
      .then((translated) => {
        if (mySeq !== reqSeq) return;
        target.textContent = translated || "";
        flash("Translation complete");
        notifyTicker(tickerController, {
          tickerId,
          text: tickerComplete,
          ms: 3000,
          color: "var(--accent)",
        });
      })
      .catch(() => {
        if (mySeq !== reqSeq) return;
        flash("Error during translation");
        notifyTicker(tickerController, {
          tickerId,
          text: tickerError,
          ms: 3500,
          color: "#f87171",
        });
      })
      .finally(() => {
        if (mySeq !== reqSeq) return;
        isBusy = false;
        setEnabledFromSource();
      });
  };

  const onSourceInput = () => {
    setEnabledFromSource();
  };

  const onSourceKeydown = (ev) => {
    if (!sourceElement) return;
    if (isBusy) return;
    if (!(ev.ctrlKey && ev.key === "Enter")) return;
    ev.preventDefault();
    onClick();
  };

  // ===== Event Wiring =====
  // Attach click and source-input listeners.
  btn.addEventListener("click", onClick);

  if (sourceElement) {
    sourceElement.addEventListener("input", onSourceInput);
    sourceElement.addEventListener("keyup", onSourceInput);
    sourceElement.addEventListener("change", onSourceInput);
    sourceElement.addEventListener("keydown", onSourceKeydown);
  }

  setEnabledFromSource();

  // ===== Lifecycle =====
  return {
    node,
    destroy() {
      // Remove event listeners created by this pane.
      btn.removeEventListener("click", onClick);
      if (sourceElement) {
        sourceElement.removeEventListener("input", onSourceInput);
        sourceElement.removeEventListener("keyup", onSourceInput);
        sourceElement.removeEventListener("change", onSourceInput);
        sourceElement.removeEventListener("keydown", onSourceKeydown);
      }
    },
  };
}
