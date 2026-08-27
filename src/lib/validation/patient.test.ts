import { describe, it, expect } from "vitest";
import { patientSchema } from "./patient";

const validInput = {
  name: "Jane Doe",
  uidEmpId: "UID-001",
  age: "30",
  gender: "Female",
  mobile: "9876543210",
  email: "jane@example.com",
  address: "123 Main St",
  consultationDate: "2026-01-15",
};

describe("patientSchema", () => {
  it("accepts a fully valid patient", () => {
    const result = patientSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields left blank", () => {
    const result = patientSchema.safeParse({
      ...validInput,
      mobile: "",
      email: "",
      address: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mobile).toBeUndefined();
      expect(result.data.email).toBeUndefined();
      expect(result.data.address).toBeUndefined();
    }
  });

  it("rejects a missing name", () => {
    const result = patientSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing UID/Emp Id", () => {
    const result = patientSchema.safeParse({ ...validInput, uidEmpId: "" });
    expect(result.success).toBe(false);
  });

  it.each([
    ["0", false],
    ["1", true],
    ["149", true],
    ["150", false],
    ["-5", false],
    ["12.5", false],
  ])("age boundary %s -> valid=%s", (age, expectedValid) => {
    const result = patientSchema.safeParse({ ...validInput, age });
    expect(result.success).toBe(expectedValid);
  });

  it("rejects an invalid gender", () => {
    const result = patientSchema.safeParse({ ...validInput, gender: "Unknown" });
    expect(result.success).toBe(false);
  });

  it.each(["Male", "Female", "Other"])("accepts gender %s", (gender) => {
    const result = patientSchema.safeParse({ ...validInput, gender });
    expect(result.success).toBe(true);
  });

  it.each([
    ["9876543210", true],
    ["+91 98765 43210", true],
    ["(987) 654-3210", true],
    ["12345", false], // too short
    ["call-me-maybe", false], // letters
    ["a".repeat(21), false], // too long
  ])("mobile %s -> valid=%s", (mobile, expectedValid) => {
    const result = patientSchema.safeParse({ ...validInput, mobile });
    expect(result.success).toBe(expectedValid);
  });

  it("rejects an invalid email format", () => {
    const result = patientSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing consultation date", () => {
    const result = patientSchema.safeParse({ ...validInput, consultationDate: "" });
    expect(result.success).toBe(false);
  });
});
