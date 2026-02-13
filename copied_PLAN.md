# AI Media Generation App — Implementation Plan

## Context
Build a local Next.js app that connects to **LM Studio** (prompt enhancement) and **ComfyUI** (image/video generation) to provide three generation modes: Text-to-Image, Text-to-Video, and Image-to-Video. ComfyUI workflows are fully configurable — users upload their own workflow JSON and map inputs to UI controls.

---

## Tech Stack
- **Next.js 14+ (App Router)** + TypeScript + Tailwind CSS + shadcn/ui
- **better-sqlite3** for local DB (workflows, generation history)
- **Zustand** for client state (settings)
- **LM Studio** via OpenAI-compatible API (`localhost:1234`)
- **ComfyUI** via REST + WebSocket (`localhost:8188`)

---

## Architecture Overview

```
Browser  ──► Next.js API Routes ──► LM Studio (prompt enhance)
   │                │
   │ WebSocket      └──► ComfyUI (generation)
   └──────────────────────► ComfyUI WS (progress)
```

- All HTTP calls to LM Studio / ComfyUI go through Next.js API proxy routes (avoids CORS, centralizes config)
- WebSocket connects directly from browser to ComfyUI for real-time progress (fire-and-forget, no CORS issue)

---

## Key Features

1. **Prompt Enhancer** — User types simple prompt → LM Studio rewrites it into a detailed, model-optimized prompt (different system prompts per mode)
2. **Flexible Workflow System** — Upload ComfyUI API-format JSON, auto-detect mappable inputs (CLIPTextEncode→prompt, KSampler→steps/cfg/seed, etc.), manually map any remaining inputs
3. **Real-time Progress** — WebSocket shows progress bar, current node, and live preview during generation
4. **Gallery** — Browse/filter/delete past generations with thumbnails
5. **Settings** — Configure backend URLs, default params, test connectivity

---

## Database (better-sqlite3)

**workflows** — id, name, description, category, api_json, input_mappings, output_node_id, timestamps
**generations** — id, mode, workflow_id, original_prompt, enhanced_prompt, negative_prompt, params, input_image_path, output_files, status, comfy_prompt_id, error, timestamps

---

## Folder Structure (key paths)

```
src/
├── app/
│   ├── layout.tsx                          # Root layout: sidebar, theme
│   ├── page.tsx                            # Dashboard
│   ├── globals.css                         # Dark theme CSS vars
│   ├── (generation)/
│   │   ├── text-to-image/page.tsx
│   │   ├── text-to-video/page.tsx
│   │   └── image-to-video/page.tsx
│   ├── gallery/page.tsx, [id]/page.tsx
│   ├── workflows/page.tsx, [id]/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── lmstudio/enhance/route.ts       # Prompt enhancement proxy
│       ├── comfyui/prompt/route.ts          # Queue workflow
│       ├── comfyui/history/[promptId]/route.ts  # Poll results
│       ├── comfyui/view/route.ts            # Stream output files
│       ├── comfyui/upload/route.ts          # Upload images
│       ├── comfyui/status/route.ts          # Connectivity check
│       ├── workflows/route.ts, [id]/route.ts
│       └── generations/route.ts, [id]/route.ts
├── components/
│   ├── ui/                                 # shadcn/ui primitives
│   ├── layout/                             # app-sidebar, header, theme-provider
│   ├── generation/                         # prompt-input, workflow-selector, params, progress, output, image-uploader
│   ├── gallery/                            # gallery-grid, gallery-card, media-viewer, filters
│   ├── workflows/                          # workflow-list, workflow-upload, workflow-editor, node-input-mapper
│   └── settings/                           # settings-form, connection-status
├── lib/
│   ├── comfyui/client.ts, types.ts, workflow-utils.ts, websocket.ts
│   ├── lmstudio/client.ts, types.ts, prompts.ts
│   ├── db/index.ts, schema.ts, workflows.ts, generations.ts
│   ├── hooks/use-comfyui-ws.ts, use-generation.ts, use-prompt-enhance.ts, use-settings.ts, use-workflows.ts, use-gallery.ts
│   ├── store/settings-store.ts, generation-store.ts
│   ├── utils.ts, constants.ts
└── types/generation.ts, workflow.ts, settings.ts
```

---

## Implementation Phases

### Phase 1: Scaffolding & Infrastructure
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- Install deps: `better-sqlite3`, `zustand`, `uuid`, `next-themes`
- `npx shadcn@latest init` + add ~18 UI components
- Create type definitions, DB schema, utility files
- Configure `next.config.ts` with `serverExternalPackages: ['better-sqlite3']`

### Phase 2: Layout, Navigation & Settings
- Root layout with dark theme, sidebar navigation, header
- Settings page with URL inputs, "Test Connection" buttons, defaults
- Zustand settings store persisted to localStorage

### Phase 3: Backend API Routes
- LM Studio client + enhance proxy route
- ComfyUI client + all proxy routes (prompt, history, view, upload, status)
- Workflow & generation DB operations + CRUD API routes

### Phase 4: Workflow Management UI
- `workflow-utils.ts` — JSON validation, auto-detect input mappings (CLIPTextEncode→prompt, KSampler→steps/cfg/seed, EmptyLatentImage→width/height, LoadImage→upload, SaveImage→output)
- Upload dialog with API-format validation
- Workflow editor page for mapping node inputs to UI controls

### Phase 5: Generation UI (core feature)
- ComfyUI WebSocket manager (client-side) + `useComfyuiWs` hook
- Prompt input with "Magic Enhance" button calling LM Studio
- Workflow selector, dynamic params panel, image uploader (for img2vid)
- Progress display (bar + current node + live preview)
- Output display (image/video viewer + download + "Send to img2vid")
- Three generation pages (thin wrappers passing `mode` to shared form)

### Phase 6: Gallery
- Grid view with thumbnails proxied through `/api/comfyui/view`
- Filter by mode/date, pagination
- Detail view with full-size media viewer
- Delete generations

### Phase 7: Dashboard & Polish
- Home page with quick-start cards, recent generations, connection status
- Loading states (`loading.tsx`), error boundaries (`error.tsx`)
- End-to-end testing with live backends

---

## Generation Data Flow (end-to-end)

1. User types prompt → clicks "Enhance" → `POST /api/lmstudio/enhance` → LM Studio rewrites it
2. User clicks "Generate" → hook establishes WebSocket, calls `POST /api/comfyui/prompt`
3. Server loads workflow JSON from DB, substitutes values via input mappings, POSTs to ComfyUI `/prompt`
4. WebSocket streams progress (execution_start → executing → progress → executed)
5. On completion, client calls `GET /api/comfyui/history/{promptId}` to get output files
6. Output rendered via `<img>` or `<video>` with `src="/api/comfyui/view?filename=..."`
7. Generation record saved to SQLite for gallery

---

## Verification
1. Start LM Studio with a model loaded, verify prompt enhancement works
2. Start ComfyUI, upload a simple txt2img workflow, verify generation completes
3. Test all three modes end-to-end
4. Verify gallery shows past generations with working thumbnails
5. Test workflow upload with auto-detection on various ComfyUI workflows
6. Test settings changes propagate correctly
