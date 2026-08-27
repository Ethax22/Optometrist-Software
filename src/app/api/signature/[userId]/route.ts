import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { optometristProfiles } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { readSignature } from "@/lib/storage/signatures";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  // Any active optometrist may view a signature (needed to render another
  // optometrist's signature on a past prescription in shared clinic
  // history) -- this route is never public, just not owner-restricted.
  await requireOptometrist();

  const { userId } = await params;

  const [profile] = await db
    .select({ signatureStoragePath: optometristProfiles.signatureStoragePath })
    .from(optometristProfiles)
    .where(eq(optometristProfiles.userId, userId))
    .limit(1);

  if (!profile?.signatureStoragePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await readSignature(profile.signatureStoragePath);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
