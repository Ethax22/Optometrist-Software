import { config } from "dotenv";
config({ path: ".env" });

import postgres from "postgres";
import bcrypt from "bcryptjs";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: tsx scripts/seed-optometrist.ts <email> <password>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(connectionString, { max: 1 });
  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await sql`select id from users where email = ${email.toLowerCase()}`;

  if (existing) {
    await sql`update users set password_hash = ${passwordHash}, is_active = true where id = ${existing.id}`;
    console.log(`Updated existing optometrist: ${email}`);
  } else {
    await sql`
      insert into users (email, password_hash, role, is_active)
      values (${email.toLowerCase()}, ${passwordHash}, 'optometrist', true)
    `;
    console.log(`Created optometrist: ${email}`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
