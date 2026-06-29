#!/usr/bin/env tsx
import { initCommand } from "@documentee/cli";

const target = process.argv[2];

if (!target) {
  console.error("Usage: create-documentee <project>");
  process.exitCode = 1;
} else {
  await initCommand(target);
}
