# Security & Architecture Considerations

This document outlines the theoretical mitigation strategies and contingency plans for real-world production challenges as required by the assignment guidelines.

## 1. Malicious Synchronization Payloads (OOM Prevention)

**Challenge:** A malicious actor sends a massive, malformed synchronization payload attempting to crash the Node.js server via an Out-of-Memory (OOM) error.

**Mitigation Strategies:**
- **Strict Payload Size Limits:** Configure the Next.js API body parser to reject requests over a certain threshold (e.g., `bodyParser: { sizeLimit: '1mb' }`). This drops massive payloads at the framework level before they reach our application memory.
- **Streaming Parsers:** For endpoints expecting larger legitimate payloads (like snapshot data), we would stream the request body directly to a cloud storage bucket (like AWS S3) rather than buffering it entirely in the Node.js heap.
- **Zod Schema Validation:** Every incoming CRDT operation is strictly validated against a schema (e.g., using `zod`). If the payload contains unexpected or deeply nested properties designed to cause exponential parsing time, the schema validation will fail and reject it.
- **Rate Limiting (DDoS Protection):** Implement strict IP and user-level rate limiting on the `/api/sync/push` endpoint using Redis or Vercel Edge middleware to prevent an attacker from flooding the server with thousands of small requests.

## 2. Tenant Isolation & Data Security

**Challenge:** Ensuring users cannot read or overwrite documents they do not own or have not been granted explicit access to.

**Mitigation Strategies:**
- **Strict ORM Scoping (Implemented):** In every API route, database queries are strictly scoped to the `userId` extracted from the secure HTTP-only JWT cookie. For example, `prisma.document.findUnique({ where: { id: docId, ownerId: user.id } })`. This ensures that even if an attacker guesses a valid `documentId`, the query returns null if they aren't the owner or an authorized collaborator.
- **Role-Based Access Control (RBAC):** We enforce granular roles (`OWNER`, `EDITOR`, `VIEWER`). The server explicitly rejects `POST /api/sync/push` requests if the requesting user's resolved role is `VIEWER`.
- **PostgreSQL Row Level Security (RLS):** If migrating from Prisma to Supabase or direct SQL, we would define RLS policies at the database engine level (e.g., `CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = owner_id)`). This provides a defense-in-depth approach where the database inherently rejects unauthorized queries even if a flaw exists in the application logic.

## 3. Distributed Systems Race Conditions

**Challenge:** Handling concurrent edits when users regain connectivity simultaneously after being offline.

**Mitigation Strategies:**
- **Deterministic CRDTs (Implemented):** We use a fractional indexing algorithm combined with a Last-Write-Wins (LWW) resolution strategy. Each block operation includes a `version`, `clientTimestamp`, and `clientId`. If a race condition occurs, all clients definitively fall back to comparing timestamps and client IDs, guaranteeing identical convergence across all nodes without data corruption.

## 4. Scalability Contingency Plan

**Challenge:** Handling document state size over time as thousands of blocks and versions accumulate.

**Mitigation Strategies:**
- **Snapshotting & Log Compaction:** Instead of replaying the entire `SyncLog` history to rebuild document state on load, we periodically flatten the state into a `Snapshot` and truncate the `SyncLog`. The client then only loads the latest Snapshot and applies any recent logs.
- **Horizontal Scaling:** Because the sync logic relies on database row-locks rather than in-memory Node state, the backend can be horizontally scaled infinitely behind a load balancer.
