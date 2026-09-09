DROP INDEX "patients_uid_emp_id_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "patients_uid_emp_id_unique_idx" ON "patients" USING btree (lower("uid_emp_id"),"created_by");