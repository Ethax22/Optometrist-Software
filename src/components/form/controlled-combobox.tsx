"use client";

import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Like ControlledSelect, but lets the optometrist type a value that isn't in
 * the list (e.g. an odd axis reading) instead of being locked to the preset
 * options. The preset options still show up as browser-native suggestions
 * via <datalist>.
 */
export function ControlledCombobox<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  error,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  options: readonly string[];
  placeholder?: string;
  error?: string;
}) {
  const listId = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <>
            <Input
              id={name}
              list={listId}
              placeholder={placeholder}
              autoComplete="off"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
            <datalist id={listId}>
              {options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </>
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
