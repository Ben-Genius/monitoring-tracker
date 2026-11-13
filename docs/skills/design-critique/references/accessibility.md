# Accessibility (WCAG 2.2 AA baseline)

An automated scan is not a conformance claim. Report what you tested and how. Mark everything else as Not assessed.

## Thresholds (quote these exactly)

| Criterion | Requirement |
|---|---|
| 1.4.3 Contrast (minimum) | Text 4.5:1. Large text (≥ 24 px, or ≥ 18.66 px bold) 3:1. |
| 1.4.11 Non-text contrast | UI component boundaries, states, focus indicators, meaningful graphics 3:1 |
| 1.4.1 Use of colour | Colour is never the only means of conveying information |
| 1.4.4 / 1.4.10 Resize & reflow | 200% zoom, and 320 CSS px width, without loss or two-way scrolling |
| 2.1.1 Keyboard | All functionality operable by keyboard, with no traps (2.1.2) |
| 2.4.7 / 2.4.11 Focus | Focus is visible and not hidden by sticky content |
| 2.5.8 Target size (minimum) | 24×24 CSS px, or equivalent spacing (AA). 44×44 is AAA 2.5.5 and the platform touch guidance. |
| 4.1.2 Name, role, value | Controls expose a correct accessible name, role and state |
| 2.3.3 / reduced motion | Honour `prefers-reduced-motion` |

## Manual checks to run

1. Tab through the whole screen: is the order logical, is focus always visible, do menus close on Escape and return focus?
2. Look at the headings outline: one h1, then levels in order with none skipped.
3. Check landmarks: `header`, `nav`, `main`, `aside`.
4. Every icon-only button has `aria-label`, and every decorative icon has `aria-hidden`.
5. Every input has a label (a visible `<label>`, or `aria-label` if it truly has no visible label).
6. Status changes (saving, errors, toasts) use `role="status"` or `aria-live`.
7. Check the page in grayscale: is state still clear?
8. Check 200% zoom and 320 px width.

## Common fixes

| Problem | Fix |
|---|---|
| White text on a mid-saturation brand colour fails 4.5:1 | Use dark text on the colour, or darken the background token |
| Status shown only by a coloured dot | Add a text label next to the dot |
| Clickable `<tr>` or `<div>` | Keep the row click, and also make the title a real `<a>` or `<button>` |
| Custom menu | `aria-haspopup`, `aria-expanded`, `role="menu"` / `menuitem`, closes on Escape and outside click |
| Grid of tiles that are links | Give each link an `aria-label` that combines the label and the value |
