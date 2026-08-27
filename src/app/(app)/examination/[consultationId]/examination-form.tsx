"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ControlledSelect } from "@/components/form/controlled-select";
import {
  sphereOptions,
  cylinderOptions,
  axisOptions,
  addOptions,
  distanceVisualAcuityOptions,
  nearVisualAcuityOptions,
  pinholeOptions,
  colorBlindnessOptions,
  formatSignedPower,
} from "@/lib/constants/clinical";
import { prescriptionSchema, type PrescriptionInput } from "@/lib/validation/prescription";
import {
  saveExaminationAction,
  saveAndGeneratePdfAction,
  type ActionResult,
} from "@/lib/prescriptions/actions";
import type { prescriptions } from "@/lib/db/schema";

type Prescription = typeof prescriptions.$inferSelect;

function defaultsFromPrescription(p: Prescription | null): PrescriptionInput {
  return {
    rightSph: p?.rightSph ? formatSignedPower(Number(p.rightSph)) : undefined,
    rightCyl: p?.rightCyl ? formatSignedPower(Number(p.rightCyl)) : undefined,
    rightAxis: p?.rightAxis != null ? String(p.rightAxis) : undefined,
    rightAdd: p?.rightAdd ? formatSignedPower(Number(p.rightAdd)) : undefined,
    leftSph: p?.leftSph ? formatSignedPower(Number(p.leftSph)) : undefined,
    leftCyl: p?.leftCyl ? formatSignedPower(Number(p.leftCyl)) : undefined,
    leftAxis: p?.leftAxis != null ? String(p.leftAxis) : undefined,
    leftAdd: p?.leftAdd ? formatSignedPower(Number(p.leftAdd)) : undefined,
    distanceUncorrectedRight: p?.distanceUncorrectedRight ?? undefined,
    distanceUncorrectedLeft: p?.distanceUncorrectedLeft ?? undefined,
    distanceCorrectedRight: p?.distanceCorrectedRight ?? undefined,
    distanceCorrectedLeft: p?.distanceCorrectedLeft ?? undefined,
    nearUncorrectedRight: p?.nearUncorrectedRight ?? undefined,
    nearUncorrectedLeft: p?.nearUncorrectedLeft ?? undefined,
    nearCorrectedRight: p?.nearCorrectedRight ?? undefined,
    nearCorrectedLeft: p?.nearCorrectedLeft ?? undefined,
    pinholeRight: p?.pinholeRight ?? undefined,
    pinholeLeft: p?.pinholeLeft ?? undefined,
    colorBlindnessResult: (p?.colorBlindnessResult as PrescriptionInput["colorBlindnessResult"]) ?? undefined,
    remarks: p?.remarks ?? undefined,
  };
}

export function ExaminationForm({
  consultationId,
  prescription,
}: {
  consultationId: string;
  prescription: Prescription | null;
}) {
  const [saveState, saveAction, savePending] = useActionState<
    ActionResult | null,
    { consultationId: string } & PrescriptionInput
  >(saveExaminationAction, null);
  const [pdfState, pdfAction, pdfPending] = useActionState<
    ActionResult | null,
    { consultationId: string } & PrescriptionInput
  >(saveAndGeneratePdfAction, null);

  const { control, register, handleSubmit } = useForm<z.input<typeof prescriptionSchema>>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: defaultsFromPrescription(prescription),
  });

  const busy = savePending || pdfPending;
  const state = pdfState ?? saveState;

  const triggeredForRef = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (
      pdfState &&
      pdfState !== triggeredForRef.current &&
      "success" in pdfState &&
      pdfState.downloadPdf
    ) {
      triggeredForRef.current = pdfState;
      // This is a file download (Content-Disposition: attachment), not a
      // page navigation -- router.push() would try to client-render the
      // response instead of letting the browser download it.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/api/prescriptions/${consultationId}/pdf`;
    }
  }, [pdfState, consultationId]);

  const onSave = handleSubmit((data) => {
    const parsed = prescriptionSchema.parse(data);
    saveAction({ consultationId, ...parsed });
  });

  const onSaveAndGeneratePdf = handleSubmit((data) => {
    const parsed = prescriptionSchema.parse(data);
    pdfAction({ consultationId, ...parsed });
  });

  return (
    <form className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Refraction</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Right Eye</h3>
            <ControlledSelect control={control} name="rightSph" label="SPH" options={sphereOptions} />
            <ControlledSelect control={control} name="rightCyl" label="CYL" options={cylinderOptions} />
            <ControlledSelect control={control} name="rightAxis" label="AXIS" options={axisOptions} />
            <ControlledSelect control={control} name="rightAdd" label="ADD" options={addOptions} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Left Eye</h3>
            <ControlledSelect control={control} name="leftSph" label="SPH" options={sphereOptions} />
            <ControlledSelect control={control} name="leftCyl" label="CYL" options={cylinderOptions} />
            <ControlledSelect control={control} name="leftAxis" label="AXIS" options={axisOptions} />
            <ControlledSelect control={control} name="leftAdd" label="ADD" options={addOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distance Vision</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ControlledSelect
            control={control}
            name="distanceUncorrectedRight"
            label="Right Eye Uncorrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="distanceUncorrectedLeft"
            label="Left Eye Uncorrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="distanceCorrectedRight"
            label="Right Eye Corrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="distanceCorrectedLeft"
            label="Left Eye Corrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="pinholeRight"
            label="Pin-Hole Right Eye"
            options={pinholeOptions}
          />
          <ControlledSelect
            control={control}
            name="pinholeLeft"
            label="Pin-Hole Left Eye"
            options={pinholeOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Near Vision</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ControlledSelect
            control={control}
            name="nearUncorrectedRight"
            label="Right Eye Uncorrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="nearUncorrectedLeft"
            label="Left Eye Uncorrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="nearCorrectedRight"
            label="Right Eye Corrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledSelect
            control={control}
            name="nearCorrectedLeft"
            label="Left Eye Corrected"
            options={nearVisualAcuityOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Blindness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ControlledSelect
            control={control}
            name="colorBlindnessResult"
            label="Color Blindness Test Result"
            options={colorBlindnessOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="remarks">Remarks / Observations / Findings</Label>
          <Textarea id="remarks" rows={4} {...register("remarks")} />
        </CardContent>
      </Card>

      {state && "error" in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state && "success" in state && !("error" in state) && (
        <p className="text-sm text-emerald-600" role="status">
          {state.downloadPdf ? "Saved. Downloading PDF..." : "Examination saved."}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={onSave}>
          {savePending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" disabled={busy} onClick={onSaveAndGeneratePdf}>
          {pdfPending ? "Saving..." : "Save & Generate PDF"}
        </Button>
      </div>
    </form>
  );
}
