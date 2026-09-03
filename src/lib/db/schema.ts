import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("optometrist"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("users_role_check", sql`${table.role} in ('optometrist')`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // SHA-256 hash (hex) of the raw session token in the cookie
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(), // SHA-256 hash (hex) of the raw token sent to the user
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("password_reset_tokens_user_id_idx").on(table.userId)],
);

export const optometristProfiles = pgTable("optometrist_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  qualification: text("qualification"),
  registrationNumber: text("registration_number"),
  phone: text("phone"),
  email: text("email"),
  clinicName: text("clinic_name"),
  clinicAddress: text("clinic_address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  signatureStoragePath: text("signature_storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uidEmpId: text("uid_emp_id"),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    gender: text("gender").notNull(),
    mobile: text("mobile"),
    email: text("email"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    check("patients_gender_check", sql`${table.gender} in ('Male', 'Female', 'Other')`),
    check("patients_age_check", sql`${table.age} > 0 and ${table.age} < 150`),
    // Case-insensitive uniqueness -- "UID-001" and "uid-001" must collide,
    // not silently create two separate patient records for the same person.
    uniqueIndex("patients_uid_emp_id_unique_idx").on(sql`lower(${table.uidEmpId})`),
    index("patients_name_idx").on(table.name),
    index("patients_mobile_idx").on(table.mobile),
  ],
);

export const consultations = pgTable(
  "consultations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    optometristId: uuid("optometrist_id")
      .notNull()
      .references(() => users.id),
    consultationDate: date("consultation_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("consultations_patient_id_idx").on(table.patientId),
    index("consultations_consultation_date_idx").on(table.consultationDate),
    index("consultations_optometrist_id_idx").on(table.optometristId),
  ],
);

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id")
    .notNull()
    .unique()
    .references(() => consultations.id, { onDelete: "cascade" }),

  rightSph: numeric("right_sph", { precision: 5, scale: 2 }),
  rightCyl: numeric("right_cyl", { precision: 5, scale: 2 }),
  rightAxis: smallint("right_axis"),
  rightAdd: numeric("right_add", { precision: 4, scale: 2 }),

  leftSph: numeric("left_sph", { precision: 5, scale: 2 }),
  leftCyl: numeric("left_cyl", { precision: 5, scale: 2 }),
  leftAxis: smallint("left_axis"),
  leftAdd: numeric("left_add", { precision: 4, scale: 2 }),

  distanceUncorrectedRight: text("distance_uncorrected_right"),
  distanceUncorrectedLeft: text("distance_uncorrected_left"),
  distanceCorrectedRight: text("distance_corrected_right"),
  distanceCorrectedLeft: text("distance_corrected_left"),

  nearUncorrectedRight: text("near_uncorrected_right"),
  nearUncorrectedLeft: text("near_uncorrected_left"),
  nearCorrectedRight: text("near_corrected_right"),
  nearCorrectedLeft: text("near_corrected_left"),

  pinholeRight: text("pinhole_right"),
  pinholeLeft: text("pinhole_left"),

  colorBlindnessResult: text("color_blindness_result"),

  optometristRemarks: text("optometrist_remarks"),
  remarks: text("remarks"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check(
    "right_axis_range",
    sql`${table.rightAxis} is null or (${table.rightAxis} >= 0 and ${table.rightAxis} <= 180)`,
  ),
  check(
    "left_axis_range",
    sql`${table.leftAxis} is null or (${table.leftAxis} >= 0 and ${table.leftAxis} <= 180)`,
  ),
  check(
    "color_blindness_result_check",
    sql`${table.colorBlindnessResult} is null or ${table.colorBlindnessResult} in ('Normal', 'Abnormal')`,
  ),
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);
