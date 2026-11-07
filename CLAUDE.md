# CLAUDE.md
# BrightLink Basketball Scoreboard Application

## 1. Project Overview

A professional basketball scoreboard and game-day presentation application being developed as a BrightLink AV project.

The goal is to evolve the application into a commercial-quality sports presentation platform inspired by ScoreVision Producer.

Core objectives:
- Professional basketball scoreboard displays.
- Reliable operator controls.
- Multiple visual themes and display layouts.
- Team branding and customization.
- Media and sponsor advertisement management.
- Pregame, live, stadium, and halftime presentation modes.
- Reliable game state and display synchronization.

This is a sports presentation system, not a generic dashboard. Prioritize game reliability, spectator readability, and professional presentation.

## 2. Technology Stack

Existing stack:
- React 19
- TypeScript
- Vite
- Zustand 5
- Tailwind CSS 3
- Framer Motion
- React Router
- Lucide React
- Vitest
- IndexedDB
- localStorage
- BroadcastChannel API

Keep the existing stack. Do not introduce frameworks or dependencies without a clear technical reason.

## 3. Existing Architecture

### Main Routes

| Route | Purpose |
|---|---|
| `/` | Operator scoreboard controls |
| `/setup` | Team customization and game rules |
| `/configs` | Saved game configurations |
| `/history` | Finished-game records |
| `/settings` | Application preferences |
| `/display` | Public scoreboard |

### Important Components

- `OperatorView.tsx`
- `OperatorLayout.tsx`
- `SetupPage.tsx`
- `ConfigsPage.tsx`
- `HistoryPage.tsx`
- `SettingsPage.tsx`
- `DisplayView.tsx`
- `Scoreboard.tsx`
- `ClockDisplay.tsx`

### State Management

Zustand stores:

- `src/store/useBasketballStore.ts`: Game state, configurations, undo history.
- `src/store/useSettingsStore.ts`: Application settings.
- `src/store/useGameLog.ts`: Finished-game history.

Existing functionality includes scoring, game and shot clocks, periods, overtime, fouls, timeouts, possession, undo, themes, team logos, and saved configurations.

### Synchronization

- Zustand persistence and localStorage.
- BroadcastChannel for same-machine browser synchronization.
- No cross-device network synchronization currently exists.

### Media Storage

`src/lib/logos.ts` contains the existing IndexedDB logo storage implementation.

Use it as a reference for media storage. Never store large media blobs in localStorage or persisted Zustand state.

## 4. Branding and Visual Identity

### Default: Holy Cross Regional High School

| Colour | Hex |
|---|---|
| Red | `#C8102E` |
| White | `#FFFFFF` |
| Black | `#111111` |

Use these colours consistently across all scoreboard presets.

Design requirements:
- Red as the primary accent.
- Black and dark backgrounds where appropriate.
- White typography for contrast.
- Professional spacing and typography.
- Consistent team branding.
- Accessible colour contrast.

Create a centralized theme system. Do not hardcode branding into individual components.

Allow other schools to customize their team names, colours, and logos.

Do not use unofficial school logos.

### Design Inspiration

Use these products as design references, not templates to copy:

- ScoreVision: sports presentation and game-day workflows.
- Nike: athletic identity and bold typography.
- NVIDIA: dark visual foundations.
- BMW M: precision and information hierarchy.
- Vercel: clean layouts and typography.

The public display must look like a professional commercial sports scoreboard, not an ordinary website or admin dashboard.

Prioritize large scores, readable clocks, clear team identification, contrast, and viewing distance.

## 5. Development Roadmap

Follow the currently approved phase. Never automatically move to the next phase.

| Phase | Scope |
|---|---|
| 1 | Holy Cross branding and professional scoreboard presets |
| 2 | Media library, IndexedDB storage, sponsor management |
| 3 | Pregame, Live, Stadium, and Halftime modes |
| 4 | Media playback, sponsor rotation, game-day presentation |
| 5 | Final polish, reliability, fullscreen, and Wake Lock |

Important current constraints:
- Single-machine architecture.
- No iPad-specific optimization.
- No WebSockets or network synchronization.
- No backend or cloud media storage.
- No Supabase integration unless explicitly approved.

Do not implement future-phase functionality early.

## 6. Coding Standards

### General
- Write clean, maintainable TypeScript.
- Use descriptive names.
- Prefer small, reusable components.
- Avoid unnecessary abstractions.
- Reuse existing utilities and functionality.
- Separate business logic from presentation.
- Follow existing project conventions.

### React and TypeScript
- Use functional components and hooks.
- Avoid oversized components.
- Avoid `any` unless necessary.
- Keep shared types centralized.
- Clean up event listeners, subscriptions, and object URLs.
- Handle errors and missing data properly.

### Zustand
- Preserve existing store architecture.
- Keep game state separate from presentation state.
- Preserve undo functionality.
- Follow existing commit/action patterns.
- Never store large media files in Zustand.

### Styling and Animation
- Maintain consistent spacing, colours, and typography.
- Use existing styling conventions.
- Use Framer Motion for purposeful animations.
- Avoid excessive animation.
- Respect reduced-motion preferences.
- Never sacrifice scoreboard readability for visual effects.

## 7. Installed Skills and Tools

Use skills selectively. Do not activate every skill for every task.

| Skill | Best Use |
|---|---|
| Superpowers | Planning, TDD, debugging, implementation workflows |
| Claude-Mem | Persistent project context and previous decisions |
| Watch | ScoreVision video and reference analysis |
| Ponytail | Minimal changes, code efficiency, avoiding unnecessary dependencies |
| ECC | Code review, debugging, testing, specialized agents |
| Context7 | Current library documentation and API references |
| Playwright | Browser testing and regression testing |
| UI/UX Pro Max | Design systems, typography, colour and layout |
| Emil Kowalski Skills | Interaction design, animations and micro-interactions |

Prioritize existing architecture and project requirements over generic skill recommendations.

Avoid overlapping skills and conflicting instructions.

Use Context7 when working with unfamiliar or version-sensitive APIs.

Use Playwright to test actual browser functionality, not just successful compilation.

## 8. Testing Requirements

After meaningful changes:

1. Run relevant existing tests.
2. Run TypeScript checks.
3. Run the production build.
4. Test affected functionality in the browser.
5. Check browser console errors.
6. Review the Git diff.

Regression-test:
- Scoring.
- Game and shot clocks.
- Periods and overtime.
- Fouls and timeouts.
- Possession.
- Undo.
- Configurations.
- Game history.
- Display synchronization.
- Theme switching.

For public displays, test 720p, 1080p, 4K, and supported aspect ratios.

Never claim a feature was tested if it was only inspected.

## 9. GitHub and Security

This is intended to be a public GitHub portfolio project.

- Exclude `.env`, credentials, tokens, and API keys.
- Exclude `node_modules` and build artifacts.
- Do not expose personal information.
- Do not publish proprietary BrightLink AV materials without authorization.
- Review `.gitignore` and Git diffs before committing.
- Use professional commit messages.

## 10. Working Instructions

For every task:

1. Understand the requested outcome.
2. Inspect relevant existing code.
3. Identify reusable functionality.
4. Confirm the task fits the approved phase.
5. Plan the smallest reliable implementation.
6. Use relevant skills and documentation.
7. Implement focused changes.
8. Test thoroughly.
9. Review the final diff.
10. Summarize changes and remaining issues.

For large changes, explain the implementation approach before proceeding.

Do not unnecessarily ask questions when the project context already provides the answer.

If a major architectural decision is unclear, explain the options before making changes.

### Non-Negotiable Rules

- Do not rewrite working functionality unnecessarily.
- Do not introduce unnecessary dependencies.
- Do not implement unapproved future phases.
- Do not bypass security hooks or permissions.
- Do not sacrifice game reliability for visual effects.

**Overall objective: Build a reliable, polished, professional basketball scoreboard and game-day presentation platform while maintaining a clean and maintainable codebase.**