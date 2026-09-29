# Docker Infrastructure & Deployment Guide

This document details the containerized infrastructure for the Property WhatsApp AI system.

---

## 1. Service Architecture & Networking

All five services communicate over an isolated Docker bridge network named `property_network`.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (Local)                      │
│                                                             │
│   Browser (Port 5173)              WhatsApp Web (Extension) │
│           │                                    │            │
│           │                                    │            │
│   127.0.0.1:5173                       127.0.0.1:3000       │
└───────────┼────────────────────────────────────┼────────────┘
            │                                    │
┌───────────┼────────────────────────────────────┼────────────┐
│           ▼                                    ▼            │
│      [dashboard]                          [backend]         │
│           │                                    │            │
│           └───────────┬────────────────────────┤            │
│                       │ property_network       │            │
│                       ▼                        ▼            │
│                 [postgres:5432]          [redis:6379]       │
│                       │                        │            │
│                       └───────────┬────────────┘            │
│                                   ▼                         │
│                            [ollama:11434]                   │
│                                                             │
│                Isolated Docker Network                      │
└─────────────────────────────────────────────────────────────┘
```

### Security & Port Exposure

- **PostgreSQL**: Not exposed to the public network or host machine in base configuration. Internal port `5432` only.
- **Redis**: Not exposed publicly or to host machine in base configuration. Internal port `6379` only.
- **Ollama**: Not exposed publicly or to host machine. Internal port `11434` accessible only to `backend` over `property_network`.
- **Backend**: Bound strictly to `127.0.0.1:3000` on the host machine for Chrome Extension local API/WebSocket communication.
- **Dashboard**: Bound strictly to `127.0.0.1:5173` on the host machine for admin browser access.

---

## 2. Storage Persistence

Three persistent named Docker volumes preserve system state across container restarts and updates:

| Volume Name     | Target Container Path      | Purpose                                                        |
| --------------- | -------------------------- | -------------------------------------------------------------- |
| `postgres_data` | `/var/lib/postgresql/data` | Stores PostgreSQL database files (`whatsapp_ai`)               |
| `redis_data`    | `/data`                    | Stores Redis Append-Only-Files (AOF) and snapshot data         |
| `ollama_models` | `/root/.ollama`            | Stores downloaded Ollama LLM model weights (e.g. `qwen2.5:3b`) |

---

## 3. Hardware Configurations

### Default: CPU-Only Mode

The default configuration is designed to run seamlessly on standard developer laptops and servers (Apple Silicon Macs, Intel/AMD CPUs, Linux workstations) without requiring dedicated GPUs.

- **Image**: `ollama/ollama:latest`
- **Recommended RAM**: 8GB - 16GB
- **Recommended Model**: `qwen2.5:3b` or `llama3.2:3b` (fast CPU inference under 500ms for short classifications)

### Optional: NVIDIA GPU Acceleration (Linux/Windows)

If running on a Linux or Windows machine with an NVIDIA GPU and `nvidia-container-toolkit` installed:

1. Verify GPU driver on host:
   ```bash
   nvidia-smi
   ```
2. Enable GPU reservation in `docker/docker-compose.prod.yml`:
   ```yaml
   services:
     ollama:
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: all
                 capabilities: [gpu]
   ```
3. Launch with production overrides:
   ```bash
   docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
   ```

---

## 4. Health Checks

Every service defines an automated Docker health check:

| Service     | Health Check Command                          | Interval | Timeout | Retries |
| ----------- | --------------------------------------------- | -------- | ------- | ------- |
| `postgres`  | `pg_isready -U postgres -d whatsapp_ai`       | 5s       | 5s      | 5       |
| `redis`     | `redis-cli ping`                              | 5s       | 5s      | 5       |
| `ollama`    | `ollama list > /dev/null 2>&1`                | 10s      | 5s      | 5       |
| `backend`   | `curl -f http://localhost:3000/api/v1/health` | 5s       | 3s      | 5       |
| `dashboard` | `wget --spider http://localhost:80/health`    | 5s       | 3s      | 5       |

---

## 5. Operations & Commands

### Start Services (Base)

```bash
docker compose up -d
```

### Check Service Health Status

```bash
docker compose ps
```

### View Live Structured Logs

```bash
docker compose logs -f backend
```

### Stop Services (Retaining Data)

```bash
docker compose down
```

### Stop and Wipe All Data Volumes (Destructive)

```bash
docker compose down -v
```
