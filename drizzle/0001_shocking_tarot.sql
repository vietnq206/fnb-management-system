CREATE TYPE "public"."employee_role" AS ENUM('staff', 'manager', 'admin');--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "role" "employee_role" DEFAULT 'staff' NOT NULL;