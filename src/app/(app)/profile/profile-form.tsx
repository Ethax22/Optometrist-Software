"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileAction, type ActionResult } from "@/lib/profile/actions";
import type { optometristProfiles } from "@/lib/db/schema";

type Profile = typeof optometristProfiles.$inferSelect;
type TextFieldName =
  | "fullName"
  | "qualification"
  | "registrationNumber"
  | "phone"
  | "email"
  | "clinicName"
  | "clinicAddress"
  | "city"
  | "state"
  | "postalCode";

const FIELDS: Array<{ name: TextFieldName; label: string; required?: boolean }> = [
  { name: "fullName", label: "Full Name", required: true },
  { name: "qualification", label: "Qualification" },
  { name: "registrationNumber", label: "Registration Number" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "clinicName", label: "Clinic Name" },
  { name: "clinicAddress", label: "Clinic Address" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "postalCode", label: "Postal Code" },
];

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optometrist Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  defaultValue={profile?.[field.name] ?? ""}
                  required={field.required}
                />
              </div>
            ))}
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state && "success" in state && (
            <p className="text-sm text-emerald-600" role="status">
              Profile saved.
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
