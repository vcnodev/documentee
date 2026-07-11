# Testing

Run the full test suite before completing work:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Visual Smoke Screenshots

Visual smoke screenshots are opt-in because local browser availability varies. This smoke check is currently scoped to the dogfood docs homepage because it asserts Documentee's card-heavy first viewport. To build the dogfood docs, inspect the home page at desktop and mobile widths, and save screenshots, run:

```bash
pnpm docs:screenshots
```

The command writes PNGs to `.documentee-screenshots/` and builds the static site into `dist-docs/`. It checks DOM/CSS invariants for card rendering and mobile navigation, including `.doc-card`, `.doc-card h3`, and `.doc-mobile-header`.

The screenshot command needs a local Chrome or Chromium executable. It checks common install locations and honors `CHROME_PATH`:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm docs:screenshots
```

If no browser is available, only this opt-in command fails with an actionable message. `pnpm test` does not require browser screenshot tooling.

Feature work should follow the red-green-refactor loop:

1. Write a failing test.
2. Run it and confirm it fails for the expected reason.
3. Implement the smallest working change.
4. Run the focused test.
5. Run the full verification suite before claiming completion.

## Change Rules

- Behavior changes require tests.
- User-facing changes require docs, README, or Markdown updates.
- Config changes require config tests and README examples.
- CLI changes require CLI tests and command docs.
- OpenAPI changes require fixture coverage.
- Static renderer changes must preserve the small-HTML/no Documentee client JS policy unless a feature explicitly opts in.

See [Repository Rules](../../AGENTS.md) and [Architecture](architecture.md).
