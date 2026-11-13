# Basketball Scoreboard

A basketball scoreboard and game-day presentation system for school gyms and arenas. One computer runs an **operator console** and a **public display**: the operator scores the game, runs the clocks and manages media, and the display shows a professional scoreboard on a TV, projector or LED wall.

Holy Cross Regional High School red, white and black is the default branding. Team names, colours and logos can be changed for any school.

> **Status:** Phases 1–10 complete. Core scoreboard, media library, presentation modes, media playback, player introductions, operator UI/UX improvements, display/animation verification, audio system, sponsor/advertising system optimization, and the customizable Live Sponsor Layout Editor are shipped.

## Contents

- [Features](#features)
- [Getting started](#getting-started)
- [Using the scoreboard](#using-the-scoreboard)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## Features

**Operator console**
- Scoring (+1, +2, +3, −1), team fouls with bonus, timeouts and possession
- Game clock and shot clock with start, pause, reset and corrections down to a tenth of a second
- Periods and overtime, with configurable league rules
- Undo for the last 50 actions, and a recent-actions log
- Keyboard shortcuts for scoring, both clocks, possession and undo (collapsible shortcuts panel)
- Saved game configurations, finished-game history with CSV export, and printable summaries
- Optional period, game-end and shot-clock warning sounds
- Grouped navigation with visual separators for quick scanning
- Optimized layout utilizing full screen width on wider displays

**Public display**
- Five scoreboard presets that use different layouts, not just different colours (see [Scoreboard presets](#scoreboard-presets))
- Layouts rearrange for widescreen, 4:3 and portrait screens. Checked at 3840×2160, 1920×1080, 1280×720, 1024×768 and 768×1024
- Large high-contrast scores, tenths on the clock under one minute, and a shot-clock warning at 5 seconds
- Fullscreen with **F**, a double-click or the button; the cursor and button hide when idle
- Reduced-motion preferences are respected; fonts are bundled, so it works offline

**Presentation modes**
- Pregame (matchup and tip-off countdown), Live (the scoreboard), Live Sponsor (Stadium scoreboard with a resizable sponsor media area), Stadium (arena layout with score, clocks, period and a media area), Halftime (first-half score and a second-half countdown), Introductions and Fullscreen
- Switch modes in one click from the operator screen; the display follows. Switching never changes the game, and the clocks keep running
- Media playback and sponsor rotation run inside the presentation layout during live games
- **Layout Editor** (`/layout`, its own navigation section): design the Live Sponsor display with drag-and-drop, resizing, up to three media sections and named saved layouts. See [Layout Editor](#layout-editor)
- Saved configurations show a thumbnail of the display layout in the team colours, with a Preview button to enlarge it before loading

**Media library and sponsors**
- Upload PNG, JPG and WebP images (up to 25 MB) and MP4 video (up to 500 MB), with thumbnails
- Built-in categories (Sponsors, Advertisements, Pregame, Team Hype, Player Introductions, Halftime, Timeout, General Promotions) plus your own
- Search, filter, preview, rename, recategorize and set display times
- Sponsors are managed only in the Media Library's **Sponsors** tab (there is no separate Sponsors page or route): create, rename and delete sponsors, set logos, add existing media or upload images and videos, and set each item's order and display time. Any media can also be assigned to a sponsor by name from its details
- **Live Sponsor presentation mode** — the scoreboard plus a media area (up to three sections) arranged in the [Layout Editor](#layout-editor). Without assigned media, the first section plays each sponsor's rotation in the order and for the durations set under Sponsors in the Media Library
- **Video with audible audio** — sponsor and intro videos play with sound enabled

## Getting started

### Requirements

- **Node.js 20.19+ or 22.12+** (required by Vite 8)
- A current desktop browser. Chrome or Edge is recommended for the display.

### Install and run

```bash
npm install
npm run dev
```

Open the operator console at http://localhost:5173/, then click **Open Display** to open the public scoreboard (`/display`) in a new window. Drag that window to the TV, projector or LED wall and press **F** for fullscreen.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the unit tests (Vitest) |
| `npm run typecheck` | Type-check without building |
| `npm run lint` | Run ESLint |

## Using the scoreboard

### Before the game

The navigation at the top of the operator console has:

| Page | Purpose |
|---|---|
| **Scoreboard** | Live game controls |
| **Game Setup** | Two sections. *Game Settings*: team names, colours, logos, rules, the scoreboard preset with a live preview, and sound and display preferences. *New Game Defaults*: default rules and theme for new games, New Game With Defaults and Restore Defaults (there is no separate Settings page) |
| **Configurations** | Save, load, update, rename, duplicate and delete prepared setups |
| **Media** | Upload and organize images and videos; assign media to sponsors and manage sponsor logos and rotation |
| **History** | Finished games, statistics, CSV export and printable summaries |

Default rules are 4 × 12-minute quarters, 5-minute overtime, a 24/14 shot clock, bonus at 5 team fouls and 3 timeouts per team. Team fouls reset each period; timeouts carry over. Change them for the current game in Game Setup, or as defaults under New Game Defaults on the same page.

### Scoreboard presets

| Preset | Layout |
|---|---|
| Holy Cross Classic (default) | Traditional: team panels either side of a central clock, white digits on black, red accents |
| Arena | Full team-colour panels with large scores over a big clock bar |
| Minimal | Names, scores, clock, shot clock and period only. Dark or light |
| Tournament | Red event header band, large crests and a team stats row |
| Broadcast | TV-style: stacked team rows with scores beside a period and clock column |
| Custom | Any layout, font, background and colours; text adjusts to stay readable |

Changes appear in the live preview and reach the display when you click **Apply to Display**. Switching presets never changes the game.

### Display modes

The **Display Mode** panel at the top of the Scoreboard page switches the public display between Pregame, Live, Stadium, Halftime, Introductions and Fullscreen. Pregame and Halftime have an operator-controlled countdown (start, pause, reset, ±1 minute, and a length in minutes; 0 hides it). Halftime shows the score as of the end of the first half, kept per period so it stays correct after Undo. In Stadium mode the shot clock follows the *Show shot clock* display setting.

### Layout Editor

The Layout Editor (`/layout`) is the one place to customize the display. It edits the **Live Sponsor** preset only; Pregame, Stadium and Halftime are unchanged. Everything you do appears on the public `/display` route in Live Sponsor mode.

- **Canvas.** Shows the real Live Sponsor scoreboard in the appearance chosen in Game Setup (colours, typography, background, team areas and clocks), with selectable areas on top. Media does not play in the editor; each section shows its first item or an "Empty" placeholder.
- **Elements.** Select Home Team, Clocks, Away Team, Media Area or Media 1–3 from the row under the canvas or on the canvas. The Properties panel shows the selection's Top, Left, Width and Height (%).
- **Media area.** Place it right, left, top or bottom (default: the full-width scoreboard with the media below it), set its size (20–60%) and Fit or Fill scaling, and split it into 1–3 sections arranged as rows or columns with a share slider for each. Changing placement, arrangement or section count re-lays out the display and, after a confirmation, resets manual positions.
- **Media sections.** Assign images and videos from the Media Library to each section, reorder or remove them, and see them in place. On the display each section cycles its media using each item's display time; videos play with audio and advance when they end. An empty first section keeps the sponsor rotation from the Playback panel. Only media ids are stored, never files.
- **Drag and resize.** Drag an element to move it, drag its handles or type values in Properties to resize it. Elements snap to 0.5%, stay on the 16:9 canvas, cannot overlap and cannot shrink below 12%. Once an element has been moved, every block is placed from its saved rect and its text (names, scores, clocks, crest) scales with the block, so branding stays proportioned and unclipped. "Reset element positions" returns to the automatic layout.
- **Layout type.** In Saved Layouts, choose **With Sponsor Sections** (the default: set the number of sections, their arrangement and media) or **Without Sponsor Sections** for a clean scoreboard that fills the display. Saving without sections drops the section media and positions from that layout and the display shows no media area; the scoreboard element positions and appearance are kept. Load a saved layout to edit it, change anything, then press **Save changes**. Layouts saved earlier keep their sections.
- **Presets.** Choosing a different scoreboard preset in Game Setup loads that preset's layout geometry here (Broadcast starts with the media beside the board, the others below it); colours, typography and branding always follow the preset. The editor, the configuration thumbnails and `/display` all read the applied preset (`gameConfig.theme`, set by **Apply to Display**) and update when it changes. Arena, Minimal, Tournament and Broadcast also restyle the team blocks (filled team-colour panels, name and score only, centred crest and score, or crest, name, stats and a score slab); Traditional, Live Sponsor and Custom use the base Stadium block. Fouls, timeouts and bonus labels in the team blocks have a 12px floor and grow with the board, and the Broadcast, Arena and Live Sponsor stat rows wrap instead of overlapping. Broadcast keeps its own structure beside the media: the home and away rows stack on the left of a clock column (the editor's boxes, the preview and `/display` use the same geometry), and every box stays draggable and resizable. Your edits are kept until the next preset change or a reset.
- **Saved Layouts and Configurations.** Saving a layout also saves a Saved Configuration with the same name (teams, branding, rules, appearance) linked to it, and **Save changes** updates both. The configuration appears on the Configurations page with its layout preview; **Load** restores the game settings and then the custom layout, so the operator preview and `/display` match. Updating a configuration there rewrites its layout only when that layout is the one open in the editor. Deleting a layout leaves its configuration in place without the custom layout.
- **Configuration previews.** **Preview** on a card draws that configuration's complete scoreboard with the same components as `/display`: its teams, colours, logos, rules, appearance and preset, plus its saved custom layout (positions, sizes and sponsor sections, or none if it was saved without) when it has one. Scores, clocks, fouls and possession are sample values; the live game is never shown.
- **Undo.** Next to Reset to Defaults: steps back through your layout changes (moving or resizing elements, section sizes and shares, placement, sections, scaling, layout type), one step at a time. A drag or slider run counts as one step. The history lives in memory only: it is cleared when you load a saved layout, change the scoreboard preset or reload the page, and it never touches game state or saved layouts.
- **Reset to Defaults.** Restores the selected preset's geometry, sections and scaling after a confirmation; media assignments and game settings are kept.
- **Saved layouts.** Save the current layout under a unique name, rename, duplicate, delete (with confirmation) or load one into the editor and the display. Each remembers its scoreboard appearance, positions and sizes, sections, proportions and media assignments, and loading it applies that appearance. The canvas is a working copy: a saved layout changes only when you press **Save changes**. Layouts persist locally across restarts and stay in sync between the operator and display tabs.
- **Previews.** Saved configurations show a thumbnail of the display layout in the team colours (with a Preview button to enlarge it) from the same geometry, so it matches the canvas and `/display`.

### During the game

| Key | Action |
|---|---|
| 1 / 2 / 3 | Home +1 / +2 / +3 |
| 4 / 5 / 6 | Away +1 / +2 / +3 |
| Space | Start/pause the game clock |
| S | Start/pause the shot clock |
| R / E | Shot clock full / short reset |
| T | Switch possession |
| U | Undo |

Shortcuts work on the Scoreboard page. They're off while typing in a field or while a confirmation is open, and a held key counts once. To add one, add a row to `SHORTCUTS` in `src/components/basketball/shortcuts.ts`.

- The game clock stops at 0.0 and stops the shot clock with it. **Next** period refills both clocks and applies the foul and timeout rules.
- **Undo** reverses scores, fouls, timeouts, possession, clock corrections, period changes, resets and loading a configuration. Starting and pausing clocks aren't recorded.
- A clock reaching zero never ends the game. **Finish & Save** stops the clocks, shows FINAL and records the result in History. **Reopen Game** continues it.
- **Reset Game** asks for confirmation, keeps teams and rules, and can be undone.

## Architecture

### Technology

React 19, TypeScript, Vite 8, Zustand 5, Tailwind CSS 3, Framer Motion, React Router, Lucide icons and Vitest. There is no backend.

### State and synchronization

- **Zustand stores** hold the live game, settings, finished games and media metadata. Every undoable game action goes through one `commit` function that records exactly what it changes.
- **Clocks are timestamp-based.** A running clock stores its remaining time and start timestamp, and every window derives the current time from the wall clock, so inactive tabs and refreshes don't drift.
- **Operator and display stay in sync** through the BroadcastChannel API. This works between windows of the same browser on the same computer, not across devices.

### Storage

All data stays in the browser on this computer and is validated when it loads:

| Data | Where |
|---|---|
| Live game, configurations, undo history | localStorage `basketball-storage` |
| Settings (defaults, sound, display) | localStorage `basketball-settings` |
| Finished games | localStorage `basketball-games` |
| Media metadata, categories, sponsors | localStorage `basketball-media` |
| Team logos | IndexedDB `basketball-logos` |
| Media files and thumbnails | IndexedDB `basketball-media` |

Large files never go into localStorage or Zustand state. Clearing the browser's site data deletes everything above.

### Branding

The default school identity (name and colours) lives in `src/lib/branding.ts`. Changing it updates the default teams, every preset's accent colour and the operator header.

## Project structure

```
src/
├── App.tsx                    Routes
├── main.tsx                   Entry point
├── types/                     Shared types (game, media, presentation)
├── lib/                       Framework-free logic
│   ├── branding.ts            Default school identity
│   ├── theme.ts               Presets, layouts, fonts and contrast rules
│   ├── clock.ts               Clock maths and formatting
│   ├── periodScores.ts        Per-period score helpers
│   ├── idb.ts                 Shared IndexedDB blob storage
│   ├── logos.ts               Team logo storage
│   ├── media.ts               Media validation, thumbnails and storage
│   ├── gameRecords.ts         Finished-game records, statistics, CSV
│   ├── sound.ts               Generated sound effects
│   ├── feedback.ts            Toasts and confirmation dialogs
│   └── storage.ts             Safe localStorage access
├── store/                     Zustand stores
│   ├── useBasketballStore.ts  Live game, configurations, undo, tab sync
│   ├── useSettingsStore.ts    Settings
│   ├── usePresentationStore.ts Display mode and countdowns
│   ├── useGameLog.ts          Finished games
│   └── useMediaStore.ts       Media metadata, categories, sponsors
└── components/basketball/
    ├── OperatorLayout.tsx     Operator navigation
    ├── OperatorView.tsx       Live game controls
    ├── SetupPage.tsx          Teams, rules and preset
    ├── ThemePicker.tsx        Preset fields and live preview
    ├── ConfigsPage.tsx        Saved configurations
    ├── MediaPage.tsx          Media library
    ├── SponsorsPanel.tsx      Sponsor management (Media Library Sponsors tab)
    ├── MediaParts.tsx         Media thumbnail, preview and details dialog
    ├── useMedia.ts            Media URLs, uploads and deletion
    ├── HistoryPage.tsx        Finished games
    ├── AppPreferences.tsx     New Game Defaults and Sound/Display preferences (Game Setup)
    ├── DisplayView.tsx        Public display page
    ├── Scoreboard.tsx         The five scoreboard layouts
    ├── PresentationViews.tsx  Pregame, Stadium and Halftime displays
    ├── PresentationPanel.tsx  Operator mode and countdown controls
    ├── presentation.css       Presentation mode layouts
    ├── scoreboard.css         Display design system and responsive layouts
    ├── ClockDisplay.tsx       Clock component
    ├── ui.tsx                 Shared panels, fields, logo and dialogs
    ├── styles.ts              Shared button and input styles
    ├── useSounds.ts           Operator sound alerts
    └── shortcuts.ts           Keyboard shortcuts
```

Tests sit next to the code they cover (`*.test.ts`).

## Testing

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The unit tests cover scoring, clocks, periods and overtime, fouls, timeouts, possession, undo, persistence and data repair, tab sync, shortcuts, presets and contrast, game records, and media validation and metadata. Display layouts and media uploads were also tested in a real browser during development.

## Deployment

`npm run build` produces a static site in `dist/`. Any static host works, but it must serve `index.html` for every path, because the app uses routes such as `/display` and `/history`. Without that, those pages return 404 when opened directly or refreshed.

### Continuous integration

`.github/workflows/ci.yml` (shown as **CI** in the GitHub Actions tab) runs on pushes to any branch except `dev` and `Main`, and on pull requests targeting `dev` or `Main`. On Node.js 22 it runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`; the first failing step fails the run. It only validates: it does not deploy, release or merge.

### Development notes

`package.json` overrides `minimatch` to `^11.0.3` to fix advisory GHSA-g3hv-75wg-m249, because ESLint and typescript-eslint still declare version 10. It only affects lint tooling. Remove the override once `eslint`, `@eslint/config-array` and `@typescript-eslint/typescript-estree` all declare `minimatch` 11 or later.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Branding and professional scoreboard presets | ✅ Done |
| 2 | Media library, local storage and sponsor management | ✅ Done |
| 3 | Pregame, Live, Stadium and Halftime presentation modes | ✅ Done |
| 4 | Media playback, sponsor rotation and game-day presentation | ✅ Done |
| 5 | Player roster, introductions, fullscreen and polish | ✅ Done |
| 6 | Operator UI/UX optimization, navigation improvements and layout refinements | ✅ Done |
| 7 | Public display verification, animation and timer accuracy optimization | ✅ Done |
| 8 | Audio system and sound effects | ✅ Done |
| 9 | Sponsor and advertising system optimization | ✅ Done |
| 10 | Customizable Live Sponsor Layout Editor: drag-and-drop, resizing, media sections and saved layouts | ✅ Done |
| 11+ | Coming soon | Planned |

## Known limitations

- **One computer.** The operator and the display must run in the same browser on the same computer, for example with the display on an extended screen. A tablet can't yet control a display on another machine.
- **Local data only.** Games, settings and media live in this browser. There's no backup or export of media yet, and clearing site data deletes everything.
- **No redo**, and no player statistics.
- **MP4 video must use H.264.** Other codecs are rejected when uploaded.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and pull request workflow.

## License

Copyright © 2026 James Abramski. All rights reserved. See [LICENSE](LICENSE).
