# SYNC_ARCHITECTURE.md

## Principle

> Inference and screening must never wait for the network. — Blueprint §08

Every write at the edge commits to SQLite first and is queued for replication
second. `SyncManager` (`src/services/syncManager.js`) never sits in the
request path of a clinical action — `imageService.upload`,
`analysisService.run`, and `reviewerService.decide` all call
`syncService.enqueue()` as a fire-and-forget step *after* their local
transaction succeeds.

```
technician action ──▶ SQLite write (commits immediately)
                              │
                              └──▶ sync_queue row (status='pending')
                                          │
                            (independent, scheduled or manual)
                                          ▼
                                   SyncManager.push()
                                          │
                          district reachable?  ── no ──▶ {skipped:true}, retry later
                                          │ yes
                                          ▼
                        district TX: check sync_receipts (dedupe)
                                          │
                              version conflict? ── yes ──▶ status='conflict', surfaced via
                                          │ no                GET /sync/conflicts
                                          ▼
                              upsert into district table
                              record sync_receipts row
                              mark edge sync_queue row 'synced'
```

## Idempotency, twice over

1. **Enqueue-side**: `SyncManager.enqueue()` derives the outbox key as
   `sha256(siteId | entityType | entityId | operation | version)`
   (`utils/ids.js:deterministicKey`). Calling `enqueue` twice for the same
   logical change updates the pending row's payload instead of creating a
   duplicate — important because several services (e.g. `analysisService`
   completing, then a later correction) can enqueue the same entity more than
   once before a push happens.
2. **Push-side**: the district node keeps a `sync_receipts` ledger keyed by
   the same idempotency key. If the edge node's push crashes after the
   district committed but before the edge received the ACK, the edge retries
   the same row — and the district recognises the key and returns
   `duplicate` without re-applying the write.

## Retry and backoff

`SyncQueueRepository.markFailed` increments `attempts` and schedules
`next_attempt_at` using full-jitter exponential backoff
(`utils/time.js:backoffMs`, base `SYNC_BASE_BACKOFF_MS`, capped at 30
minutes). After `SYNC_MAX_ATTEMPTS` (default 8) the row moves to `status =
'failed'` and stops being retried automatically — visible at `GET
/sync/status` under `byStatus.failed`, and requeueable by an admin action if
needed.

Rows that were claimed (`status = 'in_flight'`) but never resolved — for
example the process was killed mid-push, or the machine lost power — are
detected by `SyncQueueRepository.requeueStale()` (anything `in_flight` for
more than 5 minutes) and released back to `pending` on the next push cycle.

## Conflict handling: no silent last-writer-wins

For any table carrying a `version` column (`patients`, `consultations`),
`SyncManager.#applyToDistrict` compares the district's current `version`
against the version the edge node is pushing. If the district's version is
*higher* — meaning some other write already landed there (e.g. a second edge
node syncing the same patient, or a district-side correction) — the push is
recorded as a `conflict`, **not** silently overwritten in either direction.
Conflicts surface at `GET /sync/conflicts` for a human (an admin, or the
blueprint's Tanu/Nikhil integration path) to resolve. This is a deliberate
divergence from typical "last write wins" sync systems: clinical data is not
a place to guess.

## Pull direction: reviewer decisions made off-site

A doctor may adjudicate a case remotely at the district office while the PHC
that captured it is offline. `SyncManager.pull()` fetches `reviews` rows
updated at the district since a given timestamp, so the edge node picks up
that decision the next time it has connectivity — the edge is not assumed to
be the only place review can happen, only the only place *capture and AI
inference* must happen.

## Running sync

- **In-process scheduler** (default when the API server runs):
  `syncManager.start()` in `src/server.js` runs a push cycle every
  `SYNC_INTERVAL_MS` (default 60s), skipped entirely in `NODE_ENV=test`.
- **Manual / on-demand**: `POST /sync/push` and `POST /sync/pull` (technician,
  admin, or a district service account).
- **Standalone worker** (recommended for a dedicated sync process separate
  from the API's lifecycle): `node scripts/syncWorker.js --loop`.

## What "offline-first" does **not** mean here

- It does not mean an edge node can operate with an unbounded local identity
  system — `config.auth.offlineGraceHours` bounds how long a previously
  issued access token is trusted before a fresh login is required (see
  `.env.example`), per the blueprint's explicit warning against inventing
  unlimited offline auth.
- It does not mean the district node is optional for a deployment that needs
  district-level dashboards or multi-site reviewer pooling — only that a
  *single edge node* must never require it to screen a patient.
- It does not mean sync conflicts resolve themselves. They are surfaced, not
  hidden.
