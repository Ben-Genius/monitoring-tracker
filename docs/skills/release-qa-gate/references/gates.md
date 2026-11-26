# Gates and pass criteria

## Entry criteria
- Scope is frozen; the build or artifact is identified
- Known high-severity defects are fixed or explicitly accepted
- The environment is representative (data, integrations, feature flags)
- A rollback or forward-fix plan exists for risky changes

## Gate A: Functionality & regression
| Check | Pass |
|---|---|
| Critical journeys end to end | All pass on target environments |
| Acceptance criteria | Signed off |
| Regression suite | No new P0/P1 failures |
| Forms, validation, errors | Correct messages, recovery path, no data loss |
| Roles and permissions | Allowed and forbidden actions both tested |
| Data integrity | Create, read, update, delete, exports and calculations correct; no duplicates on retry or double click |
| Edge cases | Empty, boundary, malformed, long and Unicode input |

## Gate B: Usability & design consistency
Use design-critique's audit for evidence. Pass: primary actions are clear, states (loading, empty, error, success) are present, responsive layouts work, there is no placeholder copy, and the design system is followed.

## Gate C: Accessibility (WCAG 2.2 AA)
| Check | Pass |
|---|---|
| Automated scan (axe / Lighthouse) | Zero critical or serious violations on changed views |
| Keyboard | All critical flows completable, with visible focus and no traps |
| Semantics | Headings, landmarks, labels, names |
| Contrast | 4.5:1 text, 3:1 large text and UI components (measured) |
| Screen reader sample | Critical flows announced correctly |
| Zoom / reflow | 200% zoom and 320 px width without loss |
| Reduced motion | Honoured |

An automated scan alone is not conformance.

## Gate D: Performance
| Metric | Good | Block |
|---|---|---|
| LCP (p75) | ≤ 2.5 s | > 4.0 s |
| INP (p75) | ≤ 200 ms | > 500 ms |
| CLS (p75) | ≤ 0.1 | > 0.25 |
| Bundle | Within the product budget; no unexplained regression | — |
| Realistic data volume | Stays responsive | — |

Use field data where it exists. Otherwise state the lab conditions.

## Gate E: Security & privacy
Authentication and sessions · authorization on every resource (including IDOR) · input validation and output encoding · no secrets in the repo or bundle · TLS and security headers · PII minimized and kept out of logs and URLs · dependency scan with no unaccepted high or critical issues · consent and notices work.

## Gate F: Reliability & release readiness
Errors are captured and alerting · health checks work · feature flags default to safe · rollback documented and tested where practical · migrations reversible or safely forward-only · release notes ready · on-call informed.

## Severity
| Level | Definition | Default |
|---|---|---|
| P0 | Data loss or exposure, security breach, outage, legal or safety issue, critical task impossible | NO-GO; fix and retest |
| P1 | Major function broken, or a user group blocked, with no acceptable workaround | NO-GO unless formally accepted |
| P2 | Impaired, with a reasonable workaround | Ship with owner and date |
| P3 | Cosmetic or minor | Backlog |

## Post-release (24–72 h)
- [ ] The deployed version matches the approved build
- [ ] Error rate and latency are at or below baseline
- [ ] Feature flags are in their intended state
- [ ] The rollback trigger is defined and was not hit
- [ ] Escaped defects are fed back into tests or this checklist
