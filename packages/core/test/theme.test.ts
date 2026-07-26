import { describe, expect, it } from "vitest";
import { resolveThemeCustomCss, resolveThemeTokens } from "../src/theme.js";

describe("theme resolution", () => {
  it("resolves design-system tokens outside the static renderer", () => {
    const tokens = resolveThemeTokens({
      designSystem: "api-ide",
      darkMode: true,
    }, "light");

    expect(tokens["--doc-primary"]).toBe("#3b82f6");
    expect(tokens["--doc-font-family"]).toContain("Geist Sans");
    expect(tokens["--doc-method-get"]).toBe("#22c55e");
    expect(tokens["--doc-content-width"]).toBe("980px");
    expect(tokens["--doc-density-space"]).toBe("10px");
  });

  it("lets nested overrides win over design-system and flat tokens", () => {
    const tokens = resolveThemeTokens({
      designSystem: "enterprise-knowledge",
      primaryColor: "#0f766e",
      overrides: {
        primaryColor: "#db2777",
        navWidth: "340px",
        contentWidth: "1040px",
      },
      darkMode: true,
    }, "light");

    expect(tokens["--doc-primary"]).toBe("#db2777");
    expect(tokens["--doc-nav-width"]).toBe("340px");
    expect(tokens["--doc-content-width"]).toBe("1040px");
    expect(tokens["--doc-accent"]).toBe("#8b5cf6");
  });

  it("sanitizes custom CSS from overrides", () => {
    const customCss = resolveThemeCustomCss({
      darkMode: true,
      customCss: ".legacy { color: red; }",
      overrides: {
        customCss: ".custom::after { content: '</style>'; }",
      },
    });

    expect(customCss).toContain("<\\/style");
    expect(customCss).not.toContain("</style");
    expect(customCss).not.toContain(".legacy");
  });

  it("keeps light panel tokens from leaking into dark mode", () => {
    const premium = resolveThemeTokens({
      designSystem: "premium-editorial",
      darkMode: true,
    }, "dark");
    const enterprise = resolveThemeTokens({
      designSystem: "enterprise-knowledge",
      darkMode: true,
    }, "dark");

    expect(premium["--doc-surface"]).toBe("#121214");
    expect(premium["--doc-panel-background"]).toBe("#121214");
    expect(enterprise["--doc-surface"]).toBe("#111827");
    expect(enterprise["--doc-panel-background"]).toBe("#111827");
  });
});
