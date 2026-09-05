"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * A destructive action gated behind an explicit confirm step. `action` is a
 * server action (already bound to whatever id it needs to delete) -- this
 * component only owns the open/close state and the confirm/cancel UI, the
 * actual delete + redirect happens server-side via the form submission.
 */
export function ConfirmDeleteDialog({
  action,
  title,
  description,
  triggerLabel,
  confirmLabel = "Delete",
  triggerVariant = "destructive",
  triggerSize = "sm",
}: {
  action: () => Promise<void>;
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel?: string;
  triggerVariant?: "destructive" | "outline" | "ghost";
  triggerSize?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={action}>
            <Button type="submit" variant="destructive">
              {confirmLabel}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
