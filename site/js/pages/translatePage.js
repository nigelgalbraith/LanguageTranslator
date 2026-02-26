// ===== Imports =====
import { buildStatusTickerPane } from "../panes/StatusTickerPane.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildTextEntryPane } from "../panes/TextEntryPane.js";
import { buildTranslatePreviewPane } from "../panes/TranslatePreviewPane.js";
import { buildGeneratorPiperPane } from "../panes/GeneratorPiperPane.js";
import { buildButtonSwitchPane } from "../panes/ButtonSwitchPane.js";
import { createPageLifecycle } from "../core/pageLifecycle.js";
import { initThemeToggle } from "../utils/theme.js";
import { INTRO_TEXT } from "../../text/intro.js";

// ===== State =====
const life = createPageLifecycle();
const TICKER_ID = "profile-main";

async function loadLanguagesConfig() {
  // Fetch language-specific lane configuration.
  const resp = await fetch("data/languages.json");
  if (!resp.ok) throw new Error(`Failed to load languages.json: ${resp.status}`);
  return resp.json();
}

function buildLane(laneConfig, tickerController) {
  // Build one translation lane and all of its pane instances.
  const laneNode = document.createElement("div");
  laneNode.className = "split";
  laneNode.dataset.lane = "translate-lane";
  laneNode.dataset.title = laneConfig.title;

  const sourceRef = { current: null };
  const targetRef = { current: null };

  const entryPane = buildTextEntryPane({
    title: laneConfig.entry.title,
    textareaId: laneConfig.entry.textareaId,
    placeholder: laneConfig.entry.placeholder,
    elementRef: sourceRef,
  });

  const sourcePiperPane = buildGeneratorPiperPane({
    piperBase: laneConfig.sourcePiper.piperBase,
    voiceId: laneConfig.sourcePiper.voiceId,
    targetElement: sourceRef.current,
    tickerController,
    tickerId: TICKER_ID,
  });

  const previewPane = buildTranslatePreviewPane({
    translateUrl: laneConfig.preview.translateUrl,
    sourceElement: sourceRef.current,
    targetId: laneConfig.preview.targetId,
    sourceLang: laneConfig.preview.sourceLang,
    targetLang: laneConfig.preview.targetLang,
    title: laneConfig.preview.title,
    buttonLabel: laneConfig.preview.buttonLabel,
    targetPlaceholder: laneConfig.preview.targetPlaceholder,
    tickerController,
    tickerId: TICKER_ID,
    targetElementRef: targetRef,
  });

  const targetPiperPane = buildGeneratorPiperPane({
    piperBase: laneConfig.targetPiper.piperBase,
    voiceId: laneConfig.targetPiper.voiceId,
    targetElement: targetRef.current,
    tickerController,
    tickerId: TICKER_ID,
  });

  laneNode.appendChild(entryPane.node);
  laneNode.appendChild(sourcePiperPane.node);
  laneNode.appendChild(previewPane.node);
  laneNode.appendChild(targetPiperPane.node);

  return {
    node: laneNode,
    title: laneConfig.title,
    destroy() {
      try {
        entryPane.destroy();
      } catch (_err) {
        // ignore teardown failures
      }
      try {
        sourcePiperPane.destroy();
      } catch (_err) {
        // ignore teardown failures
      }
      try {
        previewPane.destroy();
      } catch (_err) {
        // ignore teardown failures
      }
      try {
        targetPiperPane.destroy();
      } catch (_err) {
        // ignore teardown failures
      }
    },
  };
}

// ===== Exports =====
// Destroys all listeners for this page.
export function destroyPage() {
  life.destroy();
}

// ===== Lifecycle =====
async function initPage() {
  const app = document.getElementById("app");
  if (!app) throw new Error("Missing #app root");

  destroyPage();

  const allLanguages = await loadLanguagesConfig();
  const params = new URLSearchParams(window.location.search);
  const langId = params.get("lang") || "es";
  const selected = allLanguages[langId] || allLanguages.es || Object.values(allLanguages)[0];

  if (!selected) throw new Error("No language config found");

  document.title = selected.title;

  // Build page shell and header content.
  const appNode = document.createElement("div");
  appNode.className = "app";

  const header = document.createElement("header");
  header.className = "header-centered";

  const title = document.createElement("h1");
  title.textContent = selected.title;

  const themeWrapper = document.createElement("div");
  themeWrapper.className = "theme-toggle-wrapper";

  const themeButton = document.createElement("button");
  themeButton.className = "theme-toggle";
  themeButton.type = "button";
  themeButton.setAttribute("aria-label", "Toggle light/dark mode");
  themeButton.setAttribute("aria-pressed", "false");
  themeButton.title = "Toggle light/dark mode";

  const themeIcon = document.createElement("span");
  themeIcon.className = "theme-toggle-icon";
  themeIcon.setAttribute("aria-hidden", "true");
  themeIcon.textContent = "☾";

  const themeText = document.createElement("span");
  themeText.className = "theme-toggle-text";
  themeText.textContent = "Theme";

  themeButton.appendChild(themeIcon);
  themeButton.appendChild(themeText);
  themeWrapper.appendChild(themeButton);

  const nav = document.createElement("nav");
  nav.className = "nav";

  const navLinks = document.createElement("div");
  navLinks.className = "nav-links";

  const backLink = document.createElement("a");
  backLink.href = "index.html";
  backLink.textContent = selected.backLinkLabel || "Back to Main Menu";

  navLinks.appendChild(backLink);
  nav.appendChild(navLinks);

  const profileLoaderWrapper = document.createElement("div");
  profileLoaderWrapper.className = "profile-loader-wrapper";

  const tickerController = {};
  const statusTicker = buildStatusTickerPane({
    messagesUrl: "data/messages.json",
    tickerId: TICKER_ID,
    controller: tickerController,
  });
  life.add(statusTicker.destroy);

  profileLoaderWrapper.appendChild(statusTicker.node);

  header.appendChild(title);
  header.appendChild(themeWrapper);
  header.appendChild(nav);
  header.appendChild(profileLoaderWrapper);

  // Build intro and translation lanes.
  const main = document.createElement("main");
  main.className = "split";
  main.id = "root";

  const intro = buildIntroPane({
    introKey: selected.introKey,
    introMap: INTRO_TEXT,
  });
  life.add(intro.destroy);
  main.appendChild(intro.node);

  const lanes = selected.lanes.map((lane) => buildLane(lane, tickerController));
  lanes.forEach((lane) => {
    life.add(lane.destroy);
  });

  const buttonSwitch = buildButtonSwitchPane({
    lanes: lanes.map((lane) => ({ node: lane.node, title: lane.title })),
    tickerController,
    tickerId: TICKER_ID,
  });
  life.add(buttonSwitch.destroy);

  main.appendChild(buttonSwitch.node);
  lanes.forEach((lane) => {
    main.appendChild(lane.node);
  });

  appNode.appendChild(header);
  appNode.appendChild(main);

  app.replaceChildren(appNode);
  initThemeToggle();
}

initPage();
