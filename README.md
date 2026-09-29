# Property Sales WhatsApp AI Automation

A high-performance, local-first AI-assisted property sales automation platform. The system pairs WhatsApp Web via a Chrome Extension (Manifest V3) with a local Node.js TypeScript backend, PostgreSQL, Redis, and a local Ollama AI instance, orchestrated through Docker Compose.

---

## Architecture Overview

```text
Customer
   │
   ▼
WhatsApp Web
   │
   ▼
Chrome Extension (Manifest V3)
   │
   │ localhost HTTP / WebSocket
   ▼
Node.js Fastify Backend
   │
   ├──────────────────────────┐
   ▼                          ▼
Deterministic Rule Engine   Ollama Local LLM
   │                          │
   │                          ▼
   │                    Language / Intent Detection
   │                          │
   └────────────┬─────────────┘
                │
                ▼
        Property Service (PostgreSQL - Ground Truth Only)
                │
                ▼
          Response Engine
                │
                ▼
        Chrome Extension (Safety & Verification Guard)
                │
                ▼
          WhatsApp Web
                │
                ▼
             Customer
```

---

## Key Design Principles

1. **Local-First & Zero Paid LLM APIs**: Runs 100% locally with Ollama (e.g. `qwen2.5:3b`, `llama3.2`). No OpenAI, Anthropic, or external API costs.
2. **Docker-First**: Infrastructure runs in dedicated Docker networks with persistent storage volumes.
3. **Ground-Truth Data Only**: The AI is never permitted to hallucinate or fabricate prices, sizes, availability, or legal/registry claims. All factual replies originate from PostgreSQL or approved templates.
4. **Safety & Human Takeover**: Mandatory escalation for negotiation, discounts, legal questions, and explicit human requests. Automatic message sending defaults to `AUTO_SEND=false` and fails closed if active chat verification fails.
5. **Multilingual Support**: Supports English, Hindi (Devanagari), and natural Hinglish.

---

## Monorepo Layout

```text
property-whatsapp-ai/
│
├── apps/
│   ├── backend/             # Fastify Node.js & TypeScript service (Phase 2)
│   ├── dashboard/           # Vite + React + Tailwind admin UI (Phase 14)
│   └── chrome-extension/    # Manifest V3 WhatsApp Web adapter (Phase 11)
│
├── packages/
│   ├── shared-types/        # Domain types (Conversations, Messages, AI, Properties, Transport)
│   ├── validation/          # Zod validation schemas for all domain entities & payloads
│   ├── prompts/             # Modular LLM prompt templates (Intent, Language, Escalation)
│   └── config/              # Centralized environment variable validation and defaults
│
├── infrastructure/
│   ├── docker/
│   │   ├── postgres/        # PostgreSQL init & tuning
│   │   ├── redis/           # Redis configurations
│   │   └── ollama/          # Ollama model download scripts
│   └── nginx/               # Reverse proxy configuration
│
├── docker/
│   ├── docker-compose.yml   # Production compose specification
│   ├── docker-compose.dev.yml # Hot-reloading development compose
│   └── docker-compose.prod.yml
│
├── scripts/                 # Maintenance, migration, and seed scripts
├── docs/                    # Architecture, API, database, and setup guides
├── .env.example             # Documented environment variables
├── package.json             # Root monorepo configuration
├── pnpm-workspace.yaml      # Monorepo workspace configuration
└── README.md
```

---

## Implementation Roadmap

- [x] **Phase 0: Project Bootstrap** (Monorepo, pnpm workspaces, TS, ESLint, Prettier, Shared Packages)
- [x] **Phase 1: Docker Infrastructure** (Docker Compose, PostgreSQL, Redis, Ollama)
- [x] **Phase 2: Backend Foundation** (Fastify, Health/Ready, Logging, WebSocket)
- [x] **Phase 3: Database & Prisma** (Schema, Migrations, Luxzirius Villas Seed)
- [x] **Phase 4: Property Service** (Ground-truth repository & service queries)
- [ ] **Phase 5: Shortcut/Rule Engine** (Deterministic commands & regex matching)
- [ ] **Phase 6: Ollama Integration** (HTTP Client, retry, structured output validation)
- [ ] **Phase 7: Message Processing Pipeline** (Async deduplication & dispatch)
- [ ] **Phase 8: Conversation Management** (States: AI_ACTIVE, HUMAN_ACTIVE, PAUSED)
- [ ] **Phase 9: Human Escalation** (WebSocket alert triggers for negotiation/legal/complaints)
- [ ] **Phase 10: Message Transport Abstraction** (MessageTransport interface)
- [ ] **Phase 11: Chrome Extension Core** (Manifest V3, Service Worker, Popup)
- [ ] **Phase 12: WhatsApp Message Detection** (DOM Adapter & Stable Deduplication)
- [ ] **Phase 13: Automatic Sending & Protection** (7-point safety verification)
- [ ] **Phase 14: React Dashboard** (Real-time conversation viewer, takeover controls)
- [ ] **Phase 15: Testing Suite** (Unit, integration, and scenario tests)
- [ ] **Phase 16: Security Hardening** (JWT, API keys, rate limits, audit logs)
- [ ] **Phase 17: Documentation & Operations** (Runbooks and deployment guides)

---

## Quickstart (Phase 0)

### 1. Prerequisites

- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 9.0.0` (v10 recommended)
- **Docker & Docker Compose**: (For Phase 1+)

### 2. Installation

```bash
# Clone the repository
git clone <repo-url>
cd property-whatsapp-ai

# Install all workspace dependencies
pnpm install
```

### 3. Build All Packages

```bash
pnpm build
```

### 4. Run Monorepo Tests

```bash
pnpm test
```

### 5. Lint & Typecheck

```bash
pnpm lint
pnpm typecheck
```

---

## Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env
```

Key environment options:

| Variable                  | Default                  | Purpose                                             |
| ------------------------- | ------------------------ | --------------------------------------------------- |
| `PORT`                    | `3000`                   | Backend API port                                    |
| `DATABASE_URL`            | `postgresql://...`       | PostgreSQL connection string                        |
| `REDIS_URL`               | `redis://localhost:6379` | Redis instance                                      |
| `OLLAMA_BASE_URL`         | `http://localhost:11434` | Ollama local endpoint                               |
| `OLLAMA_MODEL`            | `qwen2.5:3b`             | Configurable local LLM                              |
| `AUTO_SEND`               | `false`                  | Automatic message transmission safety switch        |
| `AI_CONFIDENCE_THRESHOLD` | `0.85`                   | Minimum confidence required before human escalation |

---

## Safety & Compliance

- **No WhatsApp Web Account Scraping / Credential Access**: The Chrome extension interacts only with the active DOM session and never stores login tokens or session keys.
- **Fail Closed**: In any scenario where active chat identity does not match or confidence is insufficient, automatic sending aborts immediately and routes to human dashboard.
