# Render and measure

How to get evidence from a running UI. Use the project's own run skill or notes first if they exist.

## 1. Run the app without disturbing anything

- Before starting a dev server, check the port: `lsof -nP -iTCP:<port> -sTCP:LISTEN`. If another project holds it, pick a free port (`vite --port 5287 --strictPort`). Never kill a process you did not start.
- Stop only the server you started when you finish.
- Use only the test logins the user gave you or that the repo documents. Never click buttons that write data (save, add, delete) while auditing a real account.

## 2. Headless browser

If `chromium-cli` or a Playwright install is not available, install `playwright-core` into the scratchpad and point it at a cached browser:

```bash
ls ~/Library/Caches/ms-playwright/   # macOS (Linux: ~/.cache/ms-playwright)
# executablePath: .../chromium_headless_shell-<ver>/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

Screenshot loop:

```js
for (const w of [1440, 1024, 390]) {
  await page.setViewportSize({ width: w, height: 900 });
  // Apps often scroll inside <main>, so size the viewport to it for a full capture.
  const h = await page.evaluate(() => (document.querySelector('main') ?? document.body).scrollHeight);
  await page.setViewportSize({ width: w, height: Math.min(h + 60, 7000) });
  await page.screenshot({ path: `${out}/screen-${w}.png` });
}
```

For dark mode, set the app's theme key in `localStorage` (read the theme provider to find it), or use `colorScheme: 'dark'` on the context. Then reload.

## 3. Measure geometry

```js
const boxes = await page.evaluate(() =>
  [...document.querySelectorAll('main section, main aside')].map(e => {
    const r = e.getBoundingClientRect();
    return { name: (e.querySelector('h2')?.textContent ?? e.tagName).slice(0, 28),
             x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }));
```

Check:
- Cards in the same row have equal `y` and equal `h`.
- Columns share `x`, and the bottoms (`y + h`) of their last cards match.
- Gaps between cards are equal.

## 4. Overflow that a page-level check misses

`document.documentElement.scrollWidth` reports 0 overflow when `<main>` uses `overflow-x: hidden`, even though content is clipped. Count elements past the right edge instead:

```js
await page.evaluate(() => [...document.querySelectorAll('main *')]
  .filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.overflow-x-auto')).length);
```

## 5. Contrast

```js
const lum = ([r, g, b]) => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Read the colours with getComputedStyle(el).color and the background of the nearest opaque ancestor.
```

Report the measured ratio. Never estimate one from a screenshot.

## 6. Interaction evidence

Open a menu and screenshot it. Press Escape and assert it closed. Tab through the screen and log `document.activeElement` to check the focus order. Record console errors for each viewport.

## 7. Read screenshots like a reviewer

Look in this order: hierarchy (what is seen first) → row alignment → duplicated facts → colour budget → truncation and clipping → empty and zero states → mobile stacking order.
