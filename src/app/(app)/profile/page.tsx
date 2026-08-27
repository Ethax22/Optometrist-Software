import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { optometristProfiles } from "@/lib/db/schema";
import { requireOptometrist } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";
import { SignatureUploader } from "./signature-uploader";

export default async function ProfilePage() {
  const { appUser } = await requireOptometrist();

  const [profile] = await db
    .select()
    .from(optometristProfiles)
    .where(eq(optometristProfiles.userId, appUser.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">
          Your details and signature appear on every prescription you generate.
        </p>
      </div>

      <ProfileForm profile={profile ?? null} />

      <SignatureUploader
        userId={appUser.id}
        hasSignature={Boolean(profile?.signatureStoragePath)}
      />
    </div>
  );
}
