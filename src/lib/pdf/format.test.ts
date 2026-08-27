import { describe, it, expect } from "vitest";
import {
  formatPowerForPdf,
  formatAxisForPdf,
  formatNearVaForPdf,
  formatDateForPdf,
} from "./format";

describe("formatPowerForPdf", () => {
  it("renders exactly zero unsigned, matching the reference sample PDF", () => {
    expect(formatPowerForPdf("0.00")).toBe("0.00");
    expect(formatPowerForPdf(0)).toBe("0.00");
  });

  it("signs positive values", () => {
    expect(formatPowerForPdf("2.25")).toBe("+2.25");
    expect(formatPowerForPdf(4)).toBe("+4.00");
  });

  it("signs negative values", () => {
    expect(formatPowerForPdf("-1.5")).toBe("-1.50");
  });

  it("renders null/undefined/empty as blank (unfilled ADD)", () => {
    expect(formatPowerForPdf(null)).toBe("");
    expect(formatPowerForPdf(undefined)).toBe("");
    expect(formatPowerForPdf("")).toBe("");
  });

  it("handles the extreme ends of the sphere range", () => {
    expect(formatPowerForPdf("-20.00")).toBe("-20.00");
    expect(formatPowerForPdf("20.00")).toBe("+20.00");
  });
});

describe("formatAxisForPdf", () => {
  it("renders 0 and 180 (boundary values) as plain integers", () => {
    expect(formatAxisForPdf(0)).toBe("0");
    expect(formatAxisForPdf(180)).toBe("180");
  });

  it("renders null/undefined as blank", () => {
    expect(formatAxisForPdf(null)).toBe("");
    expect(formatAxisForPdf(undefined)).toBe("");
  });
});

describe("formatNearVaForPdf", () => {
  it("hyphenates the stored N-prefixed value for PDF display", () => {
    expect(formatNearVaForPdf("N6")).toBe("N-6");
    expect(formatNearVaForPdf("N36")).toBe("N-36");
  });

  it("passes through values that don't match the N-digit pattern", () => {
    expect(formatNearVaForPdf("Not Able to Read")).toBe("Not Able to Read");
  });

  it("renders null/undefined/empty as blank", () => {
    expect(formatNearVaForPdf(null)).toBe("");
    expect(formatNearVaForPdf(undefined)).toBe("");
    expect(formatNearVaForPdf("")).toBe("");
  });
});

describe("formatDateForPdf", () => {
  it("formats an ISO date as dd/MM/yyyy", () => {
    expect(formatDateForPdf("2026-06-26")).toBe("26/06/2026");
  });
});
