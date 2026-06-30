import { describe, expect, it } from "vitest";
import { renderPlaygroundScript } from "../src/playground.js";

describe("renderPlaygroundScript", () => {
  it("contains browser request construction and result handling behavior", () => {
    const script = renderPlaygroundScript();

    expect(script).toContain("data-documentee-playground");
    expect(script).toContain("encodeURIComponent");
    expect(script).toContain("URLSearchParams");
    expect(script).toContain("Authorization");
    expect(script).toContain("Bearer ");
    expect(script).toContain("Content-Type");
    expect(script).toContain("fetch");
    expect(script).toContain("response.status");
    expect(script).toContain("response.headers.forEach");
    expect(script).toContain("Network or CORS error");
    expect(script).not.toContain("localStorage");
    expect(script).not.toContain("sessionStorage");
  });
});
