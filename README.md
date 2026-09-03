```
██████╗ ███████╗██╗     ██╗██╗   ██╗██╗ ██████╗
██╔══██╗██╔════╝██║     ██║██║   ██║██║██╔═══██╗
██████╔╝█████╗  ██║     ██║██║   ██║██║██║   ██║
██╔══██╗██╔══╝  ██║     ██║╚██╗ ██╔╝██║██║   ██║
██║  ██║███████╗███████╗██║ ╚████╔╝ ██║╚██████╔╝
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝  ╚═╝ ╚═════╝
```

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&pause=1200&color=111111&center=true&vCenter=true&width=760&lines=Transparent%2C+Community-Governed+Emergency+Relief;DAO-Voted+Emergency+Assistance+%2B+Milestone-Based+Campaigns;Every+vote%2C+every+release%2C+every+dollar+%E2%80%94+on-chain+and+auditable;Foundry+%C2%B7+Next.js+%C2%B7+FastAPI+%C2%B7+Supabase+%C2%B7+Sepolia)](https://git.io/typing-svg)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](./LICENSE)
![Solidity](https://img.shields.io/badge/Solidity-%5E0.8-black)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![FastAPI](https://img.shields.io/badge/AI%20Service-FastAPI-black)
![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-black)
![Status](https://img.shields.io/badge/Status-Hackathon%20Prototype-black)

</div>

---

## What is Relivio?

Relivio is a decentralized financial infrastructure prototype for **transparent, community-governed emergency assistance and disaster relief**. Instead of a single administrator deciding who gets funded, donors and community members vote on-chain, and funds release automatically once a vote passes — no intermediary holds or controls the money at any point.

The project spans two core use cases:

1. **Individual Emergency Assistance** — `CommunityFund` contracts hold a pooled treasury. Anyone can request emergency assistance; donors vote; if the vote passes, funds release automatically per the contract's own rules.
2. **Disaster & Community Relief Campaigns** — `Campaign` contracts raise funds toward a public relief effort and release them in **milestones**, each one requiring a fresh donor vote before the next tranche unlocks. No organizer can walk away with the full pot on day one.

An advisory AI risk-assessment service adds a second, independent signal — never a decision-maker — flagging things like new/unverified wallets, thin donor bases, or incomplete listings so voters have more context, without ever having the power to approve, reject, freeze, or confiscate anything itself.

This is a **testnet-only hackathon prototype**. All funds are simulated stablecoin (`RUSD`, self-mintable via a public faucet), all DeFi yield is simulated, and nothing here should be mistaken for a production financial product.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security & Trust Model](#security--trust-model)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Architecture

Four independent pieces, each replaceable/removable without breaking the others:

| Layer | Responsibility | Is it in the trust path for money? |
|---|---|---|
| **`contracts/`** | Source of truth. Holds funds, tallies votes, releases money. | **Yes — the only layer that is.** |
| **`frontend/`** | Next.js app. Reads/writes chain state via wagmi/viem; reads/writes off-chain content (comments, profiles, listings) via Supabase. | No — a UI for the contracts, not a gatekeeper of them. |
| **`ai/`** | FastAPI service. Rules-based, explainable risk scoring for requests, milestones, and campaigns. | No — advisory only, cannot approve/reject/freeze/confiscate anything. |
| **`backend/`** | Supabase Postgres (off-chain metadata: profiles, comments, listings, notifications) + a TypeScript event indexer that watches the chain and writes activity/notification rows. | No — if Supabase or the indexer disappeared entirely, every fund's balance, every vote, and every milestone release would be completely unaffected. |

```
Wallet ──(wagmi/viem)──▶ Next.js frontend ──▶ Smart contracts (Sepolia)
                              │                        │
                              │                  emits events
                              ▼                        ▼
                    Supabase (off-chain           Indexer (Node/viem)
                    metadata, comments,      ◀───  watches events,
                    profiles, storage)             writes notifications
                              ▲
                              │ advisory risk score (never a decision)
                        AI service (FastAPI)
```

---

## Tech Stack

| Area | Stack |
|---|---|
| Smart contracts | Solidity ^0.8, Foundry (Forge/Anvil/Cast), OpenZeppelin |
| Frontend | Next.js 16 (App Router), React, wagmi, viem, Tailwind CSS |
| AI service | Python, FastAPI, Pydantic — rules-based, no ML/opaque scoring |
| Off-chain data | Supabase (Postgres + Row Level Security + Storage) |
| Indexer | Node.js, TypeScript, viem, `@supabase/supabase-js` |
| Testing | Foundry (`forge test`), pytest, Vitest + React Testing Library |
| Network | Ethereum Sepolia testnet |

---

## Repository Structure

```
relivio/
├── contracts/           Foundry project — CommunityFund, Campaign, FundFactory,
│                         CampaignFactory, Reputation, MockStablecoin (RUSD),
│                         MockYieldProtocol (simulated yield only)
├── frontend/             Next.js App Router — pages, components, wallet-signature-
│                         verified API routes, Supabase clients
├── ai/                  FastAPI risk-assessment microservice
│   ├── services/main.py  /assess/request, /assess/milestone, /assess/campaign
│   └── tests/            pytest suite
└── backend/
    ├── supabase/schema.sql   Tables + Row Level Security policies
    └── indexer/index.ts      Watches on-chain events, writes notifications
```

---

## Features

**On-chain (the actual trust layer)**
- Pooled emergency-assistance funds with donor voting and automatic payout on a passed vote
- Milestone-based campaign funding — each tranche requires its own fresh vote
- On-chain reputation scoring based on real repayment/contribution history
- A public, rate-limited `faucet()` on the mock stablecoin so any wallet can self-serve test funds

**AI advisory layer** (`ai/`)
- Three endpoints — `/assess/request`, `/assess/milestone`, `/assess/campaign` — each returning a `LOW`/`MEDIUM`/`HIGH` score with **named, human-readable reasons** for every point
- Signals include wallet age/tx history, donor concentration (wash-trading pattern detection), prior flagged campaigns, and listing completeness
- **Never** auto-approves, auto-rejects, freezes, or confiscates anything — every response carries that disclaimer explicitly

**Off-chain platform layer** (`frontend/` + `backend/`)
- Wallet-signature-verified comments, profile display names, and watchlists — no login/session system, just message signing
- A notification bell that surfaces on-chain activity (contributions, milestone proposals/releases) for anything you're watching
- Organizer-gated campaign/fund listings: cover image, gallery, long description, location, external links — with **real image uploads to Supabase Storage**, not URL text fields
- An organizer progress-update feed (title, body, photos) for posting on-the-ground updates
- Every off-chain write that matters (listing edits, updates, image uploads) is gated by an actual **on-chain read of the contract's `organizer()`** — a wallet signature alone proves who's asking, not that they're allowed to edit a given listing

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.10+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `anvil`, `cast`)
- A Supabase project ([supabase.com](https://supabase.com)) with `backend/supabase/schema.sql` run against it, and a public Storage bucket named `relivio-media`
- MetaMask (or any injected wallet), switched to Sepolia, with some Sepolia ETH for gas

### 1. Contracts

```bash
cd contracts
cp .env.example .env        # fill in PRIVATE_KEY, SEPOLIA_RPC_URL
forge install
forge test
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast
```
Save the deployed addresses — you'll need them in the next two steps.

### 2. AI service

```bash
cd ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn services.main:app --reload --port 8000
```
Verify at `http://localhost:8000/health`.

### 3. Indexer

```bash
cd backend/indexer
cp .env.example .env        # RPC_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
                             # FUND_FACTORY_ADDRESS, CAMPAIGN_FACTORY_ADDRESS
npm install
npm start
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local  # see Environment Variables below
npm install
npm run dev
```
Open `http://localhost:3000`.

You now need **four things running at once**: the AI service, the indexer, `next dev`, and your wallet connected to Sepolia.

---

## Environment Variables

**`frontend/.env.local`**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` for Sepolia |
| `NEXT_PUBLIC_RPC_URL` | Your Sepolia RPC endpoint |
| `NEXT_PUBLIC_STABLECOIN_ADDRESS` / `NEXT_PUBLIC_FUND_FACTORY_ADDRESS` / `NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS` / `NEXT_PUBLIC_REPUTATION_ADDRESS` | From your contract deployment |
| `NEXT_PUBLIC_AI_SERVICE_URL` | `http://localhost:8000` locally; must be a public HTTPS URL once deployed |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public, read-only Supabase client |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | **Server-only, never `NEXT_PUBLIC_`-prefixed.** Used by API routes after signature verification. |

**`backend/indexer/.env`**

| Variable | Notes |
|---|---|
| `RPC_URL` | Same network as the frontend |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Same Supabase project |
| `FUND_FACTORY_ADDRESS` / `CAMPAIGN_FACTORY_ADDRESS` | Same deployment |

**`contracts/.env`**

| Variable | Notes |
|---|---|
| `PRIVATE_KEY` | Deployer wallet — testnet only, never a real-funds key |
| `SEPOLIA_RPC_URL` | Your Sepolia RPC endpoint |
| `ETHERSCAN_API_KEY` | Optional, for contract verification |

---

## Testing

```bash
# Contracts
cd contracts && forge test

# AI service — 35 tests covering every scoring rule across all three endpoints
cd ai && pip install -r requirements-dev.txt && pytest -v

# Frontend — 67 tests: signature verification, formatting, error handling,
# and client/server message-parity checks for every wallet-signed write
cd frontend && npx vitest run
```

The frontend suite deliberately includes **parity tests** for every signed action (profile updates, metadata edits, updates, image uploads) — each asserts the exact message the client signs matches what the server reconstructs to verify, byte-for-byte. This class of bug (an `undefined`-vs-`null` mismatch producing a confusing "signature verification failed") happened once during development; these tests exist so it can't happen silently again.

---

## Deployment

Summary (see inline code comments in `backend/indexer/index.ts` for the reasoning):

1. **AI service** → Render, free Web Service (`uvicorn services.main:app --host 0.0.0.0 --port $PORT`)
2. **Indexer** → Render, free Web Service (not Background Worker — Render's free tier has no background-worker option). The indexer runs a minimal built-in HTTP health-check endpoint specifically so it qualifies as a "web service." Pair it with a free uptime pinger (UptimeRobot / cron-job.org) hitting that endpoint every ~10 minutes to prevent Render's 15-minute idle spin-down.
3. **Frontend** → Vercel. Set every `NEXT_PUBLIC_*` variable in Vercel's dashboard **before** the first deploy — they're baked in at build time, not read at runtime.
4. Tighten the AI service's CORS (`allow_origins`) from `["*"]` to your actual deployed frontend domain once you have it.

---

## Security & Trust Model

- **No login system.** Every off-chain write (comments, profile, listings, updates, image uploads) is authenticated by a wallet signature over a canonical message — not a session, not a password.
- **A signature proves who's asking, not what they're allowed to do.** For anything organizer-specific (editing a listing, posting an update, uploading an image), the API additionally reads the contract's `organizer()` on-chain and checks it against the signer, server-side, before allowing the write.
- **Row Level Security is deliberately restrictive.** Every table blocks anonymous writes by default; all writes go through server-side API routes using a service-role key, only after the checks above pass.
- **The AI service cannot act.** Structurally incapable of approving, rejecting, freezing, or confiscating anything — it returns a score and named reasons, nothing else, and every response says so explicitly.

---

## Known Limitations

- **Testnet only.** Sepolia, mock stablecoin, no real funds anywhere in this system.
- **Simulated DeFi yield.** `MockYieldProtocol` does not connect to any real protocol.
- **No file-upload virus/content scanning.** Uploaded images go straight to Supabase Storage.
- **No cleanup job for removed images.** Removing an image from a listing drops its URL reference but doesn't delete the underlying file from Storage.
- **Hackathon prototype.** Built and iterated rapidly; not audited.

---

## License

MIT — see [LICENSE](./LICENSE).

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:111111,100:000000&height=100&section=footer" width="100%"/>

Built for a hackathon. Every line of code, every fund, every vote — Sepolia testnet only.

</div>