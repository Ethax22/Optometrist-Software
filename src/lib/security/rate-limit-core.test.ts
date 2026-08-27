import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, _resetForTests } from "./rate-limit-core";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("key-a", 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks once the limit is exceeded", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("key-b", 5, 60_000);
    }
    const result = checkRateLimit("key-b", 5, 60_000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("key-c", 5, 60_000);
    }
    // A different key must not be affected by key-c's exhausted bucket.
    expect(checkRateLimit("key-d", 5, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("key-e", 3, 1_000);
      }
      expect(checkRateLimit("key-e", 3, 1_000).allowed).toBe(false);

      vi.advanceTimersByTime(1_001);

      expect(checkRateLimit("key-e", 3, 1_000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
