import { pgTable, text, serial, timestamp, integer, boolean, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const directorIdTypeEnum = pgEnum("director_id_type", ["ci", "passport"]);
export const directorRoleEnum = pgEnum("director_role", ["administrator", "cenzor", "auditor", "asociat_unic"]);

export const directorsTable = pgTable("directors", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  cnp: text("cnp"),
  idType: directorIdTypeEnum("id_type").notNull(),
  idNumber: text("id_number"),
  nationality: text("nationality").notNull(),
  address: text("address"),
  role: directorRoleEnum("role").notNull(),
  mandateDurationYears: integer("mandate_duration_years"),
  mandateStartDate: date("mandate_start_date"),
  mandateEndDate: date("mandate_end_date"),
  isSoleAdministrator: boolean("is_sole_administrator").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDirectorSchema = createInsertSchema(directorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDirector = z.infer<typeof insertDirectorSchema>;
export type Director = typeof directorsTable.$inferSelect;
