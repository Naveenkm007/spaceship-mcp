import { describe, it, expect, vi, beforeEach } from "vitest";
import { isNewerVersion, checkForUpdate } from "./update-checker.js";

describe("isNewerVersion", () => {
  it("returns true when major is newer", () => {
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(true);
  });

  it("returns true when minor is newer", () => {
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(true);
  });

  it("returns true when patch is newer", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false when current is newer", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(false);
  });

  it("returns false when current minor is newer", () => {
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
  });

  it("returns false when current patch is newer", () => {
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
  });

  it("handles higher major with lower minor", () => {
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("handles missing patch on latest", () => {
    expect(isNewerVersion("1.1", "1.0.0")).toBe(true);
  });

  it("handles missing patch on current", () => {
    expect(isNewerVersion("1.0.1", "1.0")).toBe(true);
  });

  it("handles missing segments on both sides", () => {
    expect(isNewerVersion("1.1", "1.0")).toBe(true);
  });

  it("returns false when both have missing but equal segments", () => {
    expect(isNewerVersion("1.0", "1.0")).toBe(false);
  });
});

describe("checkForUpdate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes to stderr when a newer version is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "9.9.9" }), { status: 200 }),
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await checkForUpdate("spaceship-mcp", "0.1.0");

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stderrSpy.mock.calls[0][0]).toContain("Update available: 0.1.0 → 9.9.9");
    expect(stderrSpy.mock.calls[0][0]).toContain("npm install -g spaceship-mcp@latest");
  });

  it("does nothing when already on latest", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "1.0.0" }), { status: 200 }),
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await checkForUpdate("spaceship-mcp", "1.0.0");

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("does nothing when current is newer than registry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "1.0.0" }), { status: 200 }),
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await checkForUpdate("spaceship-mcp", "2.0.0");

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("does nothing when registry returns non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }),
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await checkForUpdate("spaceship-mcp", "1.0.0");

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("silently ignores network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await checkForUpdate("spaceship-mcp", "1.0.0");

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("fetches the correct registry URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "1.0.0" }), { status: 200 }),
    );

    await checkForUpdate("my-package", "1.0.0");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://registry.npmjs.org/my-package/latest",
    );
  });
});
