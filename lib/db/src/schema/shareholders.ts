import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const shareholderIdTypeEnum = pgEnum("shareholder_id_type", ["ci", "passport", "company"]);

export const shareholdersTable = pgTable("shareholders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  cnp: text("cnp"),
  idType: shareholderIdTypeEnum("id_type").notNull(),
  idNumber: text("id_number"),
  nationality: text("nationality").notNull(),
  address: text("address"),
  numberOfShares: integer("number_of_shares").notNull(),
  sharePercentage: numeric("share_percentage", { precision: 6, scale: 3 }).notNull(),
  contribution: numeric("contribution", { precision: 15, scale: 2 }).notNull(),
  isLegalEntity: boolean("is_legal_entity").notNull().default(false),
  companyRegistrationNumber: text("company_registration_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShareholderSchema = createInsertSchema(shareholdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShareholder = z.infer<typeof insertShareholderSchema>;
export type Shareholder = typeof shareholdersTable.$inferSelect;
