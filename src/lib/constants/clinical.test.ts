import { describe, it, expect } from "vitest";
import {
  sphereOptions,
  cylinderOptions,
  axisOptions,
  addOptions,
  distanceVisualAcuityOptions,
  nearVisualAcuityOptions,
  colorBlindnessOptions,
  pinholeOptions,
  formatSignedPower,
} from "./clinical";

describe("sphereOptions", () => {
  it("spans -20.00 to +20.00 in 0.25 steps", () => {
    expect(sphereOptions[0]).toBe("-20.00");
    expect(sphereOptions.at(-1)).toBe("+20.00");
    expect(sphereOptions).toContain("+0.00");
    expect(sphereOptions.length).toBe(161); // (20 - -20) / 0.25 + 1
  });
});

describe("cylinderOptions", () => {
  it("spans -5.00 to +5.00 in 0.25 steps", () => {
    expect(cylinderOptions[0]).toBe("-5.00");
    expect(cylinderOptions.at(-1)).toBe("+5.00");
    expect(cylinderOptions.length).toBe(41);
  });
});

describe("axisOptions", () => {
  it("spans 0 to 180 in 1 degree steps, no sign", () => {
    expect(axisOptions[0]).toBe("0");
    expect(axisOptions.at(-1)).toBe("180");
    expect(axisOptions.length).toBe(181);
  });
});

describe("addOptions", () => {
  it("spans +0.00 to +4.00 in 0.25 steps", () => {
    expect(addOptions[0]).toBe("+0.00");
    expect(addOptions.at(-1)).toBe("+4.00");
    expect(addOptions.length).toBe(17);
  });
});

describe("distanceVisualAcuityOptions", () => {
  it("matches the reference app's confirmed 21-option list exactly", () => {
    expect(distanceVisualAcuityOptions).toEqual([
      "NO PL",
      "PL+",
      "PL PR Inaccurate",
      "PL PR Accurate",
      "HM+",
      "CF@3m",
      "CF@2m",
      "CF@1m",
      "6/60",
      "6/36(P)",
      "6/36",
      "6/24(P)",
      "6/24",
      "6/18(P)",
      "6/18",
      "6/12(P)",
      "6/12",
      "6/9(P)",
      "6/9",
      "6/6(P)",
      "6/6",
    ]);
  });

  it("pinholeOptions reuses the same list (no separate duplicated list)", () => {
    expect(pinholeOptions).toBe(distanceVisualAcuityOptions);
  });
});

describe("nearVisualAcuityOptions", () => {
  it("matches the handwritten clinical spec", () => {
    expect(nearVisualAcuityOptions).toEqual([
      "Not Able to Read",
      "N36",
      "N24",
      "N18",
      "N12",
      "N10",
      "N8",
      "N6",
    ]);
  });
});

describe("colorBlindnessOptions", () => {
  it("is exactly Normal/Abnormal -- no per-eye breakdown", () => {
    expect(colorBlindnessOptions).toEqual(["Normal", "Abnormal"]);
  });
});

describe("formatSignedPower", () => {
  it("signs zero as +0.00 (the UI dropdown convention)", () => {
    expect(formatSignedPower(0)).toBe("+0.00");
  });

  it("signs positive and negative values", () => {
    expect(formatSignedPower(2.25)).toBe("+2.25");
    expect(formatSignedPower(-1.5)).toBe("-1.50");
  });

  it("re-normalizes a DB value that lost its leading '+' (Postgres numeric behavior)", () => {
    // Confirmed via direct DB testing in Phase 6: Postgres strips the '+'
    // sign from a stored positive numeric on output.
    expect(formatSignedPower(Number("2.25"))).toBe("+2.25");
  });
});
