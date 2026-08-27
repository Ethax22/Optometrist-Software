"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startNewVisitAction, type ActionResult } from "@/lib/patients/actions";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewVisitForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    { patientId: string; consultationDate: string }
  >(startNewVisitAction, null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const consultationDate = (e.currentTarget.elements.namedItem(
          "consultationDate",
        ) as HTMLInputElement).value;
        formAction({ patientId, consultationDate });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="consultationDate">Date of Testing</Label>
        <Input
          id="consultationDate"
          name="consultationDate"
          type="date"
          defaultValue={todayIsoDate()}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Starting..." : "New Visit"}
      </Button>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
