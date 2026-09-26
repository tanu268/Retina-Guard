# RetinaGuard Traceability Matrix

| Req ID | Description | SimEvents Implementation | Verification Status |
|--------|-------------|--------------------------|---------------------|
| REQ-01 | Patient generator | `sldelib/Entity Generator` block. Period set to 0.5. | Verified |
| REQ-02 | Image Capture Queue | `sldelib/Entity Queue` block (Patient Queue). Infinite capacity. | Verified |
| REQ-03 | Image Capture Server | `sldelib/Entity Server` block. Uses workspace param `capture_capacity`. | Verified |
| REQ-04 | Poor Image Quality Rework | Handled structurally via effective service time: `t / (1 - p_poor)`. | Verified |
| REQ-05 | AI Server | `sldelib/Entity Server` block. Infinite capacity (delay only). | Verified |
| REQ-06 | AI Diagnostic Logic | Implemented via `EntryAction` random probability generator. Sets `AIResult`. | Verified |
| REQ-07 | Routing Logic | `sldelib/Entity Output Switch` configured to route based on `AIResult`. | Verified |
| REQ-08 | Specialist Review Queue | `sldelib/Entity Queue` block (Reviewer Queue). Infinite capacity. | Verified |
| REQ-09 | Specialist Review Server | `sldelib/Entity Server` block. Uses workspace param `reviewer_capacity`. | Verified |
| REQ-10 | Metric Collection | `To Workspace` blocks connected to enabled stats ports (Utilization, Wait, Departed). | Verified |
