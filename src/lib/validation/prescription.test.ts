import { describe, it, expect } from "vitest";
import { prescriptionSchema } from "./prescription";

describe("prescriptionSchema", () => {
  it("accepts a completely empty exam (nothing filled in yet)", () => {
    const result = prescriptionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a fully filled-in exam", () => {
    const result = prescriptionSchema.safeParse({
      rightSph: "+2.25",
      rightCyl: "-1.00",
      rightAxis: "90",
      rightAdd: "+2.00",
      leftSph: "-0.50",
      leftCyl: "+0.25",
      leftAxis: "180",
      leftAdd: "",
      distanceUncorrectedRight: "6/6",
      distanceUncorrectedLeft: "6/9(P)",
      distanceCorrectedRight: "6/6",
      distanceCorrectedLeft: "6/6",
      nearUncorrectedRight: "N6",
      nearUncorrectedLeft: "N8",
      nearCorrectedRight: "N6",
      nearCorrectedLeft: "N6",
      pinholeRight: "6/6",
      pinholeLeft: "6/6",
      colorBlindnessResult: "Normal",
      remarks: "Both eyes normal.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leftAdd).toBeUndefined();
    }
  });

  it("rejects an invalid color blindness value", () => {
    const result = prescriptionSchema.safeParse({ colorBlindnessResult: "Maybe" });
    expect(result.success).toBe(false);
  });

  it("rejects remarks over the length cap", () => {
    const result = prescriptionSchema.safeParse({ remarks: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts remarks at exactly the length cap", () => {
    const result = prescriptionSchema.safeParse({ remarks: "a".repeat(2000) });
    expect(result.success).toBe(true);
  });
});
