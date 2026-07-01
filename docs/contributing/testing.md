# Testing

Run the full test suite before completing work:

```bash
pnpm test
pnpm typecheck
pnpm build
```

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
