# 🏀 Basketball Scoreboard Application

A complete, professional basketball scoreboard system built with React, TypeScript, Zustand, and Tailwind CSS. Features dual-view architecture for operators and public displays with real-time synchronization.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Run the Application

```bash
npm run dev
```

Then open:
- **Operator Control Panel**: http://localhost:5173/
- **Public Display**: http://localhost:5173/display

### Production Build

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test        # Vitest: scoring, clocks, fouls, timeouts, undo, persistence, tab sync, shortcuts
npm run lint
```

## 📖 How to Use

### Setting Up a Game

1. Open the operator view at http://localhost:5173/
2. Use the navigation at the top of the page:
   - **Scoreboard**: live game controls and keyboard shortcuts
   - **Game Setup**: teams, colors, logos, rules, and the scoreboard theme with a live preview
   - **Configurations**: save, load, update, rename, duplicate and delete prepared setups
   - **History**: completed games, statistics, CSV export and printable summaries
   - **Settings**: defaults for new games, sound, and display preferences
3. Click **Open Display** to launch the public scoreboard in a new window. Press **F** or double-click it for fullscreen.

### Themes and Layouts

| Layout | What it shows |
|---|---|
| Arena Classic | Team panels either side of a central clock tower: game clock, possession arrows, period, shot clock, fouls, timeout pips and bonus |
| Modern Sports | Full team-color panels with huge scores over a broadcast-style clock bar |
| Tournament | Event-name header, large logos, center clock tower and a stats table (fouls, timeouts, bonus, lead) |
| Minimal | Names, scores, game clock, shot clock and period only |

| Theme | Default layout | Look |
|---|---|---|
| Classic Sports Arena | Arena Classic | Amber digits on black |
| Modern Dark | Modern Sports | Black board, team-colored panels |
| Minimal | Minimal | Plain, light or dark |
| Tournament | Tournament | Navy board, event name, court lines |
| Custom | Arena Classic | Your own scoreboard color; text adjusts to stay readable |

Any theme can use any layout, font, background and accent color. Changes appear in the live preview and reach the display only when you click **Apply to Display**.

### Finishing a Game

A clock reaching zero never ends a game. Click **Finish & Save** on the Scoreboard page to stop the clocks, show FINAL on the display and record the result in History. **Reopen Game** continues it, and finishing again updates the same record.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| 1 / 2 / 3 | Home +1 / +2 / +3 |
| 4 / 5 / 6 | Away +1 / +2 / +3 |
| Space | Start/pause game clock |
| S | Start/pause shot clock |
| R / E | Shot clock full / short reset (24 / 14 by default) |
| T | Switch possession |
| U | Undo |

Shortcuts work on the Scoreboard page. They're off while typing in a field or while a confirmation is open, leave browser combinations (Cmd+R etc.) alone, and count a held key once. Nothing destructive has a key. To add one, add a row to `SHORTCUTS` in `src/components/basketball/shortcuts.ts`; the help panel and button hints follow.

### Operating During a Game

**Scoring:**
- Click **+1**, **+2**, or **+3** to add points for each team
- Click **-1** to subtract points if needed

**Game Clock:**
- **Start** button begins the clock
- **Pause** button stops it
- **Reset** button returns clock to period duration
- **±1m / ±1s / ±.1s** correct the time, even while it runs
- Shows tenths under one minute, and stops automatically at 0.0 (stopping the shot clock too)

**Shot Clock:**
- **Start** / **Pause** run the shot clock, independently of the game clock
- The two reset buttons (**24** and **14** by default) reset it and leave it stopped, ready to start
- **±1s / ±.1s** correct the time
- Turns red and shows tenths at 5 seconds or fewer, and stops automatically at 0.0

**Fouls & Timeouts:**
- Use **+** and **-** buttons to adjust fouls and timeouts; neither can go negative
- **BONUS** appears when a team reaches the configured foul count
- Timeouts can't exceed the configured maximum. Changing the maximum keeps the number each team has used
- **Restore timeouts now** in Game Setup refills both teams

**Possession:**
- Choose **Home**, **None** or **Away**, or press T to switch between teams
- The display shows possession with lit arrows (Arena Classic, Tournament) or a dot beside the team label (Modern Sports, Minimal)

**Periods:**
- **Previous** / **Next** buttons navigate periods
- **Next** refills both clocks, stops them, and applies the fouls and timeouts options from Setup
- Automatically switches to overtime after the last period

**Other Controls:**
- **Undo** reverses the last action: scores, fouls, timeouts, possession, clock corrections and resets, period changes, game resets and loading a configuration. Starting and pausing clocks are not recorded
- Undoing a clock change leaves that clock stopped at the earlier time, so it can't jump while running
- The **Recent Actions** panel lists the last 50 undoable actions
- **Reset Game** requires confirmation, keeps team names, colors and rules, and can be undone
- Sound effects are off by default. Turn them on in Settings; they play from the operator page after your first click or key press

### Public Display

The display view (`/display`) shows:
- Large, readable scores
- Game clock and shot clock
- Current period/overtime
- Team fouls and timeouts
- Possession indicator
- Leading team marker (a bar under the leader's score; can be turned off in Settings)
- Bonus indicators (always in place, lit when active, so nothing moves)
- Team logos, or a monogram in the team colors when no logo is uploaded

**Display features:**
- Updates automatically when operator makes changes
- Fills any screen: each layout rearranges itself for widescreen (16:9, 16:10, ultrawide), 4:3 and portrait screens instead of letterboxing. Checked at 3840×2160, 1920×1080, 1280×720, 1024×768 and 768×1024
- A running light beside the game clock shows when it is running; a stopped clock dims slightly
- The shot clock turns red at 5 seconds and pulses while it runs
- Short animations on score changes, period changes and possession; turned off when the device asks for reduced motion. They never delay an update
- **Fullscreen** button (bottom right), **F**, or double-click. The button and the mouse pointer hide after 2.5 seconds without movement
- Fonts (Bebas Neue, Inter) are bundled, so the display looks the same with no internet connection

## 🏗️ Technical Architecture

### Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Synchronization**: BroadcastChannel API

### Project Structure

```
src/
├── App.tsx                      # Main app with routing
├── main.tsx                     # Entry point
├── types/
│   └── basketball.ts            # TypeScript interfaces
├── lib/
│   ├── clock.ts                 # Clock calculation and formatting
│   ├── theme.ts                 # Themes, layouts, fonts and contrast rules
│   ├── logos.ts                 # Logo validation, resizing and IndexedDB storage
│   ├── gameRecords.ts           # Game records, statistics and CSV export
│   ├── sound.ts                 # Generated sound effects
│   ├── feedback.ts              # Toasts and confirmation dialogs
│   └── storage.ts               # Safe localStorage access
├── store/
│   ├── useBasketballStore.ts    # Live game, configurations, tab sync
│   ├── useGameLog.ts            # Completed games
│   └── useSettingsStore.ts      # Application settings
└── components/
    └── basketball/
        ├── OperatorLayout.tsx   # Navigation shared by operator pages
        ├── OperatorView.tsx     # Live game controls
        ├── SetupPage.tsx        # Teams, logos, rules, theme
        ├── ThemePicker.tsx      # Theme fields and live preview
        ├── ConfigsPage.tsx      # Saved configurations
        ├── HistoryPage.tsx      # Completed games
        ├── SettingsPage.tsx     # Application settings
        ├── DisplayView.tsx      # Public display page
        ├── Scoreboard.tsx       # The four public scoreboard layouts
        ├── scoreboard.css       # Scoreboard design system and responsive layouts
        ├── ClockDisplay.tsx     # Reusable clock component
        ├── ui.tsx               # Shared panels, fields, logo, dialogs
        ├── styles.ts            # Shared button and input styles
        ├── useSounds.ts         # Plays alerts on the operator page
        └── shortcuts.ts         # Keyboard shortcut table and handler
```

Tests sit next to the code they cover (`*.test.ts`).

### Key Features

**⏱️ Timestamp-Based Timers**
- Clocks use timestamps instead of simple counters
- Remain accurate even when browser tab is inactive
- A running clock keeps its time through a page refresh

**🔄 Real-Time Synchronization**
- Uses BroadcastChannel API for instant updates
- Operator and display views sync automatically
- Works across multiple tabs/windows in the same browser on the same device
- It does **not** reach other devices: a tablet operating a scoreboard on a gym TV's computer would need a server (for example a small WebSocket relay). Until then, run the operator and the display on the same computer (e.g. display on an extended screen)

**💾 State Persistence**
- Automatically saves game state and undo history to localStorage
- Survives page refreshes
- Resumes game exactly where it left off
- Running clocks stay running, so time that passes while a page is closed still counts down
- Saved data is validated on load, so bad values can't break the game
- Stored separately in this browser: the live game and configurations (`basketball-storage`), completed games (`basketball-games`), settings (`basketball-settings`), and logos (IndexedDB `basketball-logos`)
- Clearing browser data deletes all of these, and they don't move between browsers or computers

**📊 Game State Management**
- Undo with a history of the last 50 actions (no redo)
- History tracking for scoring, stats, possession, clock corrections and periods
- Configurable game rules (period duration, bonus threshold, timeouts)

**🎨 Professional Design**
- Dark theme optimized for sports venues
- Large, high-contrast typography
- Responsive layout (desktop and mobile)
- Team color customization
- Animated possession and leading indicators

## 🎯 Features

### Operator View
- ✅ Score controls (1, 2, 3 points)
- ✅ Game clock (start/pause/reset)
- ✅ Shot clock (24/14 second resets)
- ✅ Period navigation (Q1-Q4 + overtime)
- ✅ Foul tracking with bonus indicators
- ✅ Timeout management
- ✅ Possession controls
- ✅ Undo and action history
- ✅ Keyboard shortcuts
- ✅ Manual clock corrections
- ✅ Game reset with confirmation
- ✅ Team customization (names, colors)
- ✅ Configurable league rules

### Display View
- ✅ Large scores (readable from distance)
- ✅ Game clock with tenths of seconds
- ✅ Shot clock with warning animation
- ✅ Period/overtime display
- ✅ Possession indicator (animated)
- ✅ Leading team badge
- ✅ Team fouls and bonus status
- ✅ Timeouts remaining
- ✅ Team colors and branding

## 🔧 Configuration

### Game Settings

Default configuration (change the current game in Game Setup, or your defaults in Settings):
- **Period Duration**: 12 minutes
- **Overtime Duration**: 5 minutes
- **Number of Periods**: 4 quarters
- **Shot Clock**: 24 seconds, 14 for the short reset
- **Bonus Threshold**: 5 team fouls
- **Timeouts**: 3 per team
- **Each new period**: team fouls reset, timeouts are kept

### Customization

Edit `src/store/useBasketballStore.ts` to change default settings:

```typescript
const defaultConfig: GameConfig = {
  periodDuration: 12,        // minutes per quarter
  overtimeDuration: 5,       // minutes per OT
  numberOfPeriods: 4,        // regular periods
  shotClockDuration: 24,     // seconds
  foulsForBonus: 5,          // fouls for bonus
  maxTimeouts: 3,            // timeouts per team
  resetFoulsEachPeriod: true,
  restoreTimeoutsEachPeriod: false,
};
```

## 🔍 Troubleshooting

**Clock doesn't update smoothly:**
- Check if browser tab is active
- Timestamp-based system handles inactive tabs automatically

**Display not syncing:**
- Ensure both tabs are from same browser
- Refresh both operator and display views
- Check browser console for errors

**Game state lost after refresh:**
- Check if localStorage is enabled
- Verify browser privacy settings allow local storage
- Try clearing localStorage and starting fresh

**Build errors:**
- Run `npm install` to ensure dependencies are installed
- Check Node.js version (requires Node 18+)
- Clear `node_modules` and reinstall if needed

## 📦 Production Deployment

### Build

```bash
npm run build
```

Output in `dist/` folder:
- `index.html` - Entry point
- `assets/` - Bundled JS and CSS

### Deploy

The app uses page routes such as `/display` and `/history`, so configure your host to serve `index.html` for all paths. Otherwise those pages return 404 when opened directly or refreshed.

Deploy the `dist/` folder to any static hosting:
- Vercel: `vercel deploy`
- Netlify: Drag & drop `dist/` folder
- GitHub Pages: Push `dist/` to gh-pages branch
- Any web server: Copy `dist/` contents to public directory

### Environment Requirements

- Node.js 18+
- Modern browser with ES6 support
- BroadcastChannel API support (Chrome, Firefox, Safari, Edge)

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run automated tests
- `npm run lint` - Run ESLint

### Dependency Override

`package.json` forces `minimatch` to `^11.0.3` to fix advisory GHSA-g3hv-75wg-m249, because ESLint and typescript-eslint still declare `^10`. It only affects lint tooling, not the shipped app. Remove the `overrides` entry once `eslint`, `@eslint/config-array` and `@typescript-eslint/typescript-estree` all declare `minimatch` 11 or later.

### Tech Stack Details

Built with:
- **React 19.2.7** - Latest React with concurrent features
- **TypeScript 6.0.2** - Type safety and developer experience
- **Vite 8.0.12** - Lightning-fast build tool
- **Zustand 5.0.14** - Lightweight state management
- **Tailwind CSS 3.4.19** - Utility-first styling
- **Framer Motion 12.40.0** - Smooth animations
- **React Router DOM 7.17.0** - Client-side routing
- **Lucide React 1.17.0** - Beautiful icons

## 🎯 Future Enhancements

Planned features:
- [ ] Redo
- [ ] Backup and restore of configurations and history
- [ ] Multi-device sync (WebSocket)
- [ ] Player statistics tracking

## 📄 License

MIT

---

Built with ❤️ for basketball communities, schools, and sports venues.
