---
name: release-qa-gate
description: Use when asked whether something is ready to ship, for a go/no-go or release decision, a QA or test plan, a release checklist, release evidence, or defect severity triage for a release. Does not apply to reviewing code structure (use code-architecture-review), critiquing or fixing a UI (use design-critique), or setting up CI/deploy infrastructure.
type: skill
version: 0.1.0
---

# Release QA Gate

You run a release gate. You collect evidence for each quality pillar, find the gaps, close the ones you can (run tests, scans, builds), and then state a decision that is backed by evidence.

## Hard rules

1. **Approve on evidence, not confidence.** Every gate is Pass, Fail, approved N/A (with a written reason), or Not reviewed. Not reviewed is never a pass.
2. **Never invent results.** Run the check and quote its output, or mark it Not reviewed. This applies to test counts, scan findings, Lighthouse scores and Web Vitals.
3. **Never fill in an approval or sign-off** for a person. List who must approve.
4. **An open P0 means NO-GO.** No score, deadline or waiver overrides a legal, safety, security, privacy or data-loss blocker.
5. **P1 means NO-GO by default.** It can ship only with a named owner's accepted risk, a mitigation, an expiry date and monitoring.
6. **Scale to risk.** Pick the tier before testing. Re-tier if the scope touches auth, payments, migrations or personal data.

## Procedure

| Step | Do |
|---|---|
| 1. Scope | Identify the build, the change list, and the affected journeys. Set the tier (table below). |
| 2. Gather | For each gate in `references/gates.md`, collect evidence. Run what you can: typecheck, lint, tests, build, `npm audit`, a smoke run of critical paths. Use design-critique for usability and accessibility evidence. |
| 3. Triage | Classify each defect P0–P3. |
| 4. Close gaps | When asked to improve readiness: fix what is in scope, re-run the check, and update the evidence. |
| 5. Decide | Use the decision logic below, then write the release record. |

## Tiers

| Tier | Typical change | Minimum verification |
|---|---|---|
| 1 Routine | Reversible UI or content change, no sensitive data | Automated checks, focused regression, affected-device smoke test |
| 2 Standard | New journey, form, integration, or permission change | Tier 1 plus integration and critical-path tests, keyboard and accessibility review, cross-browser check, dependency review |
| 3 Elevated | Auth, payments, migrations, personal data, high availability | Tier 2 plus threat review, authorization tests, rollback rehearsal, load and failure tests |

## Decision logic (first match wins)

1. P0 open → **NO-GO**
2. Any gate Fail → **NO-GO**
3. Any gate Not reviewed, or an N/A without a reason → **HOLD**
4. P1 open without an accepted owner, mitigation and expiry → **NO-GO**
5. P1 accepted, or P2/P3 open → **CONDITIONAL GO** (list the conditions, owners and dates)
6. Otherwise → **GO**

## Release record

```markdown
# Release: <version> · Tier <n> · <date>
**Decision:** GO | CONDITIONAL GO | HOLD | NO-GO

| Gate | Status | Evidence |
|---|---|---|
| A Functionality | | |
| B Usability & design | | |
| C Accessibility | | |
| D Performance | | |
| E Security & privacy | | |
| F Reliability & release readiness | | |

**Open defects:** P0 0 · P1 n · P2 n · P3 n (each with owner and ticket)
**Conditions / waivers:** owner, mitigation, expiry
**Not reviewed:** items and why
**Approvals required:** Engineering lead · QA · Product · Security (if Tier 3)
**Post-release:** watch window, signals, rollback trigger
```

## Reference

| File | Read when |
|---|---|
| `references/gates.md` | Step 2: the checks and pass criteria for each gate, severity definitions, the performance targets, and the post-release checklist |
