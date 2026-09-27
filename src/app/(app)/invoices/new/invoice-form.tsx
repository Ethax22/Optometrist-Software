"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import { createInvoiceAction, type ActionResult } from "@/lib/invoices/actions";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_ITEM = { itemName: "", description: "", quantity: "1", unit: "Nos", rate: "" };

const DEFAULT_VALUES: z.input<typeof invoiceSchema> = {
  invoiceNumber: "",
  invoiceDate: todayIsoDate(),
  paymentTerms: undefined,
  billToName: "",
  billToAddress: undefined,
  shipToName: undefined,
  shipToAddress: undefined,
  placeOfSupply: undefined,
  otherReference: undefined,
  subject: undefined,
  items: [EMPTY_ITEM],
};

export function InvoiceForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, InvoiceInput>(
    createInvoiceAction,
    null,
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  const triggeredForRef = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (state && state !== triggeredForRef.current && "success" in state) {
      triggeredForRef.current = state;
      // This is a file download (Content-Disposition: attachment), not a
      // page navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/api/invoices/${state.invoiceId}/pdf`;
    }
  }, [state]);

  const total = (items ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity);
    const rate = Number(item?.rate);
    return sum + (Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : 0);
  }, 0);

  return (
    <form className="space-y-6" onSubmit={handleSubmit((data) => formAction(data as InvoiceInput))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">
            Invoice Number<span className="text-destructive"> *</span>
          </Label>
          <Input id="invoiceNumber" {...register("invoiceNumber")} />
          {errors.invoiceNumber && (
            <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">
            Invoice Date<span className="text-destructive"> *</span>
          </Label>
          <Input id="invoiceDate" type="date" {...register("invoiceDate")} />
          {errors.invoiceDate && (
            <p className="text-sm text-destructive">{errors.invoiceDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input id="paymentTerms" {...register("paymentTerms")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otherReference">Authorized Reference</Label>
          <Input id="otherReference" {...register("otherReference")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placeOfSupply">Place Of Supply</Label>
          <Input id="placeOfSupply" {...register("placeOfSupply")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" {...register("subject")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billToName">
            Bill To Name<span className="text-destructive"> *</span>
          </Label>
          <Input id="billToName" {...register("billToName")} />
          {errors.billToName && (
            <p className="text-sm text-destructive">{errors.billToName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipToName">Ship To Name</Label>
          <Input id="shipToName" placeholder="Same as Bill To" {...register("shipToName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billToAddress">Bill To Address</Label>
          <Textarea id="billToAddress" rows={2} {...register("billToAddress")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shipToAddress">Ship To Address</Label>
          <Textarea
            id="shipToAddress"
            rows={2}
            placeholder="Same as Bill To"
            {...register("shipToAddress")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(EMPTY_ITEM)}
          >
            Add Item
          </Button>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-[10rem_1fr_repeat(3,7rem)_auto]"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.itemName`}>Item</Label>
              <Input
                id={`items.${index}.itemName`}
                {...register(`items.${index}.itemName` as const)}
              />
              {errors.items?.[index]?.itemName && (
                <p className="text-sm text-destructive">
                  {errors.items[index]?.itemName?.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.description`}>Description</Label>
              <Textarea
                id={`items.${index}.description`}
                rows={2}
                {...register(`items.${index}.description` as const)}
              />
              {errors.items?.[index]?.description && (
                <p className="text-sm text-destructive">
                  {errors.items[index]?.description?.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.quantity`}>Qty</Label>
              <Input id={`items.${index}.quantity`} {...register(`items.${index}.quantity` as const)} />
              {errors.items?.[index]?.quantity && (
                <p className="text-sm text-destructive">{errors.items[index]?.quantity?.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.unit`}>Unit</Label>
              <Input id={`items.${index}.unit`} {...register(`items.${index}.unit` as const)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.rate`}>Rate</Label>
              <Input id={`items.${index}.rate`} {...register(`items.${index}.rate` as const)} />
              {errors.items?.[index]?.rate && (
                <p className="text-sm text-destructive">{errors.items[index]?.rate?.message}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}

        <p className="text-right text-sm font-medium">Total: {total.toFixed(2)}</p>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create & Download Invoice"}
      </Button>
    </form>
  );
}
