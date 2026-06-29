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
