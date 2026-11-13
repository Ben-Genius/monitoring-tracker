# Visual system: how to fix it

Use the product's existing tokens first. The values here are fallbacks for when the product has none.

## Typography

- One family, with at most 2–3 weights for a UI. Two families at most.
- Modular scale: ratio 1.2 for dense dashboards, 1.25 for general apps.
- Body text 14–16 px in dense apps, 16 px or more for reading. Line height 1.4–1.6 for body, 1.1–1.25 for headings.
- Line length 45–75 characters for prose.
- Use semantic heading levels (h1 → h2 → h3). Never pick a level for its size.
- Use `tabular-nums` for any column or figure that is compared.
- All caps only for short labels.

Starter scale for a dense app:

| Role | Size | Weight |
|---|---|---|
| Page title (h1) | 24–28 px | 700 |
| Card title (h2) | 15–16 px | 600 |
| Key figure | 28–40 px | 700 |
| Body | 14 px | 400–500 |
| Meta / caption | 12–13 px | 400–500 |

## Colour

- **60-30-10:** 60% neutral surfaces, 30% text and structure, 10% accent and state.
- Use semantic roles: surface, text, muted text, border, action, success, warning, danger, info. Keep hue meanings constant across the product.
- **Restraint by default:** neutral cards and tiles. Reserve tinted backgrounds for a state that needs attention, not for variety.
- Never use colour as the only signal. Pair it with a label, icon or shape.
- In dark mode, lift elevation with lighter surfaces rather than shadows, and lower saturation.
- Check every pair, including hover, disabled, focus, dark mode and chart series (`accessibility.md`).

## Spacing & layout

- Use a 4/8-point scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Inner padding ≤ the gap between siblings, so groups read as groups.
- Use one gap value per level. For example 20 px between cards and 12 px inside a card grid.
- Cards in the same row share height. Use a grid with `items-stretch` and let card bodies flex. Don't stretch empty space into a short card; give it content or rebalance the columns.
- Columns share edges top and bottom: the bottoms of the last cards in adjacent columns should align.
- Use `min-w-0` on grid and flex children that hold truncating text.
- Only intentionally wide content (tables, timelines) scrolls horizontally, inside its own container.

## Dashboards

- **Order:** context (date, scope) → KPI strip → what needs a decision → trends and schedules → detail tables → activity.
- **KPI tile anatomy:** label → figure → delta chip (only with a real baseline) → one-line note. Add a menu only if it has real actions.
- Each fact appears once. When two cards disagree about the same set, fix the source, not the label.
- A delta's colour reflects good or bad for that metric ("overdue ↑" is bad), not the direction of the arrow.
- Show a zero honestly ("0", "Nothing overdue"). Don't show "0%" chips or an empty chart frame.
- Tables: left-align text, right-align numbers, cap the rows shown with "View all", and make the whole row a link with the title also a real link for keyboard users.

## Interaction states

Every control needs: rest · hover · focus-visible · pressed · selected (with a non-colour cue) · loading (blocks double submit) · success · error · disabled (and why) · empty.

## Forms

- Visible label above the field. Hints sit before the field, errors directly below it.
- Validate on blur or submit, and clear the error as soon as the value is valid.
- Keep the user's input when an error occurs.
- Button labels state the outcome ("Save changes"), not "OK".

## Content patterns

| Pattern | Good | Miss |
|---|---|---|
| Page title | Names the task or topic | A slogan |
| Empty state | Why it is empty, plus the next action | "No data" |
| Error | What failed and how to fix it | "Invalid input" |
| Confirmation | The result and any next step | A toast for an irreversible action |

## Motion

150–300 ms. Ease-out to enter, ease-in to exit. Animate only `transform` and `opacity`. Honour `prefers-reduced-motion`. Motion must never be the only signal.

## Depth & shape

Use one radius scale (small for controls, larger for cards) and hairline borders at low contrast. Shadows mean elevation (menus, dialogs), not decoration on every card.
