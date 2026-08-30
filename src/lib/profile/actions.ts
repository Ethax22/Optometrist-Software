"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { optometristProfiles } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import {
  profileSchema,
  ALLOWED_SIGNATURE_MIME_TYPES,
  MAX_SIGNATURE_SIZE_BYTES,
} from "@/lib/validation/profile";
import { saveSignature, deleteSignature } from "@/lib/storage/signatures";
import { makeSignatureTransparent } from "@/lib/storage/signature-image";
import { logAudit } from "@/lib/audit/log";

export type ActionResult = { error: string } | { success: true };

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    qualification: formData.get("qualification"),
    registrationNumber: formData.get("registrationNumber"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    clinicName: formData.get("clinicName"),
    clinicAddress: formData.get("clinicAddress"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .insert(optometristProfiles)
    .values({ userId: appUser.id, ...parsed.data })
    .onConflictDoUpdate({
      target: optometristProfiles.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  await logAudit({
    userId: appUser.id,
    action: "profile_updated",
    entityType: "optometrist_profile",
    entityId: appUser.id,
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function uploadSignatureAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file" };
  }

  if (!ALLOWED_SIGNATURE_MIME_TYPES.includes(file.type as (typeof ALLOWED_SIGNATURE_MIME_TYPES)[number])) {
    return { error: "Signature must be a PNG, JPEG, or WEBP image" };
  }

  if (file.size > MAX_SIGNATURE_SIZE_BYTES) {
    return { error: "Signature image must be under 2MB" };
  }

  const [existing] = await db
    .select({ signatureStoragePath: optometristProfiles.signatureStoragePath })
    .from(optometristProfiles)
    .where(eq(optometristProfiles.userId, appUser.id))
    .limit(1);

  const buffer = Buffer.from(await file.arrayBuffer());

  // Strip the paper background and crop to the ink, so the PDF shows the
  // signature itself rather than a white rectangle.
  let processed;
  try {
    processed = await makeSignatureTransparent(buffer);
  } catch {
    return { error: "That image could not be processed. Try a different file." };
  }

  const storagePath = await saveSignature(appUser.id, processed.data, processed.mimeType);

  // fullName is NOT NULL; fall back to the account email until the
  // optometrist fills in the profile form (a signature can be uploaded
  // before the rest of the profile is completed).
  await db
    .insert(optometristProfiles)
    .values({ userId: appUser.id, fullName: appUser.email, signatureStoragePath: storagePath })
    .onConflictDoUpdate({
      target: optometristProfiles.userId,
      set: { signatureStoragePath: storagePath, updatedAt: new Date() },
    });

  if (existing?.signatureStoragePath) {
    await deleteSignature(existing.signatureStoragePath);
  }

  await logAudit({
    userId: appUser.id,
    action: "signature_uploaded",
    entityType: "optometrist_profile",
    entityId: appUser.id,
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function removeSignatureAction(): Promise<ActionResult> {
  const { appUser } = await requireOptometrist();

  const [existing] = await db
    .select({ signatureStoragePath: optometristProfiles.signatureStoragePath })
    .from(optometristProfiles)
    .where(eq(optometristProfiles.userId, appUser.id))
    .limit(1);

  if (existing?.signatureStoragePath) {
    await deleteSignature(existing.signatureStoragePath);
    await db
      .update(optometristProfiles)
      .set({ signatureStoragePath: null, updatedAt: new Date() })
      .where(eq(optometristProfiles.userId, appUser.id));

    await logAudit({
      userId: appUser.id,
      action: "signature_removed",
      entityType: "optometrist_profile",
      entityId: appUser.id,
    });
  }

  revalidatePath("/profile");
  return { success: true };
}
