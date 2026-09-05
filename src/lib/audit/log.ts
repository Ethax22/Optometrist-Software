import "server-only";

import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

/**
 * Actions in use across the app. Keep this list authoritative -- don't
 * invent a new ad-hoc string at a call site, add it here first so the
 * audit trail stays a fixed, reviewable vocabulary.
 */
export type AuditAction =
  | "login"
  | "logout"
  | "password_reset_requested"
  | "password_reset_completed"
  | "profile_updated"
  | "signature_uploaded"
  | "signature_removed"
  | "patient_registered"
  | "patient_deleted"
  | "consultation_created"
  | "consultation_deleted"
  | "prescription_saved"
  | "prescription_pdf_downloaded"
  | "prescriptions_csv_exported"
  | "prescriptions_bulk_pdf_downloaded";

export type AuditEntityType =
  | "user"
  | "optometrist_profile"
  | "patient"
  | "consultation"
  | "prescription";

/**
 * Records an audit event. Never throws -- a logging failure must not break
 * the actual operation it's describing. Metadata must never carry clinical
 * values, names, or other patient-identifying content: only opaque IDs and
 * structural facts (e.g. "which fields changed", not their values).
 */
export async function logAudit(params: {
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log", { action: params.action, err });
  }
}
