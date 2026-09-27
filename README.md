# OmniChat — Multi-Agent & Multi-Attachment AI Platform

An all-in-one AI chat platform designed for personal use, featuring specialized agent plugins, heavy multi-attachment handling (photos, documents, PDFs, CSVs, code), smart multi-provider fallback cascading, and zero-retention privacy routing.

Built specifically to solve ChatGPT and Claude limitations around file uploads, multi-attachment context, and multi-provider redundancy.

---

## 🌟 Key Architecture & Capabilities

### 1. Smart Multi-Provider Fallback Cascade
The application prioritizes models in the following sequence:
1. **OpenAI (ChatGPT Primary)**: `gpt-5.4-mini` (or `gpt-5.4-nano` / `gpt-4o-mini`).
2. **Google Gemini (Backup 1)**: `gemini-2.5-flash` or `gemini-flash-latest` (1M+ context window, ultra-fast multimodal inference).
3. **NVIDIA NIM (Backup 2)**: `meta/llama-3.3-70b-instruct` / `nvidia/llama-3.1-nemotron-70b-instruct`.
4. **Groq LPU (Backup 3)**: `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` (500+ tokens/sec).

> **Transparent Telemetry:** If OpenAI is rate-limited (HTTP 429), quota-exceeded, or temporarily down, the app immediately and automatically routes to Gemini, NVIDIA, or Groq, displaying a clear note in the response header indicating which provider served your query.

### 2. Zero-Retention Privacy / Temporary Chat Mode 🔒
- **Gemini-Only Routing:** When Privacy Mode is toggled on, requests strictly bypass OpenAI and third-party loggers, routing exclusively through your paid Google Gemini key (which does not use customer prompts for model training).
- **Ephemeral Storage:** Conversations in Privacy Mode are never written to `localStorage` or persisted to history.

### 3. Unlimited Multi-Attachment Pipeline 📎
Overcomes attachment limits in ChatGPT/Claude:
- **Images:** PNG, JPG, WebP, GIF, SVG (instant thumbnail previews, fullscreen lightbox, multimodal vision encoding).
- **PDF Documents:** Client-side text parsing across multi-page documents, formatted into structured blocks for any LLM.
- **Data & Spreadsheets:** CSV, TSV, XLSX with automatic tabular extraction.
- **Code & Text:** Python, SQL, JS/TS, Markdown, JSON, YAML with line counts and syntax previews.
- **Workflow:** Drag & drop multiple files, paste from clipboard (`Ctrl+V`), and review staged attachments in a tray before sending.

---

## 🤖 Built-in Agent Plugins

Switch agents anytime using the pill selector in chat:

| Agent | Focus Area | Key Features |
|---|---|---|
| **KidStory** | Bedtime stories for sleep & reading skills | Gentle bedtime pacing, bold vocabulary highlights, word explorer, calming endings, **🔊 Read Aloud audio** |
| **StudyBuddy** | Concept & academic tutoring | Feynman technique, ELI5 analogies, LaTeX math rendering, check-for-understanding quizzes |
| **Worksheet** | Print-ready educational worksheets | Standardized printable layout (Name, Date, Score, Sections A-D), **🖨️ One-click Print / PDF Export**, separate answer key |
| **DataAnalyst** | BI, formulas & data science | Looker Studio calculated fields (`CASE`, `REGEXP`), Tableau LOD (`{FIXED}`), SQL window functions, CSV analysis |
| **Doctor** | Prescriptions & lab report decoder | Decodes doctor handwriting & Rx abbreviations (BID, PRN), lab values table (Normal/High/Low), **5 questions to ask your doctor** |
| **Psycho** | Emotional clarity & CBT reframing | Compassionate active listening, cognitive distortion identification, somatic grounding exercises (Box breathing, 5-4-3-2-1) |
| **Spiritual** | Life guidance & existential doubts | Bhagavad Gita (Karma Yoga), Stoicism (Dichotomy of control), Zen Buddhism, non-dogmatic life perspective |
| **LegalDocs** | Contracts, NDAs & leases | Identifies red flags, one-sided clauses, and plain-English obligation breakdowns |
| **FitnessCoach** | Workouts & nutrition | Hypertrophy splits, macro calculations, exercise form cues, recovery |
| **CodeArchitect** | Systems & full-stack development | TypeScript, Next.js, Python, zero-defect refactoring, architectural trade-offs |
| **GeneralAssistant** | Everyday tasks | All-purpose writing, brainstorming, and research |

---

## 🚀 Deployment Guide

### Deploying to Vercel (Recommended)
1. Push this repository to your GitHub/GitLab account.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. In **Project Settings > Environment Variables**, add:
   - `OPENAI_API_KEY`: Your OpenAI key
   - `GEMINI_API_KEY`: Your Google Gemini key (paid key recommended for zero retention)
   - `NVIDIA_API_KEY`: (Optional) Your NVIDIA NIM key
   - `GROQ_API_KEY`: (Optional) Your Groq API key
4. Click **Deploy**. Vercel will build the Next.js app automatically.

*(Note: If you prefer not to set server environment variables, you can also enter your API keys directly into the app's Settings modal in your browser. Keys are stored safely in your personal browser's `localStorage`.)*

### Deploying to Cloudflare (Pages / OpenNext)
1. In Cloudflare Dashboard, create a new Pages project pointing to your Git repository.
2. Framework preset: **Next.js**.
3. Under Environment Variables, add `OPENAI_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `GROQ_API_KEY`.
4. Deploy using standard Next.js adapter.

---

## 💻 Local Development

```bash
# Install dependencies (using Bun or npm)
bun install
# or: npm install

# Run development server
bun run dev
# or: npm run dev

# Open in browser
http://localhost:3000
```
