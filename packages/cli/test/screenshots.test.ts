import { describe, expect, it } from "vitest";
import {
  cleanupCdpStartupFailure,
  closeBrowserAndServer,
  parseScreenshotsArgs,
  resolveChromeExecutable,
  validateHomeInvariants,
  withTimeout
} from "../src/commands/screenshots.js";

describe("screenshots command helpers", () => {
  it("parses screenshot output and build output options", () => {
    expect(parseScreenshotsArgs(["docs", "--out", "shots", "--build-out", "dist-docs"])).toEqual({
      project: "docs",
      outDir: "shots",
      buildOutDir: "dist-docs"
    });
  });

  it("rejects missing option values", () => {
    expect(() => parseScreenshotsArgs(["docs", "--out"])).toThrow(
      "Usage: documentee screenshots <project> --out <dir> --build-out <dir>"
    );
  });

  it("resolves the first available Chrome executable", async () => {
    const chrome = await resolveChromeExecutable({
      env: {},
      candidates: ["/missing/chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
      exists: async (candidate) => candidate.includes("Google Chrome")
    });

    expect(chrome).toBe("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  });

  it("uses CHROME_PATH before default Chrome candidates", async () => {
    const chrome = await resolveChromeExecutable({
      env: { CHROME_PATH: "/custom/chrome" },
      candidates: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
      exists: async (candidate) => candidate === "/custom/chrome"
    });

    expect(chrome).toBe("/custom/chrome");
  });

  it("reports broken card and mobile navigation invariants", () => {
    expect(() =>
      validateHomeInvariants({
        desktop: { cardCount: 4, cardHeadingCount: 3, firstCardHeadingVisible: true },
        mobile: { mobileHeaderVisible: false }
      })
    ).toThrow("Expected .doc-card h3 count to match .doc-card count");
  });

  it("attempts browser and server cleanup before surfacing cleanup errors", async () => {
    const calls: string[] = [];

    await expect(
      closeBrowserAndServer({
        closeBrowser: async () => {
          calls.push("browser");
          throw new Error("browser close failed");
        },
        closeServer: async () => {
          calls.push("server");
        }
      })
    ).rejects.toThrow("browser close failed");

    expect(calls).toEqual(["browser", "server"]);
  });

  it("cleans CDP startup resources before rethrowing startup errors", async () => {
    const calls: string[] = [];
    const startupError = new Error("chrome startup failed");

    await expect(
      cleanupCdpStartupFailure(startupError, {
        killBrowser: async () => {
          calls.push("kill");
        },
        removeUserDataDir: async () => {
          calls.push("rm");
        }
      })
    ).rejects.toThrow("chrome startup failed");

    expect(calls).toEqual(["kill", "rm"]);
  });

  it("times out unresolved CDP waits", async () => {
    await expect(withTimeout(new Promise(() => undefined), "CDP navigation", 1)).rejects.toThrow(
      "Timed out waiting for CDP navigation"
    );
  });
});
