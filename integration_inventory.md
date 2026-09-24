# RetinaGuard Integration Inventory

| Component | Purpose | Owner/Module | Input | Output | Persistence | Dependencies | Integration Risk | Verification |
|---|---|---|---|---|---|---|---|---|
| **Frontend UI** | User interaction | `RetinaGuard-Frontend-v3` | User Data, API Resp | API Req | IndexedDB | Backend API | Low (Fixed by Engineer 2 - Requires Integration Validation) | E2E Tests, Manual |
| **API Layer** | Routing & Validation | `cases.routes.js` | HTTP Req | HTTP Resp | None | Controllers, Middleware | Low | Unit & Integration Tests |
| **Consultation Management** | Case Lifecycle | `consultationService.js`| DTO | Entities | SQLite (`consultations`) | DB Layer | Medium | Golden Fixture |
| **Image Service** | Storage & Quality | `imageService.js` | File, Metadata | Image Entity | SQLite (`images`), Disk | DB Layer, FS | Medium | Golden Fixture |
| **Analysis Service** | AI Orchestration | `analysisService.js` | Case Context | Analysis Result | SQLite (`analyses`) | Matlab Service | High | Golden Fixture |
| **Matlab Service** | Inference Adapter | `matlabService.js` | Image Path | Prediction, GradCAM | None | Matlab Runtime/Mock | High (Runtime dependency) | Golden Fixture, Unit Tests |
| **Reviewer Service** | Human Adjudication | `reviewerService.js` | Review DTO | Review Entity | SQLite (`reviews`) | DB Layer | Medium (Idempotency) | Concurrency Tests |
| **Offline Store** | Browser Persistence | Frontend IDB | User Data | Sync Payloads | IndexedDB | None | High (Data Loss) | Offline Sync Browser Recording |
| **Sync/Outbox** | Network Reconnect | Frontend Sync | Offline Queue | API Req | IndexedDB | Backend API | High | Offline Sync Browser Recording |
| **Authentication** | Bearer Token Validation| `authenticate.js` | HTTP Headers | `req.user` | None | JWT | Low | RBAC Tests |
| **Authorization** | Endpoint Isolation | `authorize.js` | `req.user.role` | Allow/Deny | None | None | Low | RBAC Tests |
| **Audit/Logging** | Observability | `logger.js` | App Events | Logs | Disk (`stdout`) | None | Low | Failure-Logging Tests |
| **Database** | Primary Persistence | `sqliteDatabase.js` | SQL | Rows | SQLite | None | Medium | Integration Tests |
