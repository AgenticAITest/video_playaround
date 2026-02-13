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

**workflows** table:
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT | Workflow display name |
| description | TEXT | User description |
| category | TEXT | `text-to-image` / `text-to-video` / `image-to-video` |
| api_json | TEXT | Full ComfyUI API-format workflow JSON |
| input_mappings | TEXT | JSON array mapping node inputs → UI controls |
| output_node_id | TEXT | Node ID that produces final output |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**generations** table:
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| mode | TEXT | `text-to-image` / `text-to-video` / `image-to-video` |
| workflow_id | TEXT | FK to workflows |
| original_prompt | TEXT | User's raw prompt |
| enhanced_prompt | TEXT | LM Studio enhanced prompt (nullable) |
| negative_prompt | TEXT | Negative prompt |
| params | TEXT | JSON of generation params (width, height, steps, cfg, seed) |
| input_image_path | TEXT | For image-to-video (nullable) |
| output_files | TEXT | JSON array of output file references |
| status | TEXT | idle/enhancing/queued/processing/completed/error |
| comfy_prompt_id | TEXT | ComfyUI tracking ID |
| error | TEXT | Error message (nullable) |
| created_at | TEXT | ISO timestamp |
| completed_at | TEXT | ISO timestamp (nullable) |

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                              # Root layout: sidebar, theme provider
│   ├── page.tsx                                # Dashboard with quick-start cards
│   ├── globals.css                             # Dark theme CSS variables
│   │
│   ├── (generation)/                           # Route group for generation modes
│   │   ├── layout.tsx                          # Shared generation layout
│   │   ├── text-to-image/page.tsx
│   │   ├── text-to-video/page.tsx
│   │   └── image-to-video/page.tsx
│   │
│   ├── gallery/
│   │   ├── page.tsx                            # Grid view of past generations
│   │   └── [id]/page.tsx                       # Single generation detail view
│   │
│   ├── workflows/
│   │   ├── page.tsx                            # List/upload workflows
│   │   └── [id]/page.tsx                       # Workflow input mapping editor
│   │
│   ├── settings/page.tsx                       # Backend URLs, defaults, connectivity
│   │
│   └── api/
│       ├── lmstudio/
│       │   └── enhance/route.ts                # POST: prompt enhancement proxy
│       │
│       ├── comfyui/
│       │   ├── prompt/route.ts                 # POST: queue workflow on ComfyUI
│       │   ├── history/[promptId]/route.ts     # GET: poll generation status
│       │   ├── view/route.ts                   # GET: stream output files (images/videos)
│       │   ├── upload/route.ts                 # POST: upload input images
│       │   ├── status/route.ts                 # GET: connectivity check
│       │   └── models/route.ts                 # GET: available node types
│       │
│       ├── workflows/
│       │   ├── route.ts                        # GET: list, POST: create
│       │   └── [id]/route.ts                   # GET/PUT/DELETE single workflow
│       │
│       └── generations/
│           ├── route.ts                        # GET: list (paginated), POST: save
│           └── [id]/route.ts                   # GET/DELETE single generation
│
├── components/
│   ├── ui/                                     # shadcn/ui primitives (~18 components)
│   │
│   ├── layout/
│   │   ├── app-sidebar.tsx                     # Main navigation sidebar
│   │   ├── header.tsx                          # Top header with breadcrumbs
│   │   └── theme-provider.tsx                  # next-themes dark mode provider
│   │
│   ├── generation/
│   │   ├── prompt-input.tsx                    # Textarea + "Magic Enhance" button
│   │   ├── workflow-selector.tsx               # Dropdown to pick workflow per mode
│   │   ├── generation-params.tsx               # Dynamic params from workflow mappings
│   │   ├── image-uploader.tsx                  # Drag-and-drop for image-to-video
│   │   ├── progress-display.tsx                # Real-time progress bar + node info
│   │   ├── output-display.tsx                  # Image/video viewer + download
│   │   └── generation-form.tsx                 # Orchestrates the full generation form
│   │
│   ├── gallery/
│   │   ├── gallery-grid.tsx                    # Responsive thumbnail grid
│   │   ├── gallery-card.tsx                    # Single generation card
│   │   ├── gallery-filters.tsx                 # Filter by mode/date
│   │   └── media-viewer.tsx                    # Full-screen image/video viewer
│   │
│   ├── workflows/
│   │   ├── workflow-list.tsx                   # Table of saved workflows
│   │   ├── workflow-upload.tsx                 # Upload JSON dialog + validation
│   │   ├── workflow-editor.tsx                 # Full input mapping editor
│   │   └── node-input-mapper.tsx               # Map single node input → UI control
│   │
│   └── settings/
│       ├── settings-form.tsx                   # URL inputs + defaults form
│       └── connection-status.tsx               # Green/red connectivity indicator
│
├── lib/
│   ├── comfyui/
│   │   ├── client.ts                           # Server-side HTTP client for ComfyUI
│   │   ├── types.ts                            # ComfyUI API request/response types
│   │   ├── workflow-utils.ts                   # Parse JSON, auto-detect mappings, fill values
│   │   └── websocket.ts                        # Client-side WebSocket connection manager
│   │
│   ├── lmstudio/
│   │   ├── client.ts                           # Server-side LM Studio HTTP client
│   │   ├── types.ts                            # OpenAI-compat types
│   │   └── prompts.ts                          # System prompts per generation mode
│   │
│   ├── db/
│   │   ├── index.ts                            # SQLite initialization
│   │   ├── schema.ts                           # Table definitions + migrations
│   │   ├── workflows.ts                        # Workflow CRUD operations
│   │   └── generations.ts                      # Generation CRUD operations
│   │
│   ├── hooks/
│   │   ├── use-comfyui-ws.ts                   # WebSocket progress tracking
│   │   ├── use-generation.ts                   # Full generation flow orchestration
│   │   ├── use-prompt-enhance.ts               # Prompt enhancement hook
│   │   ├── use-settings.ts                     # Settings read/write
│   │   ├── use-workflows.ts                    # Workflow CRUD hook
│   │   └── use-gallery.ts                      # Gallery with pagination
│   │
│   ├── store/
│   │   ├── settings-store.ts                   # Zustand + localStorage persist
│   │   └── generation-store.ts                 # Active generation state
│   │
│   ├── utils.ts                                # cn(), formatDate(), etc.
│   └── constants.ts                            # Default settings, app constants
│
└── types/
    ├── generation.ts                           # GenerationMode, GenerationStatus, etc.
    ├── workflow.ts                              # WorkflowConfig, InputMapping, etc.
    └── settings.ts                             # AppSettings interface
```

---

## API Route Details

### POST `/api/lmstudio/enhance`
- **Input**: `{ prompt: string, mode: GenerationMode }`
- **Flow**: Selects mode-specific system prompt → calls LM Studio `/v1/chat/completions` → returns enhanced prompt
- **Fallback**: If LM Studio unreachable, returns 503 with null enhanced prompt (UI uses original)

### POST `/api/comfyui/prompt`
- **Input**: `{ workflowId, prompt, negativePrompt, params, inputImageFilename?, clientId }`
- **Flow**: Loads workflow from DB → deep-clones API JSON → substitutes values via input mappings → POSTs to ComfyUI `/prompt` → saves generation record → returns `{ promptId, generationId }`

### GET `/api/comfyui/history/[promptId]`
- **Flow**: Fetches ComfyUI `/history/{promptId}` → parses output files → updates generation record → returns results

### GET `/api/comfyui/view`
- **Query**: `?filename=...&subfolder=...&type=output`
- **Flow**: Streams binary response from ComfyUI `/view` with proper content-type headers

### POST `/api/comfyui/upload`
- **Input**: `multipart/form-data` with `image` field
- **Flow**: Forwards to ComfyUI `/upload/image` → returns `{ name, subfolder, type }`

---

## Workflow Auto-Detection Logic

When a user uploads a ComfyUI workflow JSON, `workflow-utils.ts` scans for known node types:

| Node `class_type` | Auto-mapped UI field |
|---|---|
| `CLIPTextEncode` | prompt or negative_prompt |
| `KSampler` / `KSamplerAdvanced` | steps, cfg, seed, sampler, scheduler |
| `EmptyLatentImage` | width, height |
| `LoadImage` | image_upload |
| `SaveImage` / `PreviewImage` | output node |
| `SaveAnimatedWebP` / `VHS_VideoCombine` | output node (video) |

Users can manually override or add additional mappings in the workflow editor.

---

## Generation Data Flow (end-to-end)

```
1. User types "a cat on a throne"
       │
       ▼
2. Click "Enhance" → POST /api/lmstudio/enhance
       │                    → LM Studio rewrites to detailed prompt
       ▼
3. Click "Generate" → establish WebSocket → POST /api/comfyui/prompt
       │                    → Server fills workflow JSON → POSTs to ComfyUI
       ▼
4. WebSocket streams:  execution_start → executing (node X) → progress (25%) → executed
       │
       ▼
5. Completion → GET /api/comfyui/history/{promptId} → get output file refs
       │
       ▼
6. Display → <img src="/api/comfyui/view?filename=..."> or <video>
       │
       ▼
7. Save to SQLite → appears in Gallery
```

---

## Implementation Phases

### Phase 1: Scaffolding & Infrastructure
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, src dir
- Install: `better-sqlite3`, `zustand`, `uuid`, `next-themes`
- `npx shadcn@latest init` + add button, card, dialog, input, select, slider, tabs, textarea, toast, progress, badge, separator, scroll-area, skeleton, switch, sheet, tooltip, dropdown-menu
- Create all type definitions (`src/types/`)
- Create DB schema and initialization (`src/lib/db/`)
- Configure `next.config.ts` with `serverExternalPackages: ['better-sqlite3']`

### Phase 2: Layout, Navigation & Settings
- Root layout with dark theme (`next-themes` defaultTheme="dark")
- Sidebar navigation with links to all pages
- Settings page: URL inputs, default params, "Test Connection" buttons
- Zustand settings store with localStorage persistence

### Phase 3: Backend API Routes
- LM Studio client + `/api/lmstudio/enhance` route
- ComfyUI client + all proxy routes (prompt, history, view, upload, status)
- Workflow & generation DB CRUD operations
- Workflow & generation API CRUD routes

### Phase 4: Workflow Management UI
- `workflow-utils.ts` with JSON validation + auto-detection
- Upload dialog: name, description, category, file drop, API-format validation
- Workflow editor: node listing, input mapper, output node selector
- Workflows list page

### Phase 5: Generation UI (core feature)
- ComfyUI WebSocket manager + `useComfyuiWs` hook
- `usePromptEnhance` hook + `useGeneration` orchestration hook
- Components: prompt-input, workflow-selector, generation-params, image-uploader, progress-display, output-display, generation-form
- Three generation pages (thin wrappers passing `mode` to shared form)

### Phase 6: Gallery
- Gallery grid with responsive thumbnails
- Filter by mode/date, pagination
- Detail view with full-size media viewer
- Delete functionality

### Phase 7: Dashboard & Polish
- Home page: quick-start cards, recent generations, connection status
- Loading states (`loading.tsx`) and error boundaries (`error.tsx`)
- End-to-end testing with live LM Studio and ComfyUI

---

## Dependencies

**Production:**
- `next`, `react`, `react-dom`
- `better-sqlite3` — local SQLite database
- `zustand` — client state management
- `uuid` — ID generation
- `next-themes` — dark mode
- `lucide-react` — icons (via shadcn/ui)
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui utilities

**Dev:**
- `typescript`, `@types/react`, `@types/node`
- `@types/better-sqlite3`, `@types/uuid`
- `tailwindcss`, `postcss`, `autoprefixer`
- `eslint`, `eslint-config-next`

---

## Verification Plan
1. Start LM Studio with a model loaded → verify prompt enhancement works via Settings "Test Connection"
2. Start ComfyUI → upload a simple txt2img workflow → verify auto-detection maps inputs correctly
3. Run a text-to-image generation end-to-end → verify progress + output display
4. Run text-to-video and image-to-video with appropriate workflows
5. Verify gallery shows all past generations with working thumbnails
6. Test workflow upload with various ComfyUI workflows (SDXL, Flux, AnimateDiff, etc.)
7. Test settings changes propagate to generation flows
