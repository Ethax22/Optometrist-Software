"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ControlledSelect } from "@/components/form/controlled-select";
import { ControlledCombobox } from "@/components/form/controlled-combobox";
import {
  sphereOptions,
  cylinderOptions,
  axisOptions,
  addOptions,
  distanceVisualAcuityOptions,
  nearVisualAcuityOptions,
  pinholeOptions,
  colorBlindnessOptions,
  colorBlindnessScoreOptions,
  optometristRemarksOptions,
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

/** Fixed values for a patient with no clinical findings, used by "Mark as Normal". */
const NORMAL_DEFAULTS: PrescriptionInput = {
  rightSph: "+0.00",
  rightCyl: "+0.00",
  rightAxis: "0",
  rightAdd: "+0.00",
  leftSph: "+0.00",
  leftCyl: "+0.00",
  leftAxis: "0",
  leftAdd: "+0.00",
  distanceUncorrectedRight: "6/6",
  distanceUncorrectedLeft: "6/6",
  distanceCorrectedRight: "6/6",
  distanceCorrectedLeft: "6/6",
  nearUncorrectedRight: "N6",
  nearUncorrectedLeft: "N6",
  nearCorrectedRight: "N6",
  nearCorrectedLeft: "N6",
  pinholeRight: "6/6",
  pinholeLeft: "6/6",
  colorBlindnessResult: "Normal",
  colorBlindnessRe: "17/17",
  colorBlindnessLe: "17/17",
  optometristRemarks: "Both Eyes: Normal Vision. Review after 6 months or 1 year",
  remarks: "Normal examination. No abnormalities detected.",
};

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
    colorBlindnessRe: (p?.colorBlindnessRe as PrescriptionInput["colorBlindnessRe"]) ?? undefined,
    colorBlindnessLe: (p?.colorBlindnessLe as PrescriptionInput["colorBlindnessLe"]) ?? undefined,
    optometristRemarks: (p?.optometristRemarks as PrescriptionInput["optometristRemarks"]) ?? undefined,
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

  const { control, register, handleSubmit, reset } = useForm<z.input<typeof prescriptionSchema>>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: defaultsFromPrescription(prescription),
  });

  function onMarkNormal() {
    reset(NORMAL_DEFAULTS);
  }

  const busy = savePending || pdfPending;
  const state = pdfState ?? saveState;

  const triggeredForRef = useRef<ActionResult | null>(null);
  // Which button triggered pdfAction -- read by the effect below once the
  // save succeeds, since the server action itself only reports success/
  // failure and doesn't carry the logo choice back with it.
  const [logoChoice, setLogoChoice] = useState<"with" | "without">("with");
  useEffect(() => {
    if (
      pdfState &&
      pdfState !== triggeredForRef.current &&
      "success" in pdfState &&
      pdfState.downloadPdf
    ) {
      triggeredForRef.current = pdfState;
      const logoParam = logoChoice === "without" ? "?logo=false" : "";
      // This is a file download (Content-Disposition: attachment), not a
      // page navigation -- router.push() would try to client-render the
      // response instead of letting the browser download it.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/api/prescriptions/${consultationId}/pdf${logoParam}`;
    }
  }, [pdfState, consultationId, logoChoice]);

  const onSave = handleSubmit((data) => {
    const parsed = prescriptionSchema.parse(data);
    saveAction({ consultationId, ...parsed });
  });

  const onSaveAndGeneratePdfWithLogo = handleSubmit((data) => {
    const parsed = prescriptionSchema.parse(data);
    setLogoChoice("with");
    pdfAction({ consultationId, ...parsed });
  });

  const onSaveAndGeneratePdfNoLogo = handleSubmit((data) => {
    const parsed = prescriptionSchema.parse(data);
    setLogoChoice("without");
    pdfAction({ consultationId, ...parsed });
  });

  return (
    <form className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onMarkNormal}>
          Mark as Normal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refraction</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Right Eye</h3>
            <ControlledCombobox control={control} name="rightSph" label="SPH" options={sphereOptions} />
            <ControlledCombobox control={control} name="rightCyl" label="CYL" options={cylinderOptions} />
            <ControlledCombobox control={control} name="rightAxis" label="AXIS" options={axisOptions} />
            <ControlledCombobox control={control} name="rightAdd" label="ADD" options={addOptions} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Left Eye</h3>
            <ControlledCombobox control={control} name="leftSph" label="SPH" options={sphereOptions} />
            <ControlledCombobox control={control} name="leftCyl" label="CYL" options={cylinderOptions} />
            <ControlledCombobox control={control} name="leftAxis" label="AXIS" options={axisOptions} />
            <ControlledCombobox control={control} name="leftAdd" label="ADD" options={addOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distance Vision</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ControlledCombobox
            control={control}
            name="distanceUncorrectedRight"
            label="Right Eye Uncorrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="distanceUncorrectedLeft"
            label="Left Eye Uncorrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="distanceCorrectedRight"
            label="Right Eye Corrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="distanceCorrectedLeft"
            label="Left Eye Corrected"
            options={distanceVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="pinholeRight"
            label="Pin-Hole Right Eye"
            options={pinholeOptions}
          />
          <ControlledCombobox
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
          <ControlledCombobox
            control={control}
            name="nearUncorrectedRight"
            label="Right Eye Uncorrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="nearUncorrectedLeft"
            label="Left Eye Uncorrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledCombobox
            control={control}
            name="nearCorrectedRight"
            label="Right Eye Corrected"
            options={nearVisualAcuityOptions}
          />
          <ControlledCombobox
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
          <ControlledCombobox
            control={control}
            name="colorBlindnessRe"
            label="RE Result"
            options={colorBlindnessScoreOptions}
          />
          <ControlledCombobox
            control={control}
            name="colorBlindnessLe"
            label="LE Result"
            options={colorBlindnessScoreOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ControlledCombobox
            control={control}
            name="optometristRemarks"
            label="Optometrist Remarks"
            options={optometristRemarksOptions}
            placeholder="Select or type Optometrist Remarks"
          />

          <div className="space-y-1.5">
            <Label htmlFor="remarks">Remarks / Observations / Findings</Label>
            <Textarea id="remarks" rows={4} {...register("remarks")} />
          </div>
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

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={onSave}>
          {savePending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" disabled={busy} onClick={onSaveAndGeneratePdfWithLogo}>
          {pdfPending ? "Saving..." : "Save & Generate PDF (Logo)"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onSaveAndGeneratePdfNoLogo}>
          {pdfPending ? "Saving..." : "Save & Generate PDF (No Logo)"}
        </Button>
      </div>
    </form>
  );
}
