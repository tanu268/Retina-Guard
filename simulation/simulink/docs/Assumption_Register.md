# RetinaGuard Assumption Register

| ID | Assumption | Rationale / Driver | Impact on Model |
|----|------------|--------------------|-----------------|
| ASM-01 | Rework loop absorbed as inflated service time | Dynamic assignment of new attributes failed in codegen mode; cycling entities caused type collision. | Removes physical loop topology. Simplifies validation. Inflates capture service time: $T_c = T_c / (1 - P_{poor})$. |
| ASM-02 | Patient arrival rate | Not explicitly stated. Assumed continuous flow to stress the system (1 patient per 30 seconds). | System will reach maximum throughput bound by the primary bottleneck (Capture servers or Reviewers). |
| ASM-03 | AI processing concurrency | The AI Server is treated as having infinite capacity, implying cloud auto-scaling handles all requests concurrently. | AI step induces a pure delay (3 mins) rather than a queuing bottleneck. |
| ASM-04 | Steady-state statistics | Utilization and average metrics are averaged over the 480-minute simulation timeline. | Startup transients are included in the average. |
| ASM-05 | Constant Service Times | To maintain deterministic modeling and focus on capacity bottlenecks, service times are treated as constants rather than stochastic distributions. | Reduces variance. Model focuses purely on throughput limits and routing logic. |
