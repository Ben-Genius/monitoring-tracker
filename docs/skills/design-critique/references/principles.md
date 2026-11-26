# Principles: why something is wrong

Use these to name the principle behind a finding. They are diagnostic lenses, not pass/fail standards.

## Decision precedence when guidance conflicts

1. Law, safety, privacy, security
2. Adopted standards (e.g. WCAG 2.2 AA)
3. Platform conventions (OS, browser, assistive technology)
4. The product's design system and terminology
5. Team conventions
6. Personal preference, used only when nothing above decides

For user-facing trade-offs: user need → accessibility → task success → understandable behaviour → consistency → brand → polish.

## Nielsen's 10 heuristics

1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognise, diagnose and recover from errors
10. Help and documentation

## Dieter Rams (most useful for critique)

Useful · understandable · unobtrusive · honest · thorough down to the last detail · as little design as possible ("less, but better").

## Gestalt

| Principle | Use it to |
|---|---|
| Proximity | Group with space before borders. Inner padding ≤ outer gap. |
| Similarity | Make same-function elements look alike. Make different things clearly different. |
| Common region | Use cards and panels for true groups, not for every element. |
| Continuity | Align on strong axes so the eye follows a path. |
| Figure–ground | Keep foreground and background clearly separated. |
| Focal point | Give each view one dominant element. |

## CRAP

- **Contrast:** if two things differ, make them clearly different.
- **Repetition:** reuse the same styles for the same meaning.
- **Alignment:** nothing placed arbitrarily; every edge lines up with something.
- **Proximity:** related items together, unrelated items apart.

## Five meanings of "hierarchy"

| Lens | Question |
|---|---|
| Authority | Which requirement wins? |
| Information | How is content ordered and labelled? |
| Visual | What is seen first, second, third? |
| Interaction | Which action is primary, secondary, destructive? |
| Architecture | Which module owns which policy? |

Standard screen order: page title → primary action → key figures → supporting content → metadata.

## UX laws

| Law | Implication |
|---|---|
| Hick | More choices means slower decisions. Trim, group, and disclose progressively. |
| Fitts | Make primary targets big and close. Put destructive actions out of the way. |
| Miller (chunking) | Group information in 3–5 chunks. |
| Jakob | Users expect your UI to work like ones they know. Don't reinvent standard controls. |
| Tesler | Complexity is conserved. The system should absorb it, not the user. |
| Doherty | Respond within about 400 ms. Use optimistic updates and skeletons. |
| Peak-end | Design the hardest moment and the ending of a flow with care. |

## Norman

Affordances (it looks usable) · signifiers (it shows where) · mapping (control matches effect) · feedback (response is immediate) · constraints (wrong actions are hard) · conceptual model (the UI explains itself).

## Smells that signal a critique point

| Smell | Better question |
|---|---|
| Everything is primary | What is the one main action here? |
| Colour-only state | What label, icon or shape also says it? |
| Dashboard of vanity metrics | What decision does this number change? |
| Same figure in three places | Where does this fact belong once? |
| Copied inspiration element with no data behind it | Is it honest here? |
| Placeholder-only labels | Can the label stay visible? |
