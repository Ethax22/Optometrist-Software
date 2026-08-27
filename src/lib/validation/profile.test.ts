import { describe, it, expect } from "vitest";
import { profileSchema } from "./profile";

describe("profileSchema", () => {
  it("accepts just a full name (everything else optional)", () => {
    const result = profileSchema.safeParse({ fullName: "Dr. Vijai" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing full name", () => {
    const result = profileSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(false);
  });

  it.each([
    ["9876543210", true],
    ["+91 98765 43210", true],
    ["123", false],
    ["not a phone", false],
  ])("phone %s -> valid=%s", (phone, expectedValid) => {
    const result = profileSchema.safeParse({ fullName: "Dr. Vijai", phone });
    expect(result.success).toBe(expectedValid);
  });

  it("rejects an invalid email", () => {
    const result = profileSchema.safeParse({ fullName: "Dr. Vijai", email: "nope" });
    expect(result.success).toBe(false);
  });

  it("accepts a fully filled-in profile", () => {
    const result = profileSchema.safeParse({
      fullName: "Dr. Vijai",
      qualification: "B.Optom",
      registrationNumber: "REG-123",
      phone: "9876543210",
      email: "vijai@clinic.local",
      clinicName: "Vision Care",
      clinicAddress: "12 Main St",
      city: "Chennai",
      state: "Tamil Nadu",
      postalCode: "600001",
    });
    expect(result.success).toBe(true);
  });
});
