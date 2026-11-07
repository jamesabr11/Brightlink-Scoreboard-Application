# Contributing

This is a privately owned project (see [LICENSE](LICENSE)). Contributions are by invitation. This guide describes how work is organized so changes stay reviewable and `Main` stays stable.

## Workflow

1. **Every piece of work has an issue.** Development phases are tracked as GitHub issues with their objective, tasks, acceptance criteria and testing requirements.
2. **Branch from the latest `Main`.**
   - Phase work: `phase/<number>-<short-name>`, for example `phase/3-presentation-modes`
   - Fixes: `fix/<short-name>`
   - Maintenance and documentation: `chore/<short-name>` or `docs/<short-name>`
3. **Keep each phase to its approved scope.** Don't start the next phase early.
4. **Open a pull request into `Main`.** The repository owner reviews and merges every pull request. Nobody pushes directly to `Main`, and shared history is never force-pushed or rewritten.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) and reference the issue:

```
feat(media): add media library page with upload and preview (#1)
fix(scoreboard): keep the shot clock stopped after a period change (#2)
refactor(storage): extract shared IndexedDB helper (#1)
test(media): cover duration limits (#1)
docs: describe the storage layout
chore: remove unused template assets
```

Keep commits focused: one logical change each, never unrelated changes together, and each commit should build and pass its tests.

## Before opening a pull request

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Then test the affected features in a browser, check the browser console for errors and review your own diff. Display changes should be checked at 1280×720, 1920×1080 and 3840×2160, plus 4:3 and portrait.

A pull request description covers what changed and why, important technical decisions, testing performed, known limitations, and `Closes #<issue>`.

## Code conventions

- Keep the existing stack (React, TypeScript, Vite, Zustand, Tailwind CSS, Framer Motion). Add a dependency only with a clear technical reason.
- Reuse existing utilities and patterns before writing new ones. Keep framework-free logic in `src/lib`, state in `src/store` and shared types in `src/types`.
- Game state and presentation state stay separate. Every undoable game action goes through the store's `commit` function.
- Never store images or video in localStorage or Zustand state; use IndexedDB (`src/lib/idb.ts`).
- Branding comes from `src/lib/branding.ts`; don't hardcode school colours or names in components.
- Clean up event listeners, subscriptions and object URLs. Respect reduced-motion preferences.
- Put tests next to the code they cover (`*.test.ts`).

## Security

Never commit `.env` files, credentials, tokens or API keys. Report a security problem privately to the repository owner rather than in a public issue.
