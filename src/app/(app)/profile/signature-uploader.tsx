"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  uploadSignatureAction,
  removeSignatureAction,
  type ActionResult,
} from "@/lib/profile/actions";

export function SignatureUploader({
  userId,
  hasSignature,
}: {
  userId: string;
  hasSignature: boolean;
}) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState<
    ActionResult | null,
    FormData
  >(uploadSignatureAction, null);
  const [, removeFormAction, removePending] = useActionState<ActionResult | null, FormData>(
    () => removeSignatureAction(),
    null,
  );
  const [cacheBust, setCacheBust] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSignature ? (
          <img
            key={cacheBust}
            src={`/api/signature/${userId}?v=${cacheBust}`}
            alt="Your signature"
            className="h-24 w-auto max-w-xs rounded border bg-white p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No signature uploaded yet.</p>
        )}

        <form
          ref={formRef}
          action={(formData) => {
            uploadFormAction(formData);
            setCacheBust((v) => v + 1);
            setSelectedFileName(null);
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            name="signature"
            accept="image/png,image/jpeg,image/webp"
            required
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFileName(file.name);
                formRef.current?.requestSubmit();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPending}
          >
            {selectedFileName ?? "Choose Image"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPending}
          >
            {uploadPending ? "Uploading..." : hasSignature ? "Replace" : "Upload"}
          </Button>
        </form>

        {hasSignature && (
          <form action={removeFormAction}>
            <Button type="submit" variant="outline" size="sm" disabled={removePending}>
              {removePending ? "Removing..." : "Remove"}
            </Button>
          </form>
        )}

        {uploadState && "error" in uploadState && (
          <p className="text-sm text-destructive" role="alert">
            {uploadState.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
