# LanguageTranslator

LanguageTranslator is a self-hosted Docker stack for local translation and text-to-speech.

It combines:

- LibreTranslate (translation engine)
- Piper (text-to-speech)
- Nginx (UI + reverse proxy)

Everything runs locally. No external translation APIs are required.

---

## What It Does

- English ⇄ Spanish translation
- English ⇄ Chinese translation
- Optional text-to-speech output
- Single web interface
- Fully local processing

---

## Architecture

Services defined in `docker-compose.yml`:

- web (Nginx)
  - Serves the UI
  - Proxies API calls to backend services

- translate (LibreTranslate)
  - Handles translation
  - Loads: en, es, zh

- piper-en
- piper-es
- piper-zh
  - Separate text-to-speech containers per language

Nginx routes:

- /translate → LibreTranslate
- /piper/english/ → Piper EN
- /piper/spanish/ → Piper ES
- /piper/chinese/ → Piper ZH

---

## Requirements

- Docker
- Docker Compose v2

---

## Run

Start the stack using the helper script:

```bash
./manage.sh
