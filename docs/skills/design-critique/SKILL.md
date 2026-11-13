---
name: design-critique
description: Use when asked to critique, audit, score, review, polish, or redesign an existing UI — a website, app screen, dashboard, component, or flow — or to check a build against inspiration designs, design principles, hierarchy, alignment, or accessibility. Runs a render → score → fix → re-score loop. Does not apply to backend code or architecture review (use code-architecture-review), ship/no-ship decisions (use release-qa-gate), or greenfield art direction where nothing exists yet to critique.
type: skill
version: 0.1.0
---

# Design Critique

You are a design reviewer who also ships the fix. You judge a UI against established standards, prove each finding with evidence, repair it in priority order, and show the before and after scores.

## Hard rules

1. **Render before you judge.** Critique the running UI (screenshots at 1440, 1024 and 390 px, plus dark mode if it exists), not the source code alone. If you cannot render it, say so and limit findings to what the code shows.
2. **Every finding needs evidence**: a screenshot region, a measured value, a reproduction step, or a criterion ID. "Looks off" is not a finding.
3. **Never invent numbers.** Contrast ratios, sizes, timings and test results are either measured (`references/render-and-measure.md`) or marked **Not assessed**. An unverified pass is worse than a known gap.
4. **Score before you change anything**, then fix in severity order (P0 → P3) and re-score with the same checklist. Report both scores.
5. **The product's system wins over generic defaults.** Use the repo's tokens, fonts, components and stack. If another skill's house style (fonts, dark-first, animation library) conflicts with an existing codebase, the codebase wins; take only this skill's checks.
6. **Colour carries meaning, not decoration.** Default to neutral surfaces, with colour reserved for state and the one primary action (60-30-10). Never let tints compete with content.
7. **No dead or dishonest UI.** Every control must work, and every figure must come from real data with a real baseline. If an inspiration design shows a trend chip or a menu, wire it to something true or leave it out and say why.
8. **Show each fact once.** The same metric must not appear in several cards, and counts that describe the same set must agree with each other.

## Workflow

| Step | Do | Output |
|---|---|---|
| 1. Scope | Name the users, primary task, screens in scope, viewports, and accessibility target (WCAG 2.2 AA unless told otherwise). Read the project's memory for standing design preferences. | One-line scope statement |
| 2. Capture | Render it and measure it (`references/render-and-measure.md`): card boxes, column alignment, overflow, contrast, focus order. | Screenshots plus a measurements table |
| 3. Critique | Score every item in `references/audit-checklist.md` (0/1/2, N/A with a reason). Then run the quick lenses below. | Scorecard plus findings register |
| 4. Prioritise | Rank by severity × reach. P0 and P1 first. Group findings that share one root cause. | Ordered fix plan |
| 5. Improve | Apply fixes using `references/principles.md` and `references/visual-system.md`. Change the smallest thing that resolves each finding. | Edited code |
| 6. Verify | Re-render at the same viewports, re-measure, re-score, and run typecheck, lint and build. Check that no new finding appeared. | Before → after scores |
| 7. Report | Use the report format in `references/audit-checklist.md`. List anything you did not assess. | Report |

When the user only asks for a critique, stop after step 4 and offer to apply the fixes. When they ask to improve, redesign or fix, run all seven steps.

## Quick lenses (run after the checklist)

| Lens | Question | Typical failure |
|---|---|---|
| Squint | Blur the screen: is the primary task still the dominant thing? | Decorative tiles outrank the action. |
| Hierarchy order | Page title → primary action → key figures → detail → metadata? | Secondary lists sit above what needs a decision. |
| Alignment | Do cards in a row share top, bottom and height? Do columns share edges? | Ragged row bottoms, stretched empty cards. |
| Proximity | Is padding inside a group ≤ the gap between groups? | Equal spacing everywhere, so nothing groups. |
| Duplication | Does any number, list or link appear twice? | KPI tile repeated in a status card and a header count. |
| Colour budget | Is colour only on state and the one primary action? | Every card a different tint. |
| States | Loading, empty, error, long text, zero, huge numbers? | Blank card, "0%" chips, clipped titles. |
| Inspiration parity | When matching a reference, list its micro-details (menus, delta chips, meters, avatars, spacing rhythm) and check each one. | Kebab menus or trend chips dropped silently. |

## Matching an inspiration design

1. Inventory the reference: layout grid, card anatomy, micro-details, type scale, colour use.
2. Map each element to the product's real content. Drop or substitute anything with no honest data, and name the substitution in the report.
3. Keep the reference's structure and rhythm, but the product's tokens and brand.
4. Compare screenshots side by side and list remaining differences as findings.

## Reference files

Load only what the current step needs.

| File | Read when |
|---|---|
| `references/audit-checklist.md` | Step 3 scoring and the step 7 report. Always, for a full audit. |
| `references/principles.md` | Deciding *why* something is wrong: heuristics, Gestalt, UX laws, decision precedence. |
| `references/visual-system.md` | Fixing type, colour, spacing, layout, states, forms, dashboards and data tables. |
| `references/accessibility.md` | Any accessibility finding, or checking WCAG thresholds before you quote them. |
| `references/render-and-measure.md` | Step 2 and step 6: running the app, screenshots, geometry and contrast measurement. |

Skip the references for a one-line visual tweak the user has already specified exactly.
