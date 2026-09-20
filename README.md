# ⚡ J.A.R.V.I.S. — Futuristic Neural Interface

An ultra-futuristic Iron Man J.A.R.V.I.S. AI Assistant powered by **Cerebras Ultra-Fast Inference (2,000+ tokens/sec)** and **NVIDIA NIM / Multimodal Vision**.

Built with an authentic Tony Stark holographic HUD, interactive Arc Reactor neural core visualizer, real-time AI performance telemetry, synthesized Web Audio SFX, Long-Term Neural Memory Matrix, and client-side document processing (PDF, DOCX).

---

## 🚀 Quick Start (Running in VS Code)

### Prerequisites
* **Node.js** (v18 or higher recommended). Download from [nodejs.org](https://nodejs.org/).

### 1. Open in VS Code
Extract the `.zip` file, open VS Code, and select **File -> Open Folder...** pointing to this directory.

### 2. Configure Environment Variables (`.env`)
All secret API credentials are kept exclusively inside your private `.env` file (which is protected by `.gitignore`):

```env
PORT=3000
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=llama-3.3-70b
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
```

> 🔒 **Security Notice:** API keys are never exposed in frontend code or Git commits. All AI calls are securely proxied through the local server.

### 3. Start the Server
Open the integrated terminal in VS Code (`Ctrl + ~` or `Cmd + ~`) and run:

```bash
node server.js
```
*(Zero `npm install` needed! The server is built 100% with native Node.js libraries so it launches instantly with zero external dependencies.)*

### 4. Open in Your Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛡️ Supported AI Providers

1. **Cerebras Wafer-Scale AI Engine** *(Active Primary — Blazing Speed)*:
   * **Endpoint:** `https://api.cerebras.ai/v1/chat/completions`
   * **Default Model:** `llama-3.3-70b` (or `llama3.1-8b`, `qwen-3.8-27b`)
   * **Speed:** 2,000+ tokens per second wafer-scale inference for instantaneous responses.
   * **Account Setup:** Free trial on [cloud.cerebras.ai](https://cloud.cerebras.ai).

2. **NVIDIA NIM & Multimodal Vision** *(Secondary / Vision Auto-Routing)*:
   * **Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
   * **Default Model:** `nvidia/nemotron-3-ultra-550b-a55b`
   * **Multimodal Vision:** `meta/llama-3.2-11b-vision-instruct` (auto-routed whenever images are uploaded).

3. **KIE.AI (GPT-6 Astra)** *(Secondary Gateway)*:
   * **Endpoint:** `https://api.kie.ai/codex/v1/responses`
   * **Model:** `gpt-6-astra`

You can change or override settings anytime inside the UI via the **Settings (⚙️)** panel.

---

## 🌟 Key Features

* **Long-Term Neural Memory Matrix (🧠 MEMORY):**
  * Persistent memory layer stored in core storage that survives conversation deletion, session switches, and purges.
  * Tell Jarvis in natural language (e.g. *"Remember that..."*, *"Update memory:..."*, *"Forget that..."*).
  * Interactive Neural Memory Matrix modal to review, manually add, delete, or clear stored memories.
  * Stored facts and user preferences are automatically recalled across all future conversations.
* **Cerebras Ultra-Fast Streaming:** Sub-second streaming output clocked at over 2,000 tokens/sec.
* **Fullscreen Cinema Hologram Mode (🖥️ HOLOGRAM / Alt+F):** Immersive distraction-free HUD mode with amplified glowing energy fields, anamorphic edge flares, and a floating quick-exit pill.
* **Document & Code File Inspection (📎 File Upload):** Attach or drag-and-drop code or data files (`.py`, `.js`, `.json`, `.csv`, `.md`, `.txt`, `.pdf`, `.docx`). Jarvis inspects and references the file contents directly.
* **Export PDF Report:** 1-click generation of styled conversation dossiers formatted for presentation.
* **Mission Archives // Multi-Session Drawer (🗂️ SESSIONS):** Slide-out holographic drawer allowing you to create new sessions, switch between past conversations, search history, and delete or purge sessions.
* **Holographic Arc Reactor HUD:** Interactive HTML5 `<canvas>` with rotating concentric azimuth rings, pulsing core, and shockwave reactivity.
* **Voice Capabilities (Speech-to-Text & Text-to-Speech):**
  * Click the microphone button to dictate commands by voice.
  * Jarvis speaks replies aloud (Default: **US-Andrew English (United States)**) with live waveform visualization.
* **Session Log Export:** 1-click download of your entire conversation history as Markdown (`.md`).

---

## 📁 Project Architecture

```
jarvis-ai-assistant/
├── server.js              # Native Node.js streaming proxy & secure static server
├── package.json           # Project manifest & start scripts
├── .env                   # Secret environment variables (ignored by git)
├── .env.example           # Safe environment variables template for repository
├── .gitignore             # Git ignore file protecting .env, logs, and system files
├── README.md              # Documentation & setup guide
└── public/
    ├── index.html         # Iron Man holographic HUD interface
    ├── style.css          # Sci-Fi theme stylesheet & mobile responsive rules
    ├── app.js             # Client application logic, PDF export & SSE streaming
    ├── arc-reactor.js     # Canvas Arc Reactor core animation & starfield
    ├── jarvis-audio.js    # Web Audio API sound synthesizer + Voice TTS/STT
    └── vendor/            # Offline vendor libraries (PDF.js, JSZip, jsPDF)
```
