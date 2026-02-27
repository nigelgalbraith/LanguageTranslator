// ===== Imports =====
import { buildStatusTickerPane } from "../panes/StatusTickerPane.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildIntroCardPane } from "../panes/IntroCardPane.js";
import { createPageLifecycle } from "../core/pageLifecycle.js";
import { initThemeToggle } from "../utils/theme.js";
import { INTRO_TEXT } from "../../text/intro.js";
import { introCards } from "../../text/introCard.js";

// ===== State =====
const life = createPageLifecycle();
const TICKER_ID = "profile-main";

// ===== Exports =====
// Destroys all listeners for this page.
export function destroyPage() {
  life.destroy();
}

// ===== Lifecycle =====
function initPage() {
  const app = document.getElementById("app");
  if (!app) throw new Error("Missing #app root");

  destroyPage();

  document.title = "Language Translator";

  // Build page shell and header content.
  const appNode = document.createElement("div");
  appNode.className = "app";

  const header = document.createElement("header");
  header.className = "header-centered";

  const title = document.createElement("h1");
  title.textContent = "Language Translator";

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

  const profileLoaderWrapper = document.createElement("div");
  profileLoaderWrapper.className = "profile-loader-wrapper";

  const statusTicker = buildStatusTickerPane({
    messagesUrl: "data/messages.json",
    tickerId: TICKER_ID,
  });
  life.add(statusTicker.destroy);
  profileLoaderWrapper.appendChild(statusTicker.node);

  header.appendChild(title);
  header.appendChild(themeWrapper);
  header.appendChild(profileLoaderWrapper);

  // Build main content and language cards.
  const main = document.createElement("main");
  main.className = "split";
  main.id = "root";

  const introHero = document.createElement("section");
  introHero.className = "intro-hero";

  const intro = buildIntroPane({
    introKey: "home",
    introMap: INTRO_TEXT,
  });
  life.add(intro.destroy);

  const translatorGrid = document.createElement("div");
  translatorGrid.className = "translator-grid";

  Object.keys(introCards).forEach((cardKey) => {
    const cardPane = buildIntroCardPane({
      cardKey,
      cardsMap: introCards,
    });
    life.add(cardPane.destroy);
    translatorGrid.appendChild(cardPane.node);
  });

  introHero.appendChild(intro.node);
  introHero.appendChild(translatorGrid);

  main.appendChild(introHero);

  appNode.appendChild(header);
  appNode.appendChild(main);

  app.replaceChildren(appNode);
  initThemeToggle();
}

initPage();
