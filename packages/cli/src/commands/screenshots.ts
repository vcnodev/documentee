import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { Server } from "node:http";
import { previewCommand } from "./preview.js";

const USAGE = "Usage: documentee screenshots <project> --out <dir> --build-out <dir>";
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const CDP_TIMEOUT_MS = 10_000;

export interface ScreenshotsOptions {
  outDir?: string;
  buildOutDir?: string;
}

export interface ParsedScreenshotsArgs {
  project: string;
  outDir: string;
  buildOutDir: string;
}

export interface HomeInvariantSnapshot {
  desktop: {
    cardCount: number;
    cardHeadingCount: number;
    firstCardHeadingVisible: boolean;
  };
  mobile: {
    mobileHeaderVisible: boolean;
  };
}

interface ChromeResolutionOptions {
  env?: NodeJS.ProcessEnv;
  candidates?: string[];
  exists?: (candidate: string) => Promise<boolean> | boolean;
}

interface BrowserRunner {
  capture(baseUrl: string, outDir: string): Promise<HomeInvariantSnapshot>;
  close(): Promise<void>;
}

export function parseScreenshotsArgs(argv: string[]): ParsedScreenshotsArgs {
  const [project, ...rest] = argv;
  if (!project) throw new Error(USAGE);

  let outDir = ".documentee-screenshots";
  let buildOutDir = "dist-docs";

  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    const value = rest[index + 1];
    if (option === "--out") {
      if (!value) throw new Error(USAGE);
      outDir = value;
      index += 1;
      continue;
    }
    if (option === "--build-out") {
      if (!value) throw new Error(USAGE);
      buildOutDir = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown screenshots option: ${option}`);
  }

  return { project, outDir, buildOutDir };
}

export async function screenshotsCommand(projectRoot: string, options: ScreenshotsOptions = {}): Promise<void> {
  const outDir = resolve(options.outDir ?? ".documentee-screenshots");
  const buildOutDir = resolve(options.buildOutDir ?? "dist-docs");
  const chromeExecutable = await resolveChromeExecutable();

  if (!chromeExecutable) {
    throw new Error(
      [
        "No Chrome executable found for visual smoke screenshots.",
        "Install Google Chrome or set CHROME_PATH to a Chrome/Chromium executable.",
        "This opt-in command needs a local browser, but pnpm test does not."
      ].join(" ")
    );
  }

  await mkdir(outDir, { recursive: true });
  const server = await previewCommand(projectRoot, { outDir: buildOutDir, port: 0 });
  let runner: BrowserRunner | undefined;
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to determine preview server address for screenshots.");
    }

    runner = await createBrowserRunner(chromeExecutable);
    const snapshot = await runner.capture(`http://127.0.0.1:${address.port}`, outDir);
    validateHomeInvariants(snapshot);
    console.log(`Saved visual smoke screenshots to ${outDir}`);
  } finally {
    await closeBrowserAndServer({
      closeBrowser: async () => {
        if (runner) await runner.close();
      },
      closeServer: () => closeServer(server)
    });
  }
}

export async function resolveChromeExecutable(options: ChromeResolutionOptions = {}): Promise<string | undefined> {
  const env = options.env ?? process.env;
  const exists = options.exists ?? ((candidate: string) => existsSync(candidate));
  const candidates = [
    env.CHROME_PATH,
    ...(options.candidates ?? defaultChromeCandidates())
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  return undefined;
}

export function validateHomeInvariants(snapshot: HomeInvariantSnapshot): void {
  if (snapshot.desktop.cardCount < 4) {
    throw new Error(`Expected at least 4 .doc-card elements on desktop home, found ${snapshot.desktop.cardCount}.`);
  }
  if (snapshot.desktop.cardHeadingCount !== snapshot.desktop.cardCount) {
    throw new Error(
      `Expected .doc-card h3 count to match .doc-card count, found ${snapshot.desktop.cardHeadingCount} headings for ${snapshot.desktop.cardCount} cards.`
    );
  }
  if (!snapshot.desktop.firstCardHeadingVisible) {
    throw new Error("Expected the first .doc-card h3 to be visible on desktop home.");
  }
  if (!snapshot.mobile.mobileHeaderVisible) {
    throw new Error("Expected .doc-mobile-header to be visible on mobile home.");
  }
}

export async function closeBrowserAndServer(options: {
  closeBrowser: () => Promise<void>;
  closeServer: () => Promise<void>;
}): Promise<void> {
  const errors: unknown[] = [];

  try {
    await options.closeBrowser();
  } catch (error) {
    errors.push(error);
  }

  try {
    await options.closeServer();
  } catch (error) {
    errors.push(error);
  }

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "Failed to clean up screenshot resources.");
}

export async function cleanupCdpStartupFailure(error: unknown, options: {
  killBrowser: () => Promise<void>;
  removeUserDataDir: () => Promise<void>;
}): Promise<never> {
  try {
    await closeBrowserAndServer({
      closeBrowser: options.killBrowser,
      closeServer: options.removeUserDataDir
    });
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], "Chrome startup failed and cleanup also failed.");
  }

  throw error;
}

export async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = CDP_TIMEOUT_MS): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function createBrowserRunner(chromeExecutable: string): Promise<BrowserRunner> {
  const playwright = await loadPlaywright();
  if (playwright) return createPlaywrightRunner(playwright, chromeExecutable);
  return createCdpRunner(chromeExecutable);
}

async function loadPlaywright(): Promise<any | undefined> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  for (const specifier of ["playwright", "playwright-core"]) {
    try {
      return await dynamicImport(specifier);
    } catch (error) {
      if (!isMissingModuleError(error)) throw error;
    }
  }
  return undefined;
}

function isMissingModuleError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ERR_MODULE_NOT_FOUND";
}

async function createPlaywrightRunner(playwright: any, chromeExecutable: string): Promise<BrowserRunner> {
  const browser = await playwright.chromium.launch({ executablePath: chromeExecutable, headless: true });
  return {
    async capture(baseUrl, outDir) {
      const page = await browser.newPage();
      try {
        await page.setViewportSize(DESKTOP_VIEWPORT);
        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
        const desktop = {
          cardCount: await page.locator(".doc-card").count(),
          cardHeadingCount: await page.locator(".doc-card h3").count(),
          firstCardHeadingVisible: await page.locator(".doc-card h3").first().isVisible()
        };
        await page.screenshot({ path: join(outDir, "home-desktop.png"), fullPage: true });

        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
        const mobile = {
          mobileHeaderVisible: await page.locator(".doc-mobile-header").isVisible()
        };
        await page.screenshot({ path: join(outDir, "home-mobile.png"), fullPage: true });

        return { desktop, mobile };
      } finally {
        await page.close();
      }
    },
    async close() {
      await browser.close();
    }
  };
}

async function createCdpRunner(chromeExecutable: string): Promise<BrowserRunner> {
  const userDataDir = await mkdtemp(join(tmpdir(), "documentee-chrome-"));
  const process = spawn(chromeExecutable, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ]);
  let endpoint: string;
  try {
    endpoint = await waitForDevToolsEndpoint(process);
  } catch (error) {
    await cleanupCdpStartupFailure(error, {
      killBrowser: () => killProcess(process),
      removeUserDataDir: () => rm(userDataDir, { recursive: true, force: true })
    });
  }

  return {
    async capture(baseUrl, outDir) {
      const pageEndpoint = await createCdpPage(endpoint);
      const page = new CdpClient(pageEndpoint);
      await page.open();
      try {
        await page.send("Page.enable");
        await page.send("Runtime.enable");
        await setViewport(page, DESKTOP_VIEWPORT);
        await navigate(page, `${baseUrl}/`);
        const desktop = await evaluate<HomeInvariantSnapshot["desktop"]>(page, desktopInvariantExpression());
        await captureScreenshot(page, join(outDir, "home-desktop.png"));

        await setViewport(page, MOBILE_VIEWPORT);
        await navigate(page, `${baseUrl}/`);
        const mobile = await evaluate<HomeInvariantSnapshot["mobile"]>(page, mobileInvariantExpression());
        await captureScreenshot(page, join(outDir, "home-mobile.png"));

        return { desktop, mobile };
      } finally {
        page.close();
      }
    },
    async close() {
      await killProcess(process);
      await rm(userDataDir, { recursive: true, force: true });
    }
  };
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

async function killProcess(process: ChildProcessWithoutNullStreams): Promise<void> {
  if (process.exitCode !== null || process.killed) return;
  process.kill();
  await Promise.race([
    once(process, "exit"),
    new Promise<void>((resolveKill) => setTimeout(resolveKill, 1_000))
  ]);
}

async function waitForDevToolsEndpoint(process: ChildProcessWithoutNullStreams): Promise<string> {
  let stderr = "";
  return await new Promise((resolveEndpoint, rejectEndpoint) => {
    let settled = false;
    const timeout = setTimeout(() => {
      rejectOnce(new Error(`Timed out waiting for Chrome DevTools endpoint. Chrome stderr: ${stderr.trim()}`));
    }, 10_000);

    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectEndpoint(error);
    };
    const resolveOnce = (endpoint: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveEndpoint(endpoint);
    };

    process.once("error", rejectOnce);
    process.once("exit", (code) => rejectOnce(new Error(`Chrome exited before DevTools was ready with code ${code}. Chrome stderr: ${stderr.trim()}`)));
    process.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        resolveOnce(match[1]);
      }
    });
  });
}

async function createCdpPage(browserEndpoint: string): Promise<string> {
  const endpoint = new URL(browserEndpoint);
  const response = await withTimeout(fetch(`http://${endpoint.host}/json/new?about:blank`, { method: "PUT" }), "Chrome DevTools page creation");
  if (!response.ok) throw new Error(`Unable to create Chrome DevTools page: ${response.status} ${response.statusText}`);
  const target = await response.json() as { webSocketDebuggerUrl?: string };
  if (!target.webSocketDebuggerUrl) throw new Error("Chrome DevTools did not return a page WebSocket URL.");
  return target.webSocketDebuggerUrl;
}

class CdpClient {
  private id = 0;
  private socket?: WebSocket;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private waiters = new Map<string, Array<{ resolve: (params: any) => void; reject: (error: Error) => void }>>();

  constructor(private readonly endpoint: string) {}

  async open(): Promise<void> {
    if (typeof WebSocket === "undefined") {
      throw new Error("Node.js WebSocket support is required for Chrome DevTools visual smoke screenshots.");
    }
    this.socket = new WebSocket(this.endpoint);
    await withTimeout(new Promise<void>((resolveOpen, rejectOpen) => {
      this.socket?.addEventListener("open", () => resolveOpen(), { once: true });
      this.socket?.addEventListener("error", () => rejectOpen(new Error("Failed to connect to Chrome DevTools.")), { once: true });
      this.socket?.addEventListener("message", (event) => this.handleMessage(event));
      this.socket?.addEventListener("error", () => this.rejectAll(new Error("Chrome DevTools socket error.")));
      this.socket?.addEventListener("close", () => this.rejectAll(new Error("Chrome DevTools socket closed.")));
    }), "Chrome DevTools socket connection");
  }

  async send(method: string, params?: Record<string, unknown>): Promise<any> {
    const socket = this.socket;
    if (!socket) throw new Error("Chrome DevTools socket is not open.");
    const id = ++this.id;
    const response = new Promise((resolveResponse, rejectResponse) => {
      this.pending.set(id, { resolve: resolveResponse, reject: rejectResponse });
    });
    socket.send(JSON.stringify({ id, method, params }));
    return withTimeout(response, `Chrome DevTools command ${method}`);
  }

  waitFor(method: string): Promise<any> {
    return withTimeout(new Promise((resolveEvent, rejectEvent) => {
      const waiters = this.waiters.get(method) ?? [];
      waiters.push({ resolve: resolveEvent, reject: rejectEvent });
      this.waiters.set(method, waiters);
    }), `Chrome DevTools event ${method}`);
  }

  close(): void {
    this.socket?.close();
  }

  private handleMessage(event: MessageEvent): void {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      method?: string;
      params?: any;
      error?: { message?: string };
      result?: any;
    };

    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
      else pending.resolve(message.result);
      return;
    }

    if (message.method) {
      const waiters = this.waiters.get(message.method) ?? [];
      this.waiters.delete(message.method);
      for (const waiter of waiters) waiter.resolve(message.params);
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();

    for (const waiters of this.waiters.values()) {
      for (const waiter of waiters) waiter.reject(error);
    }
    this.waiters.clear();
  }
}

async function setViewport(page: CdpClient, viewport: { width: number; height: number }): Promise<void> {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 600
  });
}

async function navigate(page: CdpClient, url: string): Promise<void> {
  const loaded = page.waitFor("Page.loadEventFired");
  await page.send("Page.navigate", { url });
  await loaded;
}

async function evaluate<T>(page: CdpClient, expression: string): Promise<T> {
  const result = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(`Chrome evaluation failed: ${result.exceptionDetails.text ?? "unknown error"}`);
  }
  return result.result.value as T;
}

async function captureScreenshot(page: CdpClient, filePath: string): Promise<void> {
  const result = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  await writeFile(filePath, Buffer.from(result.data, "base64"));
}

function desktopInvariantExpression(): string {
  return `(() => {
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    return {
      cardCount: document.querySelectorAll(".doc-card").length,
      cardHeadingCount: document.querySelectorAll(".doc-card h3").length,
      firstCardHeadingVisible: visible(document.querySelector(".doc-card h3"))
    };
  })()`;
}

function mobileInvariantExpression(): string {
  return `(() => {
    const element = document.querySelector(".doc-mobile-header");
    if (!element) return { mobileHeaderVisible: false };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      mobileHeaderVisible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0
    };
  })()`;
}

function defaultChromeCandidates(): string[] {
  return [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe")
  ].filter((candidate) => basename(candidate) !== "");
}
