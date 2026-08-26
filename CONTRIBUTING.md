# Contributing to Retina-Guard

**SIH 2026 · Problem Statement 26038 · MathWorks**

---

## The one rule

**Nobody pushes to `main`. Ever. Including whoever set up the repo.**

Everything reaches `main` through a pull request. This is enforced by a GitHub
ruleset, so a direct push will simply be rejected — but treat it as a team norm
rather than something the tooling nags you about.

---

## Branch structure

```
main                    protected · always demo-ready · PR only
 └── dev                integration branch · where tracks meet
      ├── feat/ml-*     MATLAB / model work
      ├── feat/web-*    frontend + backend work
      ├── feat/sim-*    Simulink workflow model
      ├── fix/*         bug fixes
      └── docs/*        documentation only
```

### Why two tiers

The team works in two largely independent tracks — the MATLAB/ML pipeline and the
web layer — that meet only at the report JSON contract. `dev` is where they
integrate. `main` stays clean so there is always a branch you can demo from
without discovering something broke an hour before a review.

### Naming

Prefix with the track, describe the change, use hyphens:

```
feat/web-reviewer-worklist
feat/ml-quality-gate
feat/sim-recapture-loop
fix/web-overlay-alignment
docs/report-contract-v1
```

---

## Workflow

```bash
# 1. Start from an up-to-date dev
git checkout dev
git pull origin dev

# 2. Branch
git checkout -b feat/web-reviewer-worklist

# 3. Work, committing as you go
git add .
git commit -m "Add prioritised worklist ordering"

# 4. Push
git push -u origin feat/web-reviewer-worklist

# 5. Open a PR into dev on GitHub, get one review, merge.
```

Release to `main` is a PR from `dev`, done at milestones — not per feature.

---

## Commit messages

Present tense, imperative, explain *why* when it is not obvious:

```
Good:  Add .done sentinel check to folder watcher
       Fix overlay misalignment on non-square fundus images
       Reject Grade C images before inference, not after

Bad:   update
       fixed stuff
       asdf
```

---

## Pull requests

- **One PR, one concern.** A PR that touches the model *and* the reviewer UI is two PRs.
- **At least one approval** before merge.
- Fill in the PR template — especially the testing section. "It works on my machine"
  is not a test note.
- Keep them small. A 60-line PR gets reviewed in ten minutes; a 900-line PR sits
  for two days, and on a 25-day clock that is expensive.

---

## What must never be committed

| Never | Why |
|---|---|
| Dataset images (APTOS, IDRiD, DRIVE, Messidor-2) | Multi-GB and licensed. `datasets/` is read-only by design. |
| Trained model weights | Large binaries. Tracked by the model registry, not git. |
| `.env`, API keys, tokens, credentials | Repo is **public**. |
| Patient images of any kind | Even test data. Only synthetic fixtures. |
| Anything in `experiments/` or `results/` | Machine-written. Hand-editing results is how a project loses the ability to trust its own numbers. |

`.gitignore` covers all of these. If you find yourself using `git add -f` to get
past it, stop and ask why.

> **The repo is public.** Before every commit, check what you are staging.
> `git status` after a broad `git add .` takes two seconds and has saved many
> people from publishing a credential.

---

## Track ownership

| Track | Scope |
|---|---|
| **ML / MATLAB** | Image quality, preprocessing, segmentation, lesion detection, DR grading, Grad-CAM, calibration |
| **Web** | District backend, database, REST API, reviewer app, dashboard, folder-watcher ingestion |
| **Simulink** | Telemedicine workflow model, capacity scenarios |

The tracks meet at **`docs/report-contract.md`** and nowhere else. If you need to
change that file, it affects both tracks — flag it in the PR and get review from
someone on the other side.
