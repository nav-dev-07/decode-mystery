# DECODE — Digital Archive

A browser-based interactive mystery built into the Next.js homepage: one intercepted transmission, three encryption layers, and an unknown operator waiting on the other side.

## Run

From the `decode` project folder:

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**. DECODE is the root route (`/`) of the Next.js website. Stop the development server with **Ctrl+C**.

For a production build:

```powershell
npm run build
npm start
```

The puzzles run entirely in the browser; no database, authentication, API keys, or external game services are required. Next.js serves the page and its local assets. Saved progress belongs to the browser origin, so a previous direct-file or different-port session may have separate progress.

## Structure

```text
app/page.tsx                       The DECODE homepage, terminal, and dialogs
app/layout.tsx                     Root layout, page metadata, and icon
app/globals.css                    Responsive styling and visual effects
app/investigation-controller.tsx   Client-side activation after hydration
app/decode-engine.js               Puzzles, persistence, audio, and Canvas
public/icon.svg                    DECODE favicon
```

The homepage is prerendered by Next.js. A small client component starts the investigation in a React effect, then removes listeners, cancels animation/timers, closes dialogs, and releases audio on unmount. This supports React Strict Mode, Fast Refresh, and remounting without duplicate handlers.

## Experience

- Three sequential layers: Caesar cipher, doubling sequence, and A1Z26 letter mapping.
- Case-insensitive answers with leading, trailing, and repeated whitespace ignored.
- Correct-answer feedback, cleared-stage markers, native progress indicator, and next-layer unlocks.
- Independent, toggleable hints and explanatory field notes that preserve typed answers.
- Timestamped system log limited to the 12 most recent events, rendered using DOM methods and text content.
- Progress and hint usage restored from local storage; unavailable storage falls back to the current in-memory session.
- Reset and replay clear saved investigation progress, hints, notes, and discoveries.
- Optional browser-generated sound, off by default, with graceful unsupported-audio handling.
- Recovered-transmission dialog with replay, close, return, and reopen actions. About dialog, too.
- Keyboard submission, visible focus, a skip link, status announcements, focusable log, and native modal dialogs.
- Three-column desktop workspace that becomes a stacked terminal with horizontal stages on smaller screens.
- Hidden archive symbol and `/help`, `/echo`, and `/origin` terminal commands. They never advance puzzle progress.

### The ASCII field

The blue ASCII **horizon** is implemented in `app/decode-engine.js` using native Canvas and runs within the Next.js page.

It uses the requested `#1e3fd8`, `#f6f8ff`, `#a5d8ff`, and `#38bdf8` palette and ` =+xX0S8#@` glyphs, with an 18px base cell size, approximately 0.8 cell density, a flowing luminous horizon, gentle flicker, pointer scrambling, click waves, and an intro fade. It is a custom interpretation, not an exact implementation of the React component.

Animation is capped at 30 fps, uses at most approximately 4,300 cells, caps device-pixel ratio at 1.5, and debounces resize work. It pauses for hidden tabs, page navigation, open dialogs, or the **Pause FX** control. Reduced-motion preference draws a still field and disables animation. Canvas failure leaves the game playable against its CSS background. Game effects use no externally hosted fonts, images, animation libraries, or API calls.

## Controls

| Control | Action |
| --- | --- |
| Enter in the answer input | Submit the current answer |
| `?` outside editable fields and dialogs | Toggle the current hint |
| Tab / Shift+Tab | Navigate controls |
| Escape | Dismiss an open native dialog |
| Pause FX / Resume FX | Pause or resume decorative motion |
| Sound off / Sound on | Enable or disable synthesized interface tones |

## Modify

- **Puzzles and narrative:** edit the `puzzles` array near the top of `app/decode-engine.js` and the completion content in `app/page.tsx`.
- **Theme and spacing:** edit custom properties at the top of `app/globals.css` and its responsive media queries.
- **ASCII appearance:** edit `createBackground()` in `app/decode-engine.js`.
- **Storage:** key `decode-archive-progress-v1`, version `1`; compatible with the supplied starter. Change the key or schema version when changing the investigation structure.

Only a contiguous prefix of completed layers is accepted from saved data. Current-stage logic comes from private application state, never a URL, stage label, or clickable future stage. As with every frontend-only puzzle, source code and local storage are inspectable; this is an investigation experience, not a tamper-proof security challenge.

## Verification

Performed against the actual Next.js prerendered homepage and game module using Node.js and a temporary **LinkeDOM simulated-DOM harness**, outside the runnable project, with mocked Canvas, storage, animation scheduling, dialogs, and Web Audio. No browser automation was used.

**24 scenario groups passed**, exercising:

- Initialization and single listener attachment, selector and ARIA-reference integrity, and local asset paths.
- Empty, wrong, normalized, sequential, and out-of-order answers; all three layers; completed-input guards.
- Independent hints/notes on each layer, typed-answer preservation, and restored hint usage.
- Persistence across simulated reloads; malformed, inconsistent, denied, and quota-limited storage.
- Reset, replay, completion reopen, about controls, backdrop-close handlers, and focus-return logic.
- Capped timestamped logs, safe content insertion, keyboard shortcut guards, and secret discoveries.
- Sound toggles, synthesized-tone calls, unsupported audio, and rejected audio resume.
- Canvas drawing calls, mobile/desktop/4K resize calculations, frame throttling, pause/resume, hidden-tab and page lifecycle handling, reduced-motion changes, and missing Canvas support.
- CSS parsing and the presence of responsive/reduced-motion rules.
- React-effect setup/cleanup/remount behavior, including listener removal, timer/frame cancellation, modal cleanup, audio disposal, and progress restoration.

Also ran `npm run lint`, `npm run build` (including TypeScript), and Git whitespace checks. Verified the running Next.js homepage returns HTTP 200 at `http://localhost:3000`.

**Still requires a manual browser check:** actual visual composition and overflow at mobile/desktop sizes, Canvas appearance and performance, audible tones, screen-reader behavior, native dialog Escape/Tab trapping, physical Enter-key form submission, and real browser hydration/Fast Refresh behavior. The non-browser tests exercise application handlers, not a browser's layout or accessibility engine.

### Manual playthrough

1. Open `http://localhost:3000`; inspect desktop and 320–420px mobile widths.
2. Submit a wrong answer, then `  the  door is open  `. Confirm layer 2 unlocks.
3. Open a hint and a field note, type a draft answer, and toggle the panels. Refresh and confirm layer/hint restoration.
4. Answer `32`, then `STAY`. Inspect the completion dialog; test Tab, Shift+Tab, Escape, reopen, and replay.
5. Toggle sound and background motion. Turn on reduced motion in the OS and return to the page.
6. Try `/help`, `/echo`, and the footer symbol; confirm that progress is unchanged.
7. Reset and refresh. The first layer should be active, with no hints used.
