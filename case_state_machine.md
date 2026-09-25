# RetinaGuard Case State Machine

> [!IMPORTANT]
> **INTEGRATION INVARIANT:** `SERVER CASE STATE` and `LOCAL OFFLINE/SYNC STATE` are entirely distinct domains. They must not be merged. Local sync states govern frontend IndexedDB reconciliation, while server states reflect authoritative clinical progress.

## Authoritative States (Database: `consultations.status`)

1. **`awaiting_image`**
   - **Trigger:** Case created (via Technician upload request, before image is fully processed).
   - **Allowed Next States:** `awaiting_analysis`, `image_rejected` (Quality failure).

2. **`awaiting_analysis`**
   - **Trigger:** Image uploaded successfully, quality passed.
   - **Allowed Next States:** `awaiting_review`, `analysis_failed`.

3. **`awaiting_review`**
   - **Trigger:** AI Analysis completed successfully.
   - **Allowed Next States:** `completed`.

4. **`completed`**
   - **Trigger:** Human Reviewer submits review.
   - **Allowed Next States:** None. (Terminal State)

## Failure / Exception States
- **`image_rejected`**
  - **Trigger:** Image quality gate fails.
- **`analysis_failed`**
  - **Trigger:** MATLAB Inference exception / Malformed payload.

## Offline / Sync States (Frontend: IndexedDB)
- **`SYNC_PENDING`**: Case is persisted locally, waiting for network.
- **`SYNC_FAILED`**: Sync attempt failed, case remains queued for retry.
- **`SYNC_COMPLETED`**: Reconciled with backend (transition to authoritative Server State).

## Transitions Matrix
| Current State | Event | Target State | Notes |
|---|---|---|---|
| *Null* | Case Creation | `awaiting_image` | Offline-first sync capable |
| `awaiting_image` | Image Quality Pass | `awaiting_analysis` | |
| `awaiting_image` | Image Quality Fail | `image_rejected` | |
| `awaiting_analysis` | Inference Success | `awaiting_review` | |
| `awaiting_analysis` | Inference Exception | `analysis_failed` | Returns 500/Logged |
| `awaiting_review` | Review Submitted | `completed` | Review record generated |
