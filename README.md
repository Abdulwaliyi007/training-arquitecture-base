# Architecture Training

Placeholder monorepo for architecture training.

## Stack

| App | Tech | Default URL |
| --- | --- | --- |
| `apps/frontend` | Next.js | http://localhost:3000 |
| `apps/backend` | NestJS | http://localhost:3001 |

Package manager: **pnpm** (workspaces).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/installation) 10+

```bash
# enable pnpm via corepack (recommended)
corepack enable
corepack prepare pnpm@10.14.0 --activate
```

## Setup

```bash
pnpm install
```

## Run

Start both apps in parallel:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:frontend   # Next.js → http://localhost:3000
pnpm dev:backend    # NestJS  → http://localhost:3001
```

Quick check that the API is up:

```bash
curl http://localhost:3001
# → Hello World!
```

## Build

```bash
pnpm build
```

## Structure

```text
arquitecture-training/
├── apps/
│   ├── frontend/   # Next.js
│   └── backend/    # NestJS
├── tasks/          # Workshop briefs (TASK1–TASK3 required; TASK4 optional)
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Workshop path

| Task | Focus | Required? |
| --- | --- | --- |
| [`tasks/TASK1.md`](tasks/TASK1.md) | Users, roles, groups, JWT | Yes |
| [`tasks/TASK2.md`](tasks/TASK2.md) | Notifications API + tests | Yes |
| [`tasks/TASK3.md`](tasks/TASK3.md) | Frontend login + notifications UI | Yes — **workshop ends here** |
| [`tasks/TASK4.md`](tasks/TASK4.md) | Stats, broadcast, delivery logs | Optional / deferred |

## Notes

This repo is intentionally minimal — a starting point for training exercises. Required work stops after Task 3.
