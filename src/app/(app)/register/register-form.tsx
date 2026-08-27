"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerPatientAction, type ActionResult } from "@/lib/patients/actions";
import { patientSchema, genderOptions, type PatientInput } from "@/lib/validation/patient";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type PatientFormValues = z.input<typeof patientSchema>;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, PatientInput>(
    registerPatientAction,
    null,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      uidEmpId: "",
      mobile: "",
      email: "",
      address: "",
      consultationDate: todayIsoDate(),
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Patient</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => formAction(patientSchema.parse(data)))}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name<span className="text-destructive"> *</span>
              </Label>
              <Input id="name" {...register("name")} autoFocus />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="uidEmpId">
                UID / Emp Id<span className="text-destructive"> *</span>
              </Label>
              <Input id="uidEmpId" {...register("uidEmpId")} />
              {errors.uidEmpId && (
                <p className="text-sm text-destructive">{errors.uidEmpId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">
                Age<span className="text-destructive"> *</span>
              </Label>
              <Input id="age" type="number" min={1} max={149} {...register("age")} />
              {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender<span className="text-destructive"> *</span>
              </Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" type="tel" {...register("mobile")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultationDate">
                Date of Testing<span className="text-destructive"> *</span>
              </Label>
              <Input id="consultationDate" type="date" {...register("consultationDate")} />
              {errors.consultationDate && (
                <p className="text-sm text-destructive">{errors.consultationDate.message}</p>
              )}
            </div>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
              {state.existingPatientId && (
                <>
                  {" "}
                  <Link href={`/patients/${state.existingPatientId}`} className="underline">
                    Go to existing patient
                  </Link>
                  .
                </>
              )}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Proceeding..." : "Proceed"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
