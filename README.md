<div align="center">

# 👓 VisionVoice

### **Real-Time Multimodal AI Visual Aid for the Visually Impaired**

[![Live Demo](https://img.shields.io/badge/Demo-visionvoiceai.vercel.app-7C3AED?style=for-the-badge&logo=vercel&logoColor=white)](https://visionvoiceai.vercel.app/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable_Offline-059669?style=for-the-badge&logo=pwa&logoColor=white)](https://visionvoiceai.vercel.app/)
[![CI](https://github.com/DevCodeHub99/vision-voice-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/DevCodeHub99/vision-voice-ai/actions/workflows/ci.yml)

[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node Test](https://img.shields.io/badge/node%3Atest-Zero_Dep-339933?logo=node.js&logoColor=white)](https://nodejs.org/api/test.html)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Free_Tier-7C3AED?logo=openai&logoColor=white)](https://openrouter.ai/)
[![Gemini](https://img.shields.io/badge/Gemini-3.8_Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)

</div>

---

## 📖 Overview

**VisionVoice** is an accessibility-first, privacy-focused Progressive Web Application (PWA) designed to empower visually impaired and low-vision individuals to perceive, navigate, and understand their environment. 

Using native browser media APIs, client-side pre-compression, and state-of-the-art multimodal vision models from **Google Gemini (AI Studio)**, **OpenRouter**, **Groq Cloud**, and **Rapid Router** (all offering free no-card API tiers), VisionVoice provides real-time natural language narrations and instant OCR text readout.

VisionVoice operates on a strict **Bring Your Own Key (BYOK)** model: **zero servers, zero databases, and zero tracking**. All images and API keys remain strictly on the user's device.

---

## 🏗️ Architecture & Data Flow

```mermaid
flowchart TD
    A["Camera Stream / Gallery Photo"] --> B["Canvas Downscaler (Max 1280px, JPEG 0.8)"]
    B --> C["aiService Unified Dispatcher"]
    
    C -->|"Primary Provider"| D{"Active Provider"}
    D -->|"Google Gemini"| F["Gemini API\n(Gemini 3.8 Flash / 3.1 Flash Lite)"]
    D -->|"OpenRouter (Free Tier)"| E["OpenRouter API\n(Auto Free / Ling / Gemma / Nemotron)"]
    D -->|"Groq Cloud (Free LPU)"| G1["Groq API\n(Qwen 3.8 27B / Muse Spark Open)"]
    D -->|"Rapid Router (Free Tier)"| G2["Rapid Router API\n(Gemma 4 31B / 26B Free)"]
    
    E -->|"Quota / Rate Limit Error"| G["Automatic Cross-Provider Failover"]
    F -->|"Quota / Rate Limit Error"| G
    G1 -->|"Quota / Rate Limit Error"| G
    G2 -->|"Quota / Rate Limit Error"| G
    G --> D
    
    E -->|"Success Payload"| H["Security Response Sanitizer"]
    F -->|"Success Payload"| H
    G1 -->|"Success Payload"| H
    G2 -->|"Success Payload"| H
    
    H --> I["Speech Synthesis (TTS Engine)"]
    H --> J["Animated Equalizer Wave UI"]
    H --> K["Tactile Haptic Feedback"]
```

---

## ✨ Key Capabilities & Features

### 🔐 Multi-Provider BYOK & Hardened Client Security
- **4 Free-Tier BYOK Providers (No Card Required)**: Seamlessly switch between **Google AI Studio (`AIzaSy...`)**, **OpenRouter (`sk-or-v1-...`)**, **Groq Cloud (`gsk_...`)**, and **Rapid Router (`sk-rr-v1-...`)**, with per-provider preset and custom model preferences.
- **Resilient Fallback Cascades**: If the primary model fails with a transient 500 error or rate limit, requests automatically cascade to fallback models and across any other configured providers.
- **Fail-Fast Client Protection**: Immediate rejection on HTTP 401/402/403 errors prevents 120-second request freezes.
- **Header-Based Authentication**: Google Gemini requests use official `x-goog-api-key` headers; API keys never appear in URL query parameters.
- **XOR Salt Obfuscation**: Keys saved to browser storage are XOR-obfuscated with a client salt to deter casual DevTools inspection.
- **Strict Content Security Policy (CSP)**: `connect-src` is strictly locked down to `'self'`, `https://openrouter.ai`, `https://generativelanguage.googleapis.com`, `https://api.groq.com`, and `https://rapidrouter.ai`, with `object-src 'none'` and `base-uri 'self'`.
- **Automated Error Redaction**: Global regex scrubbing masks key signatures (`sk-or-v1-***`, `sk-rr-v1-***`, `sk-***`, `AIzaSy***`, `gsk_***`, `key=***`, `Bearer ***`) across all console logs and UI error sheets.

### 🎙️ Hands-Free Multilingual Voice Commands
- **Continuous Voice Control**: Execute hands-free actions across 8 languages:
  - **`Describe`**: Activates environment scene description mode.
  - **`Read`**: Activates direct OCR text extraction mode.
  - **`Capture`**: Takes a high-resolution photo instantly.
  - **`Stop`**: Immediately interrupts ongoing speech narration.
  - **`Repeat`**: Replays the latest AI description.
- **Acoustic Feedback Loop Isolation**: Microphone input is automatically suppressed while speech synthesis is active, preventing the device from triggering its own voice commands.
- **Script-Aware Boundary Matching**: Uses script-specific boundary checks (`(^|\s|[.,!?;])...($|\s|[.,!?;])` for Latin/other scripts and substring checks for CJK) to eliminate false-positive triggers (e.g. *"already"* does not trigger *"read"*).

### ⚡ Crisp, Concise Descriptions & OCR
- **Scene Description (`Task.DESCRIBE`)**: Tuned to deliver **2 to 3 crisp, direct sentences max**. Highlights primary subjects, spatial layout, and immediate safety hazards or obstacles first without introductory filler.
- **Direct Text Reader (`Task.READ`)**: Extracts visible signs, documents, labels, and menus with zero preamble.
- **Client-Side Image Compression**: High-resolution smartphone frames (up to 48MP) are downscaled to 1280px at 0.8 JPEG quality before transmission, reducing network payload sizes by up to 90% and slashing latency.

### 📲 Progressive Web App (PWA) Offline Support
- **Offline Application Shell**: Service Worker (`sw.js`) provides Stale-While-Revalidate caching for static assets, enabling instant app launches without network connectivity.
- **Network Connectivity Monitor**: Real-time `online`/`offline` listener surfaces visual status badges and auditory alerts when connectivity fluctuates.
- **1-Tap PWA Install**: Automatically displays an **"Install App"** button in the header when the browser triggers `beforeinstallprompt`.
- **App Shortcuts**: Quick-launch actions in `manifest.json` allow opening directly into *"Describe Scene"* or *"Read Text"* from the mobile home screen.

### ♿ Universal Accessibility (WCAG 2.1 AA) & Ergonomics
- **Self-Healing Error Boundary**: Catches unhandled runtime exceptions, renders a high-contrast recovery screen, and announces the error via speech synthesis: *"VisionVoice encountered an unexpected problem. Tap the center of the screen to reload."*
- **Speech Narration Speed Control**: Customize voice speed from **0.75x to 1.5x** via the settings slider.
- **Large Touch Targets**: All interactive elements adhere to minimum $48\text{px}$ touch targets (`touch-action: manipulation`).
- **Tactile Shutter & Viewfinder Reticle**: Shutter button features dual glowing border rings and spring compression; center reticle aids low-vision framing.
- **High Contrast Focus Outlines**: Enhanced `:focus-visible` styling (`outline: 2px solid #a78bfa`) and Windows Forced Colors Mode support.

---

## ⌨️ Accessibility Keyboard Shortcuts

| Shortcut | Action | Context |
| :--- | :--- | :--- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Capture photo immediately | Camera mode |
| <kbd>D</kbd> | Switch to **Describe Scene** mode | Global |
| <kbd>R</kbd> | Switch to **Read Text / OCR** mode | Global |
| <kbd>U</kbd> | Switch to **Gallery Upload** mode | Global |
| <kbd>S</kbd> | Play / Pause voice narration | Active result |
| <kbd>V</kbd> | Toggle hands-free voice recognition | Global |
| <kbd>Esc</kbd> | Dismiss result sheet / close settings | Modals |

---

## 🤖 Supported Multimodal Models

VisionVoice is strictly designed for **multimodal vision tasks** (scene narration, obstacle/hazard detection, and high-precision OCR). Only models with confirmed `image` input capability (`input_modalities: ["image"]`) are included:

### OpenRouter (Free Multimodal Tier)
All preset OpenRouter models are 100% free (`$0` input / `$0` output tokens) and purpose-built for visual understanding:

| Model ID | Specialization | Role in VisionVoice | Live Status |
|---|---|---|---|
| **`openrouter/free`** *(Default)* | Auto Free Vision Router | Automatically filters and routes to the best active free model with image understanding. Never gets locked out by single-model rate limits. | 🟢 Active (HTTP 200) |
| **`inclusionai/ling-3.2-flash:free`** | Fast Free Vision | High-speed multimodal model with instant OCR text readout and spatial descriptions. | 🟢 Active (HTTP 200) |
| **`google/gemma-4-31b-it:free`** | High-Res Reasoning | Google DeepMind open-weights multimodal model; high visual fidelity for intricate spatial layouts. | 🟡 Active (Shared pool rate limits apply) |
| **`google/gemma-4-26b-a4b-it:free`** | Rapid Vision | Fast multimodal vision model optimized for real-time visual assistance. | 🟡 Active (Shared pool rate limits apply) |
| **`nvidia/nemotron-3.5-super-vl:free`** | Multimodal VL | Multimodal vision-language model for detailed scene & document analysis. | 🟢 Active (HTTP 200) |
| **`custom`** | User-Provided Vision Model | Enter any valid OpenRouter model ID (e.g. `inclusionai/ling-3.2-flash:free`). | Dependent on user ID |

> [!TIP]
> **Why no text-only models?** General text models (like standard Llama 3 8B or Mistral 7B) cannot process visual tokens and will return `400 Bad Request`. VisionVoice only connects to models that natively support image understanding.

### Google Gemini (AI Studio Free Tier — No Card)
* **`gemini-3.8-flash`** *(Recommended)*: High-intelligence multimodal Flash model with free-tier availability on Google AI Studio.
* **`gemini-3.1-flash-lite`**: Ultra-low-latency multimodal responses for immediate shutter turnaround.
* **`gemini-2.5-flash`**: Legacy compatibility alias.
* **`custom`**: Enter any custom Google AI Studio model identifier.

### Groq Cloud (Free LPU Tier — No Card)
* **`qwen/qwen3.8-27b`** *(Recommended)*: Active 27B multimodal model with strong OCR and scene narration on Groq LPUs.
* **`meta-models/muse-spark-open`**: Meta MoE multimodal reasoning model (limited preview on Groq).
* **`custom`**: Enter any valid Groq multimodal vision model ID.

### Rapid Router (Free Tier — 50 req/day, $0 Balance, No Card)
* **`google/gemma-4-31b-it:free`** *(Recommended)*: Zero-cost DeepMind multimodal vision model on Rapid Router.
* **`google/gemma-4-26b-a4b-it:free`**: Fast zero-cost multimodal model on Rapid Router.
* **`custom`**: Enter any Rapid Router vision model ID (use `:free` models for zero-balance requests).

---

## 📁 Repository Directory Structure

```text
vision-voice-ai/
├── components/
│   ├── BottomNav.tsx        # Accessible mode tablist & glowing tactile shutter
│   ├── CameraCapture.tsx    # Live WebRTC video feed, canvas downscaler & track guards
│   ├── ErrorBoundary.tsx    # Accessible React Error Boundary with vocalized reload
│   ├── Header.tsx           # Language picker, offline badge, PWA install & status pill
│   ├── ResultSheet.tsx      # Slide-up modal with 5-bar equalizer wave & Web Share
│   └── SettingsModal.tsx    # Multi-provider BYOK, per-provider model selector & speech rate
├── hooks/
│   ├── useCamera.ts         # Imperative camera handle & capture coordination
│   ├── useHaptics.ts        # Memoized navigator.vibrate tactile feedback
│   ├── useImageProcessing.ts# AI state machine & analysis orchestrator
│   ├── useSpeech.ts         # Speech synthesis with keep-alive heartbeat & speechRate
│   └── useVoiceCommands.ts  # Multilingual hands-free voice command recognizer
├── services/
│   ├── aiService.ts               # Unified provider dispatcher with cross-provider failover
│   ├── geminiService.ts           # Lightweight Google Gemini REST client (header auth)
│   ├── groqService.ts             # Groq Cloud free-tier vision client
│   ├── openAICompatibleService.ts # Shared OpenAI-compatible vision client with cascades
│   ├── openRouterService.ts       # OpenRouter free-tier vision client
│   └── rapidRouterService.ts      # Rapid Router free-tier vision client
├── utils/
│   ├── imageProcessor.ts    # Canvas downscaler (max 1280px) & JPEG 0.8 compressor
│   └── security.ts          # XOR key obfuscation, key sanitization & regex scrubbing
├── scripts/
│   └── run-tests.mjs        # Zero-dependency TypeScript + node:test runner
├── tests/
│   ├── aiService.test.ts          # Multi-provider routing & failover test suite
│   ├── constants.test.ts          # Free-tier model presets & prompt integrity tests
│   ├── errorBoundary.test.ts      # Error Boundary speech announcement test suite
│   ├── geminiService.test.ts      # Gemini header auth, fail-fast & cascade tests
│   ├── groqService.test.ts        # Groq vision API, fail-fast & cascade tests
│   ├── imageProcessor.test.ts     # Aspect ratio & downscaling calculation tests
│   ├── openRouterService.test.ts  # OpenRouter headers, cascades & 4xx fail-fast tests
│   ├── rapidRouterService.test.ts # Rapid Router headers, cascades & 4xx fail-fast tests
│   ├── security.test.ts           # XOR cipher, redaction regexes & text cleaner tests
│   └── voiceCommands.test.ts      # Multilingual command parser test suite (8 languages)
├── public/
│   ├── icon.svg             # High-contrast accessibility app icon
│   ├── manifest.json        # Standalone PWA configuration with app shortcuts
│   └── sw.js                # Service Worker for offline application shell caching
├── App.tsx                  # Root orchestrator, shortcuts & connectivity listener
├── constants.ts             # 8 languages, prompt templates, system instructions & models
├── index.css                # Tailwind CSS v4, safe area insets & focus-visible styles
├── index.html               # PWA shell, Content Security Policy (CSP) & permissions
├── index.tsx                # React 19 root bootstrap & Service Worker registration
├── package.json             # NPM dependencies, allowScripts & build commands
├── tsconfig.json            # Strict TypeScript configuration
├── tsconfig.test.json       # CommonJS test compilation configuration for node:test
├── types.ts                 # TypeScript type definitions and interfaces
├── vite.config.ts           # Vite build configuration with Tailwind v4 & React plugin
└── vite-env.d.ts            # Vite client environment type declarations
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20.0.0 or higher.
* **API Key**: A free-tier key (no card required) from [Google AI Studio](https://aistudio.google.com/app/apikey), [OpenRouter](https://openrouter.ai/keys), [Groq Console](https://console.groq.com/keys), or [Rapid Router](https://rapidrouter.ai).

### Installation

1. **Clone the repository:**
   ```bash
   git clone git@github.com:DevCodeHub99/vision-voice-ai.git
   cd vision-voice-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

4. **Configure your API Key:**
   - Click the **Setup Key** pill or **Settings gear icon** in the top right.
   - Choose your preferred free-tier provider (**Google Gemini**, **OpenRouter**, **Groq Cloud**, or **Rapid Router**), select or enter a custom model, paste your key, and tap **Save Settings**.

---

## 🧪 Testing & Verification

VisionVoice features a deterministic `node:test` suite with zero external test dependencies covering security, services, voice parsing, image processing, and error recovery:

```bash
# Run all unit and integration test suites
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript strict type-checking
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 🌐 Browser Compatibility

| Feature | Chrome / Edge | Safari (iOS / macOS) | Firefox | Samsung Internet |
| :--- | :---: | :---: | :---: | :---: |
| **WebRTC Camera (`getUserMedia`)** | ✅ Yes | ✅ Yes (14.3+) | ✅ Yes | ✅ Yes |
| **Speech Synthesis (TTS)** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Speech Recognition (Voice Commands)** | ✅ Yes | ⚠️ WebKit (limited) | ⚠️ Partial | ✅ Yes |
| **Haptic Feedback (`vibrate`)** | ✅ Yes (Android) | ❌ Unsupported by Apple | ✅ Yes (Android) | ✅ Yes |
| **PWA Installation & Offline** | ✅ Yes | ✅ Add to Home Screen | ✅ Yes | ✅ Yes |
| **Web Share API (`navigator.share`)** | ✅ Yes | ✅ Yes | ⚠️ Mobile only | ✅ Yes |

---

## 📄 License

This project is open-source under the terms of the [MIT License](LICENSE).

<div align="center">

Built with ❤️ for a more accessible, inclusive world.

</div>
