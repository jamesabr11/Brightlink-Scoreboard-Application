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

## 📖 How to Use

### Setting Up a Game

1. Open the operator view at http://localhost:5173/
2. Click the **Setup** button to configure:
   - Home and away team names
   - Team colors
3. Click **Open Display ↗** to launch the public scoreboard in a new window/tab

### Operating During a Game

**Scoring:**
- Click **+1**, **+2**, or **+3** to add points for each team
- Click **-1** to subtract points if needed

**Game Clock:**
- **Start** button begins the clock
- **Pause** button stops it
- **Reset** button returns clock to period duration
- Clock automatically stops at 0:00

**Shot Clock:**
- **Start** button begins the shot clock
- **24** button resets to 24 seconds
- **14** button resets to 14 seconds (offensive rebound)
- Clock turns red and pulses when ≤5 seconds

**Fouls & Timeouts:**
- Use **+** and **-** buttons to adjust fouls and timeouts
- **BONUS** indicator appears automatically at 5+ fouls

**Possession:**
- Click **Give Possession** to award possession to a team
- Yellow dot appears on display showing which team has the ball

**Periods:**
- **Previous** / **Next** buttons navigate quarters
- Automatically switches to overtime after Q4

**Other Controls:**
- **Undo** reverses the last action (scoring, fouls, timeouts)
- **Reset Game** clears everything (requires confirmation)

### Public Display

The display view (`/display`) shows:
- Large, readable scores
- Game clock and shot clock
- Current period/overtime
- Team fouls and timeouts
- Possession indicator
- Leading team badge
- Bonus indicators

**Display features:**
- Updates automatically when operator makes changes
- Optimized for TVs, projectors, and large screens
- High contrast for visibility from distance
- Smooth animations
- Works in fullscreen mode (press F11)

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
├── store/
│   └── useBasketballStore.ts   # Zustand state management
└── components/
    └── basketball/
        ├── OperatorView.tsx     # Operator control panel
        ├── DisplayView.tsx      # Public scoreboard display
        └── ClockDisplay.tsx     # Reusable clock component
```

### Key Features

**⏱️ Timestamp-Based Timers**
- Clocks use timestamps instead of simple counters
- Remain accurate even when browser tab is inactive
- No time drift during page refreshes

**🔄 Real-Time Synchronization**
- Uses BroadcastChannel API for instant updates
- Operator and display views sync automatically
- Works across multiple tabs/windows on same device

**💾 State Persistence**
- Automatically saves game state to localStorage
- Survives page refreshes
- Resumes game exactly where it left off
- Clocks intentionally saved in paused state to prevent time jumps

**📊 Game State Management**
- Complete undo/redo system (last 50 actions)
- History tracking for all scoring and stat changes
- Configurable game rules (period duration, shot clock, bonus threshold)

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
- ✅ Undo functionality
- ✅ Game reset with confirmation
- ✅ Team customization (names, colors)

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

Default configuration (customizable in setup):
- **Period Duration**: 12 minutes
- **Overtime Duration**: 5 minutes
- **Number of Periods**: 4 quarters
- **Shot Clock**: 24 seconds
- **Bonus Threshold**: 5 team fouls
- **Timeouts**: 3 per team

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

Deploy the `dist/` folder to any static hosting:
- Vercel: `vercel deploy`
- Netlify: Drag & drop `dist/` folder
- GitHub Pages: Push `dist/` to gh-pages branch
- Any web server: Copy `dist/` contents to public directory

### Environment Requirements

- Node.js 18+
- Modern browser with ES6 support
- BroadcastChannel API support (Chrome, Firefox, Safari, Edge)

## 🏗️ Build Information

**Latest Production Build:**
```
✓ 2157 modules transformed
✓ Built in 775ms
dist/index.html                   0.46 kB │ gzip:   0.29 kB
dist/assets/index-*.css          10.60 kB │ gzip:   2.97 kB
dist/assets/index-*.js          380.84 kB │ gzip: 119.72 kB
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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
- [ ] Keyboard shortcuts
- [ ] Saved game configurations
- [ ] Game history/statistics
- [ ] Team logo upload
- [ ] Multiple scoreboard themes
- [ ] Export game data
- [ ] Multi-device sync (WebSocket)
- [ ] Sound effects
- [ ] Player statistics tracking

## 📄 License

MIT

---

Built with ❤️ for basketball communities, schools, and sports venues.
