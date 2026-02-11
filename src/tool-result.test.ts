import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { SpaceshipApiError } from "./spaceship-client.js";

describe("toTextResult", () => {
  it("returns text content", () => {
    const result = toTextResult("hello");
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("includes structured content when provided", () => {
    const result = toTextResult("hello", { key: "value" });
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
      structuredContent: { key: "value" },
    });
  });

  it("omits structuredContent when not provided", () => {
    const result = toTextResult("hello");
    expect(result).not.toHaveProperty("structuredContent");
  });
});

describe("toErrorResult", () => {
  it("formats SpaceshipApiError with status and details", () => {
    const error = new SpaceshipApiError("Not found", 404, { code: "DOMAIN_NOT_FOUND" });
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Spaceship API error");
    expect(result.content[0].text).toContain("404");
    expect(result.content[0].text).toContain("DOMAIN_NOT_FOUND");
  });

  it("formats SpaceshipApiError without details", () => {
    const error = new SpaceshipApiError("Bad request", 400);
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("400");
    expect(result.content[0].text).not.toContain("Details:");
  });

  it("formats generic Error", () => {
    const result = toErrorResult(new Error("something broke"));

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("something broke");
  });

  it("formats non-Error values", () => {
    const result = toErrorResult("string error");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("string error");
  });
});
