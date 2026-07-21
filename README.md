# ⚡ Local-First Collaborative Document Editor

> **Fullstack Developer Assignment** — Built with **Next.js 16 (Turbopack)**, **TypeScript**, **PostgreSQL (Prisma)**, **IndexedDB (Dexie.js)**, **Tailwind CSS**, and **Google Gemini AI**.

An enterprise-grade, real-time, local-first collaborative document editor built to operate seamlessly offline with zero-latency UI updates, deterministic CRDT conflict resolution, background synchronization, version history time travel, role-based authorization, and AI editing tools.

---

## 🌟 Key Features & Architectural Highlights

### 🚀 1. Local-First Architecture (Zero Latency)
- **Primary Source of Truth on Client:** All user typing, block re-ordering, additions, and deletions are saved immediately to client-side **IndexedDB**.
- **Non-Blocking UI:** Zero network calls block user interactions. Typing remains smooth at 60 FPS regardless of network latency or disconnects.

### 🔄 2. Real-Time Sync & Background Engine
- **Conflict-Free Replicated Data Type (CRDT):** Uses **Fractional Indexing** algorithms combined with Last-Write-Wins (LWW) resolution to deterministically order blocks without data loss during concurrent offline edits.
- **Background Sync Queue:** Offline changes are queued in IndexedDB. Upon network restoration, an asynchronous sync engine flushes pending operations to the server in batches.
- **0ms Cross-Tab Sync:** Utilizes the Web `BroadcastChannel` API for instant sync across tabs in the same browser, and Server-Sent Events (SSE) + Postgres `NOTIFY/LISTEN` pub-sub across multiple devices.

### 📜 3. Version History & Time Travel
- **Snapshot Capturing:** Users can capture manual or milestone snapshots of a document state.
- **Safe Restores:** Past versions can be previewed and restored safely without corrupting active collaborator states or destroying current conflict-resolution sequences.

### 🔒 4. Granular Roles & Security Scoping
- **Role-Based Access Control (RBAC):** Supports `Owner`, `Editor`, and `Viewer` roles for each document.
- **Strict Server Scoping:** `Viewer` roles are prevented from pushing synchronization updates to the real-time server at both the API level and ORM query level.

### 🛡️ 5. Robust Data Validation & OOM Prevention
- **Zod Schema Parsing:** Server routes validate incoming sync payloads with `Zod` to prevent malformed or malicious data from polluting the database.
- **Payload & Rate Guardrails:** Implements a strict `2MB` body size limit and a `500-operation` batch cap to protect against Denial-of-Service (DoS) and Out-Of-Memory (OOM) memory exhaustion attacks.

### 🤖 6. Built-in AI Editing Suite
- **Gemini AI Integration:** Highlight any block to trigger AI actions: **Summarize**, **Expand**, **Fix Grammar**, **Translate**, or **Change Tone**.
- **Graceful Error Handling:** Equipped with fallback mechanisms to ensure UI stability even if AI rate limits are reached.

### 🧪 7. Automated Testing & CI/CD Pipeline
- **Vitest Unit Tests:** Includes automated unit test coverage for the core CRDT fractional indexing engine and background sync manager.
- **GitHub Actions CI:** Runs automatic linting, unit tests, and TypeScript compilation on every `push` and `pull_request` to `main`.
- **Vercel CD:** Automated continuous deployment configured with post-install Prisma client generation.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Client Storage** | IndexedDB (Dexie.js / LocalDb) |
| **Styling** | Tailwind CSS v4, Glassmorphism UI |
| **AI Integration** | `@google/genai` (Gemini API) |
| **Validation** | Zod |
| **Testing** | Vitest, JSDOM |
| **CI/CD & Hosting** | GitHub Actions, Vercel |

---

## 📐 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT BROWSER                                   |
|                                                                                   |
|  +------------------+      +-------------------+      +------------------------+  |
|  |   React Editor   | ---> | LocalDB (Indexed) | ---> | Sync Manager (Queue)   |  |
|  +------------------+      +-------------------+      +------------------------+  |
|           ^                          ^                            |               |
+-----------|--------------------------|----------------------------|---------------+
            |                          |                            |
            | BroadcastChannel         | Local Read                 | HTTP POST (Batch Push)
            v (Same Browser)           v                            v
+------------------+                   |                +------------------------+
| Other Local Tabs |                   |                |    Next.js API Route   |
+------------------+                   |                |   (/api/sync/push)     |
                                       |                +------------------------+
                                       |                            |
                                       | Zod Validation & Scoping   | Write Ops
                                       |                            v
                                       |                +------------------------+
                                       |                |  PostgreSQL Database   |
                                       |                +------------------------+
                                       |                            |
                                       |                            | NOTIFY doc_updates
                                       |                            v
                                       |                +------------------------+
                                       +----------------|    PubSub & SSE Stream |
                                        Remote Stream   +------------------------+
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js `>= 20.0.0`
- npm or pnpm
- A PostgreSQL database instance (e.g. Supabase, Neon, or local Postgres)

### 1. Clone & Install Dependencies
```bash
git clone <your-repository-url>
cd house_edtech_task
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and populate it:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?sslmode=require"

# Auth Secret
JWT_SECRET="your-super-secret-jwt-key"

# Gemini AI Key
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Initialize Database
Generate the Prisma Client and push the schema to PostgreSQL:
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Automated Tests

Run the Vitest suite to verify CRDT indexing logic and sync manager queueing:

```bash
# Run tests once
npx vitest run

# Run tests in watch mode
npx vitest
```

---

## ⚙️ CI/CD Pipeline Configuration

### GitHub Actions (CI)
The `.github/workflows/ci.yml` pipeline triggers automatically on pushes to `main`. It performs:
1. Node 22 environment setup.
2. Dependency installation (`npm install`).
3. Prisma Client generation (`npx prisma generate`).
4. Unit testing execution (`npx vitest run`).
5. Type-checking and build validation (`npm run build`).

### Vercel Deployment (CD)
- Deployment is connected via GitHub webhooks.
- Includes `postinstall: "prisma generate"` in `package.json` to ensure serverless functions generate up-to-date types on cloud deployments.

---

## 📜 License & Acknowledgments
Built for the **House of Edtech Fullstack Developer Assignment**.
