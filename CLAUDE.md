# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MediaGen** — A Next.js full-stack app for AI media generation (text-to-image, text-to-video, image-to-video) that integrates with **LM Studio** (prompt enhancement via OpenAI-compatible API) and **ComfyUI** (image/video generation via REST + WebSocket).

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
dev-all.bat      # Windows: launches LM Studio, ComfyUI, and Next.js together
```

No test framework is configured. The SQLite database (`/data/mediagen.db`) auto-initializes on first run via `getDb()` in `src/lib/db/index.ts`.

### Default Service URLs
- **LM Studio:** `http://localhost:1234` (OpenAI-compatible API)
- **ComfyUI:** `http://localhost:8188` (REST + WebSocket)
- No `.env` files — URLs and settings are persisted to localStorage via Zustand store

## Architecture

### Tech Stack
- **Next.js 16** (App Router) + React 19 + TypeScript (strict mode)
- **Tailwind CSS 4** + shadcn/ui (new-york style)
- **Zustand** for persistent settings (localStorage)
- **better-sqlite3** with WAL journaling for local data
- **Path alias:** `@/*` → `./src/*`

### Request Flow
All external service calls are proxied through Next.js API routes — the browser never calls LM Studio or ComfyUI directly (except WebSocket for real-time progress):

```
Browser ──HTTP──> /api/* routes ──HTTP──> LM Studio / ComfyUI
   └───────WebSocket (direct)──────────> ComfyUI (/ws?clientId=...)
```

### Key Directories
- `src/app/api/` — API routes proxying to ComfyUI and LM Studio, plus CRUD for workflows/generations
- `src/app/(generation)/` — Route group for the three generation mode pages
- `src/components/generation/` — Core generation UI (form orchestrator, prompt input, progress, output display)
- `src/lib/comfyui/` — ComfyUI HTTP client, WebSocket manager, workflow JSON validation & auto-detection
- `src/lib/lmstudio/` — LM Studio client with mode-specific system prompts for prompt enhancement
- `src/lib/db/` — SQLite singleton, schema DDL, CRUD for workflows and generations tables
- `src/lib/hooks/` — React hooks for generation orchestration, prompt enhancement, WebSocket progress
- `src/lib/store/` — Zustand settings store (persisted to localStorage as "mediagen-settings")
- `src/types/` — Shared TypeScript types (GenerationMode, GenerationStatus, WorkflowConfig, AppSettings)

### Database Schema (two tables)
- **workflows** — Stores uploaded ComfyUI API-format JSONs with input_mappings (node input → UI control) and output_node_id
- **generations** — Tracks each generation's status lifecycle (`idle → enhancing → queued → processing → completed/error`), prompts, params, and output files

### Generation Flow
1. User submits form → `useGeneration` hook orchestrates
2. Optional prompt enhancement via `/api/lmstudio/enhance`
3. Workflow JSON has parameters substituted via `workflow-utils.ts`
4. POST to `/api/comfyui/prompt` → receives `promptId`
5. WebSocket tracks real-time progress (node execution, percentage); falls back to polling `/api/comfyui/history/[promptId]` every 3s
6. Output files retrieved and displayed; generation record saved to SQLite

### Workflow Auto-Detection
When uploading ComfyUI workflow JSON (`workflow-utils.ts`), node types are scanned to auto-map UI controls:
- `CLIPTextEncode` → prompt/negative_prompt (heuristic: "bad"/"ugly" in text = negative)
- `KSampler`/`KSamplerAdvanced` → steps, cfg, seed, sampler, scheduler
- `EmptyLatentImage` → width, height
- `LoadImage` → image_upload
- `SaveImage`/`PreviewImage` → output node (image); `SaveAnimatedWebP`/`VHS_VideoCombine` → output node (video)

### Workflow Templates
Pre-built workflow templates in `src/lib/templates/index.ts` (e.g., SDXL, Flux.1) with difficulty levels, example use cases, required models, and pre-mapped inputs. Exported as `WORKFLOW_TEMPLATES`.

### Real-time Progress
- WebSocket provides node execution events and percentage progress; SSE also used
- Fallback: HTTP polling `/api/comfyui/history/[promptId]` every 3s when WebSocket unavailable
- Stall detection: 5 min timeout for images, 15 min for video
- Live preview blobs streamed from WebSocket; queue tracking via `queueRemaining`

### Image-to-Video Flow
Requires uploading an image to ComfyUI's `/upload/image` endpoint first. The returned `inputImageFilename` is stored in the generation record and injected into the `image_upload` input mapping.

### API Response Conventions
- API routes return JSON; errors use `{ error: string }` shape
- Status codes: 201 for create, 404 for not found, 500 for server errors
- List endpoints accept query params: `mode`, `limit`, `offset`, `category`

### Error Handling
- Root error boundary in `src/app/error.tsx` with reset
- Client-side feedback via `sonner` toast notifications
- WebSocket reconnection uses exponential backoff (max 10 attempts)

### Server Config
`next.config.ts` marks `better-sqlite3` and `ws` as `serverExternalPackages` to prevent client bundling. Image remote patterns allow localhost:8188 (ComfyUI).
