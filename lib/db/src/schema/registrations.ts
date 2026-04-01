import { pgTable, text, serial, timestamp, integer, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const registrationStatusEnum = pgEnum("registration_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  status: registrationStatusEnum("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerNotes: text("reviewer_notes"),
  estimatedCompletionDate: date("estimated_completion_date"),
  referenceNumber: text("reference_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
