# J.A.R.V.I.S. — Voice Assistant Dashboard

> A JARVIS-inspired voice assistant that runs entirely in the browser: a sci-fi HUD, a voice-reactive 3D orb, spoken replies, and LLM-powered commands.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![Groq](https://img.shields.io/badge/LLM-Groq-F55036)
![License](https://img.shields.io/badge/license-MIT-green)

<p align="center">
  <img src="docs/demo.gif" alt="Demo: speaking a command and getting a spoken reply" width="800" />
</p>

<!-- TODO: record a 10–20s screen capture (voice command → orb reacts → spoken reply) and save it as docs/demo.gif -->

---

## ✨ Features

### 🔵 Voice-reactive core
- Animated central orb rendered with **Three.js** that responds to microphone input in real time.
- Sci-fi HUD layout with an activity log and interactive widgets.

### 🎙️ Voice and text input
- Speak commands through the browser microphone (**Web Speech API** speech recognition).
- Or type them into the activity log.
- Replies are spoken aloud using the browser's built-in **text-to-speech** voices.

### ⚡ Local commands (no API key needed)
| Command | What it does |
|---|---|
| Change theme | Switches the HUD colour scheme |
| Diagnostics | Shows a system diagnostics panel |
| Clear logs | Wipes the activity log |
| Red alert | Triggers red-alert mode |
| Self-destruct | Runs a (pretend 😄) self-destruct countdown |

<!-- TODO: replace the left column with the exact phrases your app listens for -->

### 🧠 AI mode (with a Groq API key)
- Answers general questions with an LLM served by **Groq** for low-latency responses.
- AI-assisted actions:
  - Search **Google** or **YouTube**
  - Open an unsent **Gmail** draft
  - Open a **WhatsApp** page

> The assistant never sends emails or messages on its own: it only opens a draft or page for you to review.

---

## 🏗️ How it works

```
 ┌──────────────┐    speech / text     ┌──────────────────┐
 │  Microphone  │ ───────────────────▶ │  Command router  │
 │  / Text box  │                      └────────┬─────────┘
 └──────────────┘                               │
                          matches a local command?
                     ┌──────────── yes ─────────┴──────── no ─────────┐
                     ▼                                                 ▼
          ┌─────────────────────┐                        ┌─────────────────────────┐
          │  Local handlers     │                        │  Groq LLM               │
          │  theme, diagnostics │                        │  answer or pick action  │
          │  alerts, logs       │                        │  (search / Gmail / WA)  │
          └──────────┬──────────┘                        └────────────┬────────────┘
                     └───────────────────────┬─────────────────────────┘
                                             ▼
                            ┌────────────────────────────────┐
                            │  Response: TTS voice + HUD log │
                            │  + orb animation               │
                            └────────────────────────────────┘
```

1. **Input:** speech is transcribed in the browser, or text is typed into the log.
2. **Routing:** known phrases are handled locally and instantly; anything else goes to the LLM.
3. **LLM:** Groq returns either a plain answer or a structured action (search, draft, open page).
4. **Output:** the reply is spoken via `speechSynthesis`, logged in the HUD, and animated on the orb.

---

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| UI | React + Vite |
| 3D / animation | Three.js |
| Speech in | Web Speech API (`SpeechRecognition`) |
| Speech out | Web Speech API (`speechSynthesis`) |
| Audio reactivity | Web Audio API (`AnalyserNode`) |
| LLM | Groq API |
| Linting | Oxlint |

<!-- TODO: remove any rows you don't actually use (e.g. Web Audio API) -->

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A Chromium-based browser (Chrome or Edge) for speech recognition
- *(Optional)* A free [Groq API key](https://console.groq.com/keys) for AI mode

### Install and run
```bash
git clone https://github.com/AnupamMI/<repo-name>.git
cd <repo-name>
npm install
```

Create a `.env` file in the project root:
```bash
cp .env.example .env
```
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Start the dev server:
```bash
npm run dev
```
Open the URL shown in the terminal (usually `http://localhost:5173`) and allow microphone access when prompted.

### Build for production
```bash
npm run build
npm run preview
```

---

## ⚠️ Notes and limitations

- **API key exposure:** Vite bundles any `VITE_*` variable into the client JavaScript, so the key is visible to anyone using a deployed build. Keep it for local use, or put a small backend/serverless proxy in front of Groq before deploying publicly.
- **Browser support:** Speech recognition works best in Chrome and Edge; Firefox does not support it. Text input works everywhere.
- **Voices:** Available TTS voices depend on your OS and browser.
- **Microphone:** Requires HTTPS or `localhost`.

---

## 🗺️ Roadmap

- [ ] Wake word ("Hey Jarvis") for hands-free activation
- [ ] Conversation memory across turns
- [ ] Backend proxy so the API key is not exposed
- [ ] More integrations (calendar, weather, system info)
- [ ] Offline mode with a local model / Whisper

<!-- Edit to match what you actually plan to build -->

---

## 📄 License

MIT. See [LICENSE](LICENSE).

## 🙌 Acknowledgements

Inspired by J.A.R.V.I.S. from the Iron Man films. This is a fan-made, non-commercial project.
