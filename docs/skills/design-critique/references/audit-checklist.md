# UI/UX Audit Checklist

Based on Nielsen's heuristics, visual hierarchy, Gestalt, WCAG 2.2 AA and design-system consistency.

## Scoring

| Score | Meaning |
|---|---|
| 2 | Pass: fully meets the standard across audited screens and viewports |
| 1 | Partial: meets it on the happy path, breaks in edge cases, secondary views or some breakpoints |
| 0 | Fail: missing, broken, or violates the standard |
| N/A | Does not apply. Write the reason, and remove the item's 2 points from the maximum. |
| Not assessed | Could not be verified. Excluded from the score and listed in the report. |

**Overall % = points earned ÷ points possible × 100**

| Overall | Rating | Action |
|---|---|---|
| 90–100% | Excellent | Polish |
| 75–89% | Good | Fix the weak categories |
| 60–74% | Needs work | Fix high-impact items first |
| < 60% | Critical | Structural redesign |

A verified P0 overrides any score.

## Severity

| Level | Definition |
|---|---|
| P0 Blocker | Prevents task completion, loses data, exposes data, or breaks a legal accessibility requirement on a critical journey |
| P1 High | Significant friction or frequent confusion on an important task |
| P2 Medium | Noticeable, with a reasonable workaround |
| P3 Low | Polish or consistency |

Severity is impact × reach × likelihood, not effort or how prominent the issue looks.

## Checklist

### 1. First impression & clarity (10)
- 1.1 Purpose of the screen is clear within 5 seconds
- 1.2 Primary action is visible without scrolling and is the most prominent control
- 1.3 Hierarchy guides the eye to the most important element first
- 1.4 Free of visual noise; decoration does not compete with content
- 1.5 Orientation and trust cues (product name, scope, freshness of data) appear early where relevant

### 2. Navigation & information architecture (14)
- 2.1 Labels use the user's language, not internal jargon or table names
- 2.2 Top-level navigation is scannable (≈7 items or fewer)
- 2.3 Current location is clearly indicated
- 2.4 Key content is reachable in 3 steps or fewer from the main entry points
- 2.5 Search, if present, is discoverable and handles no-result states
- 2.6 Deeper pages show where the user is and how to go back
- 2.7 Navigation patterns are consistent across the product

### 3. Visual hierarchy & layout (12)
- 3.1 Clear size, weight and colour hierarchy (heading vs body vs action)
- 3.2 Consistent spacing scale and alignment; cards in a row share height and edges
- 3.3 Adequate whitespace; inner padding ≤ gap between groups
- 3.4 Related elements are grouped (proximity / common region)
- 3.5 Layout works at mobile, tablet and desktop
- 3.6 No unintended horizontal scroll or clipped content at standard viewports

### 4. Interaction & usability (20)
- 4.1 System status is visible (loading, saving, progress, last updated)
- 4.2 Language matches the user's mental model
- 4.3 Users can cancel, undo, go back or exit
- 4.4 Components, patterns and terminology are consistent
- 4.5 Errors are prevented (constraints, defaults, confirmation of destructive actions)
- 4.6 Recognition over recall: options and status are visible
- 4.7 Accelerators for experts without cluttering the novice path
- 4.8 Minimalist: no irrelevant or duplicated information competing for attention
- 4.9 Error messages say what happened and how to recover
- 4.10 Help is available where the task needs it

### 5. Forms & input (12)
- 5.1 Visible, associated labels (placeholder is not a label)
- 5.2 Validation is timely (on blur or submit) and specific
- 5.3 Required and optional fields are indicated
- 5.4 Input types and autocomplete attributes are correct
- 5.5 Forms are logical, single-column where possible, and not overly long
- 5.6 Clear success and error feedback after submission; input is preserved on error

### 6. Accessibility, WCAG 2.2 AA (16)
- 6.1 Text contrast ≥ 4.5:1 (≥ 3:1 for large text); UI components and focus rings ≥ 3:1
- 6.2 Everything is keyboard operable, with a visible focus indicator and logical order
- 6.3 Logical heading levels, semantic HTML and landmarks
- 6.4 Meaningful images have alt text; decorative ones are hidden
- 6.5 Controls have accessible names
- 6.6 Meaning is never carried by colour alone
- 6.7 Works at 200% zoom and 320 px width without loss
- 6.8 Targets are at least 24×24 CSS px with spacing (AA); 44×44 recommended for touch

### 7. Feedback, states & micro-interactions (10)
- 7.1 Hover, focus, active, disabled, loading and error states exist
- 7.2 Loading indicators or skeletons appear for anything noticeably slow
- 7.3 Important actions are confirmed
- 7.4 Empty states explain why and offer the next action
- 7.5 Motion is purposeful, 150–300 ms, and honours `prefers-reduced-motion`

### 8. Consistency & design system (10)
- 8.1 Buttons, inputs and cards follow one visual language
- 8.2 Spacing, type scale and colour come from tokens, not one-off values
- 8.3 Icon style and size are consistent
- 8.4 Similar interactions behave the same way everywhere
- 8.5 Dark mode keeps hierarchy and contrast

### 9. Mobile & responsive (10)
- 9.1 Layout adapts without broken or overlapping elements
- 9.2 Primary actions are within easy thumb reach
- 9.3 Text is readable without horizontal scrolling
- 9.4 Touch targets and spacing prevent mis-taps
- 9.5 Dense tables or timelines have a deliberate narrow-screen strategy

### 10. Content, trust & honesty (10)
- 10.1 Copy is clear, concise and in the user's language
- 10.2 Next steps are obvious
- 10.3 Figures are real and traceable; trend indicators have a real baseline
- 10.4 No placeholder or lorem ipsum text
- 10.5 Error and empty states use human language

Total: 124 points.

## Findings register (one row per finding)

| ID | Severity | Screen / viewport | Evidence | Checklist item | Fix |
|---|---|---|---|---|---|
| F-01 | P1 | Dashboard / 390 | Stat tiles clip at 390 px (screenshot) | 3.5, 9.1 | Two-column grid below `sm` |

## Report format

```markdown
# Design critique: [screen / scope]

**Viewports:** 1440 · 1024 · 390 · dark   **Target:** WCAG 2.2 AA
**Not assessed:** [items and why]

| Category | Max | Before | After |
|---|---|---|---|
| 1. First impression | 10 | | |
| … | | | |
| **Total** | 124 | **x%** | **y%** |

## Fixed (by severity)
1. [P1] Finding — evidence — what changed

## Remaining
- [P2] Finding — why it stays, and the suggested next step
```
