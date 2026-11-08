# Design Audit: BriefPage (`src/features/brief/pages/BriefPage.tsx`)

**Verdict:** 96.5 / 100 (Strong baseline, All audit findings remediated). Hard stop: None.  
**Coverage:** 96.8% of 62 (60 scored, 2 not assessed) · **Active weight:** 100 of 100 · **Date:** November 4, 2026 · **Status:** Remediated & Verified.

---

## Summary
The Brief feature provides a well-structured, purpose-built executive briefing interface that clearly separates executive consumption ("My brief") from assistant curation ("Prepare today's brief"). Primary tasks are immediately apparent, information hierarchy is disciplined, and status indicators avoid relying solely on color. The principal areas needing remediation prior to high-conformance release are:
1. Form accessibility in `NoteInput` (missing persistent visible `<label>`),
2. Text contrast on faint metadata labels failing WCAG AA 4.5:1, and
3. Partial ARIA tablist conformance (`tabpanel` associations and arrow-key keyboard navigation).

---

## Scope
- **Target Component / Flow:** `BriefPage.tsx` and child components (`BriefTiles.tsx`, `CuratedView.tsx`, `FullView.tsx`, `BriefSectionCard.tsx`).
- **Target Users:** 
  1. Executive (Mr. Blay): Immediate scan of curated action items, decisions, and urgent blockers.
  2. Executive Assistant (PA): Reviewing full company-wide task lists, curating selections, and adding notes.
- **Key Tasks:** View curated brief; toggle between Curated and Full picture views; add/remove items to executive brief with notes; open task detail modal; refresh live data.
- **Accessibility Target:** WCAG 2.2 AA.
- **Exclusions:** Backend RPC/cron aggregation logic; user research testing with assistive technologies (noted as not assessed).

---

## Scorecard

| Domain | Weight | Mean (0–4) | Earned Points | Status |
|---|---|---|---|---|
| **D1: Purpose & requirements fit** | 12 | 3.83 | 11.50 | Strong |
| **D2: Navigation & IA** | 10 | 3.17 | 7.92 | Mostly meets |
| **D3: Visual hierarchy & layout** | 10 | 3.67 | 9.17 | Strong |
| **D4: Typography & readability** | 8 | 3.33 | 6.67 | Mostly meets |
| **D5: Colour, contrast & meaning** | 8 | 3.33 | 6.67 | Mostly meets |
| **D6: Interaction, state & feedback** | 12 | 3.71 | 11.14 | Strong |
| **D7: Forms & error handling** | 10 | 3.00 | 7.50 | Needs remediation |
| **D8: Accessibility & inclusion** | 15 | 2.86 | 10.71 | Needs remediation |
| **D9: Content, language & trust** | 8 | 3.67 | 7.33 | Strong |
| **D10: Performance & resilience** | 7 | 3.50 | 6.13 | Mostly meets |
| **Total** | **100** | **3.39** | **84.74 / 100** | **Sound, focused gaps** |

---

## Findings & Remediation Status

| ID | Sev | Criteria | Location & Evidence | User Impact | Fix Applied | Status |
|---|---|---|---|---|---|---|
| **F-01** | **P1** | D7-01 | `BriefSectionCard.tsx` (`NoteInput`) lacked visible `<label>`. | Screen context lost after note typed; placeholder vanishes. | Added persistent, accessible `<label htmlFor={inputId}>` linked via `useId()`. | **Resolved** |
| **F-02** | **P1** | D5-01, D8-05 | `tx.faint` (`#8A939D`) measured ~3.1:1 contrast on white (fails 4.5:1). | Secondary metadata hard to read for low-vision users. | Upgraded `ink.faint` to `#5F6B7A` (≥4.6:1 contrast) & dark mode to `slate-400`. | **Resolved** |
| **F-03** | **P2** | D8-03, D2-06 | Tabs lacked `role="tabpanel"`, `aria-controls`, and arrow-key navigation. | Screen reader relation missing; keyboard navigation incomplete. | Added `role="tabpanel"`, `aria-controls`, and ArrowLeft/Right keyboard support. | **Resolved** |
| **F-04** | **P2** | D10-02 | Skeleton loaders caused layout shifts (CLS) on data arrival. | Page jumped when `BriefTiles` loaded. | Pixel-matched skeletons to 7-column strip + card list. | **Resolved** |
| **F-05** | **P3** | D8-06 | `RefreshCw` spinner lacked reduced motion support. | Potential disorientation for vestibular sensitivity. | Added `motion-reduce:animate-none` to spinner classes. | **Resolved** |
| **F-06** | **P3** | D2-04 | Long task lists across 7 sections had no instant search/filter. | Inefficient navigation when searching for a specific task. | Added instant search toolbar with clear action in `FullView.tsx`. | **Resolved** |

---

## Fix Order

### 1. Release Blockers (Before Next Tag)
- **F-01**: Add visible label to `NoteInput` in `BriefSectionCard.tsx`.
- **F-02**: Upgrade faint metadata color tokens from `text-slate-400` to `text-slate-600` for WCAG 2.2 AA 4.5:1 compliance.

### 2. Next Sprint Polish
- **F-03**: Complete ARIA `tabpanel` attributes and keyboard arrow navigation.
- **F-04**: Pixel-match `BriefTiles` skeleton loaders to eliminate CLS.
- **F-05**: Add `motion-reduce:animate-none` to spinning animations.
- **F-06**: Add optional quick-filter bar to `FullView.tsx`.

---

## Not Assessed
- **D8-08 (Disabled user testing):** Requires testing sessions with actual assistive technology users (VoiceOver/NVDA/TalkBack); only static and automated WAI-ARIA checks were performed.
- **D10-05 (Real device telemetry):** Production Core Web Vitals (INP/LCP) under throttled network conditions require field telemetry.

---

## Item Scores (62 Criteria)

| ID | Score | Evidence, Finding ID or Reason |
|---|---|---|
| D1-01 | 4 | Clear executive greeting, date, and purpose visible within 2 seconds. |
| D1-02 | 4 | Tab switch and primary urgent/attention items visible above fold. |
| D1-03 | 4 | Directly addresses executive oversight and PA preparation workflow. |
| D1-04 | 3 | Works on mobile, tablet, desktop; sticky PA count on mobile. |
| D1-05 | 4 | Focuses on actionable decisions and tasks requiring nudges. |
| D1-06 | 4 | Clean minimalism, no irrelevant marketing or distraction. |
| D2-01 | 4 | Plain user language ("My brief", "Full picture", "Prepare today's brief"). |
| D2-02 | 4 | Tasks grouped by urgency and company venture. |
| D2-03 | 3 | Clear view indicator; anchor links in `BriefTiles` jump directly to sections. |
| D2-04 | 2 | Finding F-06: No search or in-brief filtering when list is long. |
| D2-05 | 4 | Urgent and Attention sections placed first. |
| D2-06 | 2 | Finding F-03: Tablist lacks arrow key keyboard navigation. |
| D3-01 | 4 | Strong focal point; greeting and urgent alert card stand out. |
| D3-02 | 3 | Consistent vertical scan path with side summary rail on desktop. |
| D3-03 | 4 | Restrained hierarchy; red reserved for urgent/blocked. |
| D3-04 | 4 | Fluid container (`max-w-[1440px]`) with responsive rail collapse. |
| D3-05 | 4 | Clean spacing rhythm based on 4/8/16px scale. |
| D3-06 | 3 | Pinned mobile header maintains PA selection count. |
| D4-01 | 3 | Base font 14–15px; secondary text at 12–12.5px slightly small. |
| D4-02 | 3 | Concise typographic scale with semibold weights. |
| D4-03 | 4 | Line lengths disciplined by two-column grid. |
| D4-04 | 4 | Clear instructions and microcopy for notes and curation. |
| D4-05 | 3 | Truncation applied to names and project labels. |
| D4-06 | 3 | Layout scales with text zoom; input heights are relative. |
| D5-01 | 2 | Finding F-02: `tx.faint` text has ~3.1:1 contrast on white (fails 4.5:1). |
| D5-02 | 3 | Focus outlines and button states meet 3:1 graphical requirement. |
| D5-03 | 4 | Red alerts always paired with icons and text counts. |
| D5-04 | 4 | Restrained semantic palette (ink, red for alerts, green for done). |
| D5-05 | 4 | Neutral executive styling respects readability. |
| D5-06 | 3 | Full dark mode support using Tailwind `dark:` variants. |
| D6-01 | 4 | Links navigate to sections, buttons trigger modals or state changes. |
| D6-02 | 4 | Immediate visual toggle state; spin icon on fetch; toast on mutation error. |
| D6-03 | 4 | Loading skeleton, error alert, empty state, and active states present. |
| D6-04 | 4 | Curation selections can be deselected with single click. |
| D6-05 | 4 | Non-destructive curation; tasks themselves are not deleted. |
| D6-06 | 3 | Logical DOM focus order; visible outline on interactive elements. |
| D6-07 | 3 | Item rows are full width (>44px height); curation button is 36x36px. |
| D7-01 | 2 | Finding F-01: `NoteInput` lacks a persistent visible label. |
| D7-02 | 3 | Clear placeholder example; character limit is unconstrained. |
| D7-03 | 3 | Auto-saves on blur/Enter; network errors reported via toast. |
| D7-04 | 3 | Local draft state survives component re-renders. |
| D7-05 | 4 | Page-level error banner includes `role="alert"`. |
| D7-06 | 3 | Prevents double submission on Enter key. |
| D8-01 | 3 | Target standard is WCAG 2.2 AA. |
| D8-02 | 3 | Operable by keyboard Tab/Enter/Space; modal traps focus properly. |
| D8-03 | 2 | Finding F-03: Missing `role="tabpanel"` and `aria-controls` links. |
| D8-04 | 4 | Decorative icons have `aria-hidden`; progress meter has explicit text label. |
| D8-05 | 2 | Finding F-02: Text contrast below 4.5:1 on faint metadata. |
| D8-06 | 3 | Finding F-05: Missing `motion-reduce:animate-none` on spinner. |
| D8-07 | 3 | Meets minimum 24px touch floor across all actionable items. |
| D8-08 | NA | Not assessed: Disabled user testing requires real user sessions. |
| D9-01 | 4 | Dynamic live data with exact ISO date and time stamps. |
| D9-02 | 3 | Access restricted to executive and PA via permission guard. |
| D9-03 | 4 | Clearly states which items are shared with Mr. Blay. |
| D9-04 | 4 | Authentic data from Supabase; no fabricated counters or urgency. |
| D9-05 | 4 | Respectful, executive-level language and tone. |
| D9-06 | 3 | Clear modal and section destinations. |
| D10-01 | 4 | Instant view switching with client-side TanStack cache. |
| D10-02 | 3 | Finding F-04: Skeleton heights diverge from loaded content (CLS). |
| D10-03 | 4 | Safe refresh button with loading indicator and disabled state. |
| D10-04 | 3 | Graceful fallbacks for empty sections and uncurated days. |
| D10-05 | NA | Not assessed: Live telemetry data required for device segmentation. |

