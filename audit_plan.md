# OmniChat — Project Audit & Remediation Plan

**Audit date:** 2026-08-02
**Scope:** Full codebase (`src/`, configs, docs), plus build/type-check verification.
**Status at audit:** ✅ `tsc --noEmit` clean (exit 0) · ✅ `next build` clean (Next 16.3.6 + Turbopack).

---

## 1. Executive Summary

OmniChat is a Next.js 16 (App Router, Turbopack) + React 19 + TypeScript client-side AI chat app with 17 specialized "agent" personas, a 4-tier provider fallback cascade (OpenAI → Gemini → NVIDIA → Groq), a "Privacy/Zero-Retention" mode, and an unlimited multi-attachment pipeline (images, PDFs, CSV, code).

The code is **clean, well-typed, and builds successfully**. The architecture is sound for a personal tool. The audit found **no compile-time issues**, but surfaced **1 high-severity security gap**, several **medium-severity correctness bugs** (two of which undermine advertised features), and a set of **maintainability/tooling gaps** (no tests, no linter, stale docs).

Nothing here blocks local/personal use. The high-severity item (unauthenticated billable endpoint) matters **only if deployed publicly with server-side API keys**.

---

## 2. Project Overview

| Aspect | Detail |
|---|---|
| Framework | Next.js 16.3.6 (App Router, Turbopack), React 19.3, TypeScript 7.0.2 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), custom `globals.css` |
| Rendering | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` |
| PDFs | `pdfjs-dist` (client-side, worker from unpkg CDN) |
| Storage | Browser `localStorage` only (`src/lib/storage.ts`) |
| Backend | 2 route handlers: `/api/chat` (orchestrator), `/api/models` (key test) |
| Agents | 17 personas defined in `src/lib/agents.ts` |
| Providers | OpenAI, Google Gemini, NVIDIA NIM, Groq LPU |
| Tests/Lint/CI | **None** (`package.json` has only `dev`/`build`/`start`) |

### What's working well
- **Type safety:** strict TS, passes `tsc --noEmit` and full production build.
- **Separation of concerns:** `types/`, `lib/` (agents, providers, attachments, storage, models), `components/`.
- **Fallback cascade + telemetry:** thoughtful provider chain with per-attempt failure logging surfaced via `X-Fallback-Note` header (`src/app/api/chat/route.ts`).
- **Privacy mode** correctly short-circuits to a Gemini-only chain server-side and never persists temporary sessions (`src/lib/storage.ts:52-54`).
- **UX features:** streaming w/ abort, markdown+KaTeX+GFM, print/PDF export, Web Speech read-aloud, drag-drop/paste multi-attach tray, lightweightbox image preview.

---

## 3. Findings by Severity

Legend — **C** Critical, **H** High, **M** Medium, **L** Low, **I** Info.

### 🔴 High

#### H1 — Unauthenticated, unthrottled `/api/chat` spends real money (Security)
- **Where:** `src/app/api/chat/route.ts:36-67` (key resolution), route handler has no auth.
- **Issue:** When the client omits a key, the server falls back to `process.env.*_API_KEY`. If deployed to Vercel/Cloudflare with server env keys set (the documented path in `README.md`/`deploy.md`), **anyone** who finds the URL can drive unlimited billable completions. There is no authentication, rate limiting, origin check, or spend cap.
- **Impact:** Financial abuse / resource exhaustion on a public deployment.
- **Fix:** Add authentication (password / basic auth / signed token gate) and per-IP rate limiting on `/api/chat` and `/api/models`; optionally a server-side spend/usage guard. If no auth is desired, document prominently that server keys must **not** be set (client-only keys), or protect the deployment (Vercel Password Protection, private network).

### 🟠 Medium

#### M1 — Multi-turn attachment context is silently dropped
- **Where:** `src/app/page.tsx:221-232`.
- **Issue:** `formattedHistory` only formats attachments (images/extracted text) for the **last** user message. Every earlier message is sent as `content` only, so previously uploaded images/PDFs/CSVs vanish from the model's context.
- **Impact:** "Follow-up questions about my earlier upload" (a headline use case) lose the attachment. Undermines the multi-attachment selling point across turns.
- **Fix:** Retain and re-serialize each historical message's attachments (e.g., re-inject `formatUserMessageWithAttachments` per message), accepting the token/multimodal cost, or downsample prior images.

#### M2 — XLSX / .xls parsing is effectively broken
- **Where:** `src/lib/attachments.ts:126-142` (uses `FileReader.readAsText` for all non-image/non-PDF files).
- **Issue:** XLSX is a zipped binary and .xls a compound-file binary; reading them as text yields mojibake, not cell data. CSV/TSV are fine. This contradicts `README.md`/`deploy.md` claims of "CSV, TSV, XLSX with automatic tabular extraction."
- **Impact:** Advertised spreadsheet support doesn't actually work for real Excel files.
- **Fix:** Add a real parser (e.g., SheetJS `xlsx`) for `.xlsx`/`.xls`, **or** explicitly restrict the files to what's supported (CSV/TSV) and update docs/`accept` in `ChatInput.tsx:254`.

#### M3 — Default OpenAI model IDs may be invalid; fallback is incomplete
- **Where:** `src/lib/models.ts:5-21`, `src/lib/storage.ts:11-12` (`gpt-5.4-mini`, `gpt-5.4-nano`), fallback only for mini at `src/app/api/chat/route.ts:140-157`.
- **Issue:** `gpt-5.4-mini`/`gpt-5.4-nano` are not standard public OpenAI model IDs. The route hard-codes a fallback `gpt-5.4-mini → gpt-4o-mini`, but (a) there is **no** equivalent fallback for `gpt-5.4-nano`, and (b) none runs when the model is chosen via `modelOverride`. If the IDs are wrong, the primary OpenAI tier always 404s.
- **Impact:** Silent reliance on fallback, or failed requests depending on selected model.
- **Fix:** Verify current valid IDs against the OpenAI API; generalize the "model not provisioned → try a known-good model" logic to apply to **any** selected OpenAI model, not just `gpt-5.4-mini`.

### 🟡 Low

#### L1 — Fragile SSE stream parser (dead/unsafe fall-through)
- **Where:** `src/app/page.tsx:303-349`.
- **Issue:** Any non-`data:` non-empty line hits the `else` branch, appends the **entire raw chunk** (not the line) and `break`s — corrupting output and truncating the stream. All four providers currently emit only `data:` lines, so it's dormant, but an SSE comment/keep-alive would trigger it.
- **Fix:** Remove/guard the fall-through (treat unknown lines as ignorable, like blank lines).

#### L2 — PDF handling: silent 15-page cap + CDN worker dependency
- **Where:** `src/lib/attachments.ts:88` (page cap), `:84` (worker from `unpkg.com`).
- **Issue:** Pages beyond 15 are dropped with no user notice; the `pdf.worker` is fetched from unpkg at runtime (availability/version-path coupling).
- **Fix:** Bundle the worker locally (copy from `pdfjs-dist` into `public/` and reference it); surface "showing first 15 of N pages" to the user.

#### L3 — Inconsistent provider parameters
- **Where:** `src/lib/api-providers.ts` — `temperature`/`maxTokens` sent for NVIDIA/Groq only; OpenAI/Gemini ignore them.
- **Fix:** Apply `temperature`/`maxTokens` consistently (or pass them through for all providers).

#### L4 — Stale / inconsistent documentation
- **Where:** `README.md` (~11 agents) vs `deploy.md` (17) vs code (**17** in `src/lib/agents.ts`); `layout.tsx:7` metadata lists only 7 agents.
- **Issue:** The 6 "new daily" agents (email, finance, chef, travel, career, viral) are absent from `README.md`. Agent tables disagree.
- **Fix:** Regenerate agent docs from `AGENTS`; reconcile counts and names.

#### L5 — Unused dependencies
- **Where:** `package.json:15,27` — `clsx`, `tailwind-merge`.
- **Issue:** Declared but never imported anywhere.
- **Fix:** Remove, or introduce a `cn()` helper if wanted for future styling.

#### L6 — Accessibility / UX polish
- `alert()`/`confirm()` (`ChatMessage.tsx:96,128`, `Sidebar.tsx:167`); modals (`SettingsModal`, image lightbox) lack focus-trap and `Esc`-to-close; `scrollbar-thin`/`scrollbar-thumb-*` utility classes aren't standard Tailwind v4 and are redundant with the custom scrollbar CSS already in `globals.css:26-39` (harmless no-ops).
- **Fix:** Replace `alert/confirm` with inline UI; add `Esc`/focus handling to modals; drop redundant scrollbar utilities.

#### L7 — Dead config / body-size limits
- **Where:** `next.config.mjs:5-8` sets `experimental.serverActions.bodySizeLimit: 30mb`, but the app uses **no server actions** (uploads go through `fetch('/api/chat')`).
- **Issue:** Config is inert; the route handler's effective body limit isn't configured here. Large base64 image batches may hit platform limits.
- **Fix:** Remove the dead block or replace with the correct App Router route body-size setting; document expected max attachment size.

#### L8 — Loose/unusual dependency versions
- `next@^16.3.6`, `react@^19.3.0`, `typescript@^7.0.2`, `lucide-react@^1.48.0`. A `bun.lock` pins the tree, but ranges are loose and some majors are unusual for their ecosystems.
- **Fix:** Prefer exact pins + committed lockfile policy + periodic `audit`/dependency review.

### ℹ️ Info
- Per-token `setState` maps over all messages (`page.tsx:316-328`) — fine at current scale; noted for future optimization.
- The streaming "direct text" fall-through (L1) is currently unreachable with today's providers.

---

## 4. Remediation Plan (Recommended Order)

Work is grouped into phases; each item lists effort and the finding ID it resolves.

### Phase 0 — Security first (block public deploy until H1 done)
| # | Task | Findings | Effort |
|---|---|---|---|
| 0.1 | Add auth + per-IP rate limiting to `/api/chat` & `/api/models`; optional spend guard. Decide the trust model (client-only keys vs. protected server keys). | H1 | M |
| 0.2 | Make privacy enforcement server-authoritative (don't trust request body for `privacyMode` if server keys can reach OpenAI); drop redundant `x-*-key` headers when `userKeys` already sent. | H1/S2 | S |

### Phase 1 — Correctness (restore advertised behavior)
| # | Task | Findings | Effort |
|---|---|---|---|
| 1.1 | Fix multi-turn attachment context in `formattedHistory`. | M1 | M |
| 1.2 | Add real `.xlsx/.xls` parsing **or** restrict supported types + update docs/`accept`. | M2 | M |
| 1.3 | Verify OpenAI model IDs; generalize the "not-provisioned → known-good" fallback to all selected OpenAI models. | M3 | M |
| 1.4 | Harden SSE parser (drop unsafe fall-through); bundle PDF worker + surface page truncation. | L1, L2 | S |

### Phase 2 — Maintainability & tooling
| # | Task | Findings | Effort |
|---|---|---|---|
| 2.1 | Add ESLint (`next lint` config + the existing disable comments become meaningful), fix a smoke test (e.g., provider-key resolution + attachment formatting), and wire a CI job running `tsc --noEmit`, `lint`, `test`, `build`. | Q1 | M |
| 2.2 | Regenerate/extend agent documentation; reconcile README/deploy/layout counts; remove unused `clsx`/`tailwind-merge` or add a `cn()` helper. | L4, L5 | S |
| 2.3 | Clean dead `next.config.mjs` block; define expected max attachment size / route body limit. | L7 | S |
| 2.4 | Consistent `temperature/maxTokens` across providers. | L3 | S |

### Phase 3 — UX/A11y & hygiene (nice-to-have)
| # | Task | Findings | Effort |
|---|---|---|---|
| 3.1 | Replace `alert/confirm` with inline UI; add focus-trap + `Esc` to `SettingsModal` and image lightbox; remove redundant scrollbar utilities. | L6 | M |
| 3.2 | Dependency pinning/audit policy; SVG-image guard before sending to vision models. | L8, F7 | S |

---

## 5. Verification Performed
- `./node_modules/.bin/tsc --noEmit` → **pass** (0 errors).
- `npx next build` → **pass** (compiles, TypeScript check passes, 4 static routes generated, 2 dynamic API routes).
- Dependency-usage scan: `clsx`/`tailwind-merge` unused; no hardcoded secrets outside placeholders; no TODO/FIXME markers.
- Grep/read of all 17 source files (8 components, 2 route handlers, 5 lib modules, types, layout, page).

## 6. Re-verification Checklist (after remediation)
- [ ] `tsc --noEmit` and `next build` still pass.
- [ ] `/api/chat` rejects unauthenticated/over-quota requests (H1).
- [ ] Follow-up question on an earlier-attached image/PDF retains context (M1).
- [ ] A real `.xlsx` renders readable cell data, or is cleanly rejected with a clear message (M2).
- [ ] Selecting any OpenAI model gracefully falls back on 404 (M3).
- [ ] SSE stream with an injected comment line does not corrupt/truncate output (L1).
- [ ] A 30-page PDF notifies "showing first 15 pages"; PDF worker loads without external CDN (L2).
- [ ] CI runs type-check + lint + tests + build (Q1).
