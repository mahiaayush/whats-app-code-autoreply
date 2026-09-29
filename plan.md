# Local AI WhatsApp Property Sales Automation — Master Implementation Plan

> **System Status**: Active Development  
> **Current Version**: 0.9.0  
> **Last Updated**: 2026-09-29  

---

## 1. System Architecture Overview

The system is a local-first, privacy-respecting, AI-assisted conversational sales platform for real estate. It connects WhatsApp Web via a Chrome Extension (Manifest V3) with a local Node.js Fastify backend, PostgreSQL, Redis, and a locally running Ollama LLM (`qwen2.5:3b`), running within Docker Compose.

```text
                                  ┌───────────────────────────────┐
                                  │      WhatsApp Web Client      │
                                  └──────────────┬────────────────┘
                                                 │ DOM MutationObserver & Dispatch
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Chrome Extension (Manifest V3)│
                                  │  - Content Script DOM monitor │
                                  │  - Background Service Worker  │
                                  │  - 7-Point Safety Verification│
                                  └──────────────┬────────────────┘
                                                 │ WebSocket (Heartbeat) & REST
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Fastify Backend (Node.js + TS)                            │
│                                                                                        │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐  │
│  │   WebSocket Server    │   │  Message Ingestion     │   │   Safety / Human Gate  │  │
│  │   /api/v1/ws          │   │  Idempotency & Dedup   │   │   AUTO_SEND Safeguard  │  │
│  └───────────────────────┘   └───────────┬────────────┘   └────────────────────────┘  │
│                                          │                                            │
│                                          ▼                                            │
│                         ┌─────────────────────────────────┐                           │
│                         │    Rule & Shortcut Engine       │                           │
│                         │    (Deterministic Execution)    │                           │
│                         └────────────────┬────────────────┘                           │
│                                          │ Unmatched / Natural Language               │
│                                          ▼                                            │
│                         ┌─────────────────────────────────┐                           │
│                         │    Local Ollama LLM Service     │                           │
│                         │   Intent & Language Classifier  │                           │
│                         └────────────────┬────────────────┘                           │
│                                          │ Intent = PROPERTY_*                        │
│                                          ▼                                            │
│                         ┌─────────────────────────────────┐                           │
│                         │    Property Service (Ground     │                           │
│                         │    Truth PostgreSQL Queries)    │                           │
│                         └────────────────┬────────────────┘                           │
│                                          │ Verified Facts Sourced                     │
│                                          ▼                                            │
│                         ┌─────────────────────────────────┐                           │
│                         │    Response Generation Engine   │                           │
│                         │  (Multilingual: EN, HI, Hinglish)                           │
│                         └─────────────────────────────────┘                           │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│     PostgreSQL 16 (Prisma)    │                     │         Redis 7.2 Cache       │
│  - 18 Entities (Ground Truth) │                     │  - Message deduplication      │
│  - Properties, Units, Prices  │                     │  - Session state & Locks      │
│  - Conversations, Escalations │                     │  - Rate limiting              │
└───────────────────────────────┘                     └───────────────────────────────┘
```

---

## 2. Core Architectural Invariants

1. **Local-First & Zero Paid LLM APIs**: Operates 100% locally via Ollama with zero external API dependencies (no OpenAI/Anthropic keys).
2. **Ground-Truth Invariant**: The AI is **never** permitted to hallucinate or invent prices, unit sizes, availability, or legal/registry details. All factual responses originate strictly from PostgreSQL or deterministic templates.
3. **Fail-Closed Safety**: Automatic message transmission defaults to `AUTO_SEND=false`. Messages require human approval unless strict 7-point safety verification passes.
4. **Mandatory Human Escalation**: Immediate takeover triggers on price negotiation, discounts, legal/registry inquiries, complaints, and explicit human requests.
5. **Multilingual Support**: First-class support for English, Hindi (Devanagari), and natural conversational Hinglish.

---

## 3. Phase Status Matrix

| Phase | Phase Name | Status | Description / Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Project Bootstrap** | **COMPLETED** | Monorepo layout (`pnpm`), TS base configs, ESLint flat config, Vitest, 4 shared packages (`@property-ai/shared-types`, `@property-ai/validation`, `@property-ai/prompts`, `@property-ai/config`). |
| **Phase 1** | **Docker Infrastructure** | **COMPLETED** | Multi-container Docker Compose (Backend, Dashboard, PostgreSQL, Redis, Ollama), isolated network `property_network`, health checks, volume persistence. |
| **Phase 2** | **Backend Foundation** | **COMPLETED** | Fastify application factory, Pino logger, CORS configuration, Request ID tracking, WebSocket server with heartbeat, `/health` and `/ready` endpoints, centralized error handling. |
| **Phase 3** | **Database & Prisma** | **COMPLETED** | Prisma schema with all 18 entities, migration applied, PostgreSQL connection pooling, seed script with *Luxzirius Villas* complete ground truth, shortcuts, and multilingual templates. |
| **Phase 5** | **Shortcut / Rule Engine** | **COMPLETED** | Deterministic command parser (`/price`, `/area`, `/brochure`, etc.), regex intent matcher, priority ordering, zero-latency instant response cache. |
| **Phase 6** | **Ollama Local LLM** | **COMPLETED** | Resilient Fastify Ollama client, structured JSON output validation, fallback model resolution, pre-LLM safety guardrails, grounded fact response generation. |
| **Phase 7** | **Message Pipeline** | **COMPLETED** | Ingestion pipeline, Redis deduplication with atomic locks, async worker queue with per-conversation FIFO serialization, 3-tier resolution engine (Shortcuts -> Pre-LLM Safety -> Grounded LLM), approval/rejection lifecycle. |
| **Phase 8** | **Conversation Management**| **COMPLETED** | Conversation state machine (`AI_ACTIVE`, `HUMAN_REQUIRED`, `HUMAN_ACTIVE`, `PAUSED`, `CLOSED`), takeover/release/pause/resume/close lifecycles, customer lead profile extraction (budget, unit size, timeline, investor/end-user), multi-turn context memory. |
| **Phase 9** | **Human Escalation Engine**| **COMPLETED** | Multi-category trigger detection (discounts, legal, RERA, cash, complaints, manager demands), deterministic priority assignment, dynamic SLA tracking & breach monitoring, agent assignment & audited resolution lifecycle, real-time WebSocket dashboard alerts. |
| **Phase 10**| **Transport Abstraction** | **PENDING** | Unified `MessageTransport` interface decoupling WhatsApp Web, WhatsApp Cloud API, and mock simulation transports for seamless testing. |
| **Phase 11**| **Chrome Extension Core** | **PENDING** | Manifest V3 setup, background Service Worker, popup UI, persistent WebSocket connection to backend, badge status indicators. |
| **Phase 12**| **WhatsApp DOM Adapter** | **PENDING** | MutationObserver DOM integration, message scraping, sender classification, stable message ID generation, duplicate filtering. |
| **Phase 13**| **Auto-Send & Safety Guards**| **PENDING** | 7-point safety verification algorithm, DOM input injection, send button simulation, fail-safe abort mechanisms. |
| **Phase 14**| **React Dashboard** | **PENDING** | Vite + React + Tailwind admin console, live chat view, human takeover toggle, pending approval queue, quick shortcut triggers. |
| **Phase 15**| **End-to-End Test Suite** | **PENDING** | Full conversational scenario test suite, multilingual regression tests, failure injection, latency benchmarks. |
| **Phase 16**| **Security & Hardening** | **PENDING** | JWT auth for dashboard, extension auth tokens, rate-limiting on endpoints, sensitive data redaction, audit logs. |
| **Phase 17**| **Production & Operations**| **PENDING** | Production Docker profiles, backup/restore runbooks, Ollama model quantization guide, system health monitoring. |

---

## 4. Phase Details & Verification

### Phase 0: Project Bootstrap (Completed)
- **Commits**: `05c8c90`
- **Deliverables**:
  - `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.ts`.
  - Four packages built and tested: `packages/shared-types`, `packages/validation`, `packages/prompts`, `packages/config`.
- **Verification**: 21 unit tests passing across all packages.

### Phase 1: Docker Infrastructure (Completed)
- **Commits**: `fdfd561`
- **Deliverables**:
  - `docker-compose.yml`, `docker/docker-compose.dev.yml`, `docker/docker-compose.prod.yml`.
  - 5 services: `whatsapp_backend`, `whatsapp_dashboard`, `whatsapp_postgres`, `whatsapp_redis`, `whatsapp_ollama`.
  - Network `property_network` and persistent volumes configured.
- **Verification**: All 5 containers healthy; verified ports and health check routes.

### Phase 2: Backend Foundation (Completed)
- **Commits**: `9b39c0d`
- **Deliverables**:
  - Fastify server with `@fastify/cors`, `@fastify/sensible`, `@fastify/websocket`, Pino logger.
  - Heartbeat WebSocket manager at `/api/v1/ws` tracking Extension and Dashboard clients.
  - Endpoints: `GET /api/v1/health`, `GET /api/v1/ready`, `GET /api/v1/ollama/health`.
  - Centralized error handler and request ID propagation.
- **Verification**: 9 unit and integration tests passing.

### Phase 3: Database & Prisma (Completed)
- **Commits**: `1483f9d`
- **Deliverables**:
  - Prisma schema with 18 models.
  - Migration `20260929110056_init_schema` executed on PostgreSQL.
  - Seed script seeded *Luxzirius Villas*, 9 deterministic shortcuts, 5 multilingual templates.
  - Database client singleton and health checks.
- **Verification**: Database health and schema tests passing (36 tests total).

### Phase 4: Property Service (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/properties/property.repository.ts`: Full query layer for property ground truth.
  - `apps/backend/src/modules/properties/property.service.ts`: Business logic, BigInt-to-Number serialization, ground-truth fact sheet generator.
  - `apps/backend/src/modules/properties/property.controller.ts` & `property.routes.ts`: 10 REST endpoints with schema validation.
  - Unit & integration test suites verifying ground truth and edge cases.
- **Endpoints**:
  - `GET /api/v1/properties` — List active properties with summary data
  - `GET /api/v1/properties/:slug` — Full property details with all relations
  - `GET /api/v1/properties/:slug/price` — Verified pricing and payment plans
  - `GET /api/v1/properties/:slug/units` (or `/area`) — Unit configurations, carpet area, availability
  - `GET /api/v1/properties/:slug/location` — Physical address, coordinates, connectivity
  - `GET /api/v1/properties/:slug/amenities` — Categorized amenities
  - `GET /api/v1/properties/:slug/media` — Images, brochures, floor plans
  - `GET /api/v1/properties/:slug/availability` — Unit inventory status
  - `GET /api/v1/properties/:slug/faq` — Ground-truth FAQs with keyword search
  - `GET /api/v1/properties/:slug/contacts` — Verified sales advisors
  - `GET /api/v1/properties/:slug/ground-truth` — Compiled fact sheet for AI prompt injection

### Phase 5: Shortcut / Rule Engine (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/rules/rule.repository.ts`: PostgreSQL data access for shortcuts and response templates.
  - `apps/backend/src/modules/rules/rule.engine.ts`: In-memory compiled regex and command parser with priority weighting.
  - `apps/backend/src/modules/rules/rule.service.ts`: End-to-end rule processing, template variable interpolation (`{{propertyName}}`, `{{startingPrice}}`, `{{carpetArea}}`, etc.), and multilingual template rendering.
  - `apps/backend/src/modules/rules/rule.controller.ts` & `rule.routes.ts`: REST endpoints for rule matching and shortcut management.
  - Unit and integration tests covering commands, natural language phrases, priority ordering, and API injection.
- **Endpoints**:
  - `GET /api/v1/shortcuts` — List active shortcuts
  - `GET /api/v1/shortcuts/:command` — Get shortcut details by command
  - `POST /api/v1/shortcuts` — Create custom shortcut (Zod validated)
  - `PATCH /api/v1/shortcuts/:id` — Update shortcut priority or state
  - `DELETE /api/v1/shortcuts/:id` — Delete shortcut
  - `POST /api/v1/rules/match` — Match incoming message and return interpolated ground truth response
  - `POST /api/v1/rules/reload` — Reload rules into memory cache

### Phase 6: Ollama Local LLM Integration (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/ai/ollama.client.ts`: Resilient local Ollama client connecting to Dockerized Ollama (`http://localhost:11434`), dynamic model discovery, fallback resolution (`qwen2.5:latest` / `qwen2.5:1.5b`), structured JSON generation with Zod validation, retry with exponential backoff.
  - `apps/backend/src/modules/ai/ai.service.ts`: Fast multilingual language detector (`en`, `hi`, `hinglish`), Pre-LLM safety guardrails (instant zero-latency escalation to `HUMAN_REQUIRED` on negotiation/discounts, legal/RERA disputes, manager handoff), 13 domain intent classification with confidence scoring, grounded response generation strictly bounded to PostgreSQL facts from `PropertyService`, end-to-end `executeChatPipeline`.
  - `apps/backend/src/modules/ai/ai.controller.ts` & `apps/backend/src/modules/ai/ai.routes.ts`: REST API endpoints with request/response Zod schema validation.
  - Vitest integration and route suites (`ai.service.test.ts`, `ai.routes.test.ts`).
- **Endpoints**:
  - `GET /api/v1/ai/health` — Checks local Ollama connectivity and model availability
  - `GET /api/v1/ai/models` — Lists available local Ollama models
  - `POST /api/v1/ai/classify` — Classifies customer message intent & extracts entities
  - `POST /api/v1/ai/generate` — Generates grounded response using verified PostgreSQL facts
  - `POST /api/v1/ai/chat` — Full chat pipeline (detect language -> pre-LLM safety guard -> classify intent -> generate grounded response or escalate)

### Phase 7: Message Processing Pipeline (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/messages/message.dedup.ts`: Atomic Redis deduplication lock using `SET msg:dedup:${id} 1 EX 300 NX`, idempotent fallback to PostgreSQL `externalMessageId`.
  - `apps/backend/src/modules/messages/message.repository.ts`: Full Prisma data access for customer upsert, conversation lifecycle, message logging, processing tracking, escalations, and human actions.
  - `apps/backend/src/modules/messages/message-pipeline.service.ts`: Orchestrates 3-tier message resolution pipeline, human mode bypass, escalation dispatch, and outbound auto-send safeguards.
  - `apps/backend/src/modules/messages/message.queue.ts`: Non-blocking async queue with per-conversation serialization to prevent race conditions during rapid messaging.
  - `apps/backend/src/modules/messages/message.controller.ts` & `message.routes.ts`: REST API endpoints for `/inbound`, `/:id`, `/conversation/:chatId`, `/:id/approve`, `/:id/reject`.
  - Unit and integration tests (`message.dedup.test.ts`, `message-pipeline.service.test.ts`, `message.routes.test.ts`).
- **Endpoints**:
  - `POST /api/v1/messages/inbound` — Ingest inbound message from extension (sync or async mode)
  - `GET /api/v1/messages/:id` — Get message details with processing and escalation state
  - `POST /api/v1/messages/:id/approve` — Human agent approves pending outbound message
  - `POST /api/v1/messages/:id/reject` — Human agent rejects proposed outbound message

### Phase 8: Conversation Management (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/conversations/conversation.state-machine.ts`: Deterministic state machine validating mode transitions between `AI_ACTIVE`, `HUMAN_REQUIRED`, `HUMAN_ACTIVE`, `PAUSED`, `CLOSED`.
  - `apps/backend/src/modules/conversations/conversation.repository.ts`: Prisma repository for paginated conversation queries, customer profile updates, human action audits, and unread counts.
  - `apps/backend/src/modules/conversations/conversation.service.ts`: Business logic for agent takeover/release, pause/resume, close, rule-based lead profile extraction (budget, configuration, timeline, tags), and multi-turn context synthesis.
  - `apps/backend/src/modules/conversations/conversation.controller.ts` & `conversation.routes.ts`: REST API endpoints under `/api/v1/conversations`.
  - Unit and integration tests (`conversation.state-machine.test.ts`, `conversation.service.test.ts`, `conversation.routes.test.ts`).
- **Endpoints**:
  - `GET /api/v1/conversations` — Query conversations with mode/language filters and search
  - `GET /api/v1/conversations/:id` — Get conversation details with lead profile and escalations
  - `POST /api/v1/conversations/:id/takeover` — Agent takes over conversation (`-> HUMAN_ACTIVE`)
  - `POST /api/v1/conversations/:id/release` — Agent releases conversation back to AI (`-> AI_ACTIVE`)
  - `POST /api/v1/conversations/:id/pause` — Pause automation (`-> PAUSED`)
  - `POST /api/v1/conversations/:id/resume` — Resume automation (`-> AI_ACTIVE`)
  - `POST /api/v1/conversations/:id/close` — Close conversation (`-> CLOSED`)
  - `PATCH /api/v1/conversations/:id` — Update conversation settings (`autoSend`, `propertySlug`, `language`)
  - `PATCH /api/v1/conversations/:id/customer` — Update customer lead profile (`name`, `status`, `tags`, `notes`)
  - `GET /api/v1/conversations/:id/context` — Retrieve multi-turn dialogue context

### Phase 9: Human Escalation Engine (Completed)
- **Deliverables**:
  - `apps/backend/src/modules/escalations/escalation.detector.ts`: High-speed multilingual regex classifier covering Legal/RERA disputes (`CRITICAL`), Fraud/Complaints (`CRITICAL`), Price negotiation (`HIGH`), Discounts (`HIGH`), Complex/Cash payment (`HIGH`), Manager/Human requests (`HIGH`), and Possession commitments (`MEDIUM`) in English, Hindi, and Hinglish.
  - `apps/backend/src/modules/escalations/escalation.types.ts`: SLA configurations (CRITICAL: 15m, HIGH: 30m, MEDIUM: 60m, LOW: 120m), live SLA calculation schemas, and dashboard metrics contracts.
  - `apps/backend/src/modules/escalations/escalation.repository.ts`: Full Prisma data layer for Escalations: paginated search, filter by status/priority/agent, agent assignment, resolution with `HumanAction` audit records, and aggregation queries.
  - `apps/backend/src/modules/escalations/escalation.service.ts`: End-to-end orchestration: trigger evaluation, escalation creation with automatic conversation mode transition (`-> HUMAN_REQUIRED`), real-time WebSocket alert dispatch (`HUMAN_ATTENTION_REQUIRED`), agent assignment (`-> HUMAN_ACTIVE`), resolution, and dynamic SLA breach monitoring.
  - `apps/backend/src/modules/escalations/escalation.controller.ts` & `escalation.routes.ts`: REST API endpoints under `/api/v1/escalations`.
  - Integration with `MessagePipelineService`: Replaced hardcoded escalation priority with automated `EscalationDetector` categorization during inbound message processing.
  - Unit and integration tests (`escalation.detector.test.ts`, `escalation.service.test.ts`, `escalation.routes.test.ts`) with 35 tests passing.
- **Endpoints**:
  - `GET /api/v1/escalations` — Query escalations with live SLA breach flags and filters
  - `GET /api/v1/escalations/stats` — Operational dashboard metrics (open by priority, breached count, resolution time)
  - `GET /api/v1/escalations/:id` — Get escalation details with conversation and trigger message
  - `POST /api/v1/escalations/evaluate` — Evaluate message text against escalation triggers
  - `POST /api/v1/escalations` — Manually create an escalation
  - `POST /api/v1/escalations/:id/assign` — Assign escalation to agent (`-> IN_PROGRESS` and conversation `-> HUMAN_ACTIVE`)
  - `POST /api/v1/escalations/:id/resolve` — Mark escalation resolved with audit logging
  - `POST /api/v1/escalations/:id/dismiss` — Dismiss escalation with audit notes

---

## 5. Local Development Commands

```bash
# Start Docker infrastructure
docker compose up -d

# Run database migrations & seed
pnpm --filter @property-ai/backend prisma migrate dev
pnpm --filter @property-ai/backend prisma db seed

# Run monorepo test suite
pnpm test

# Build all packages & apps
pnpm build

# Type check all workspaces
pnpm typecheck
```
