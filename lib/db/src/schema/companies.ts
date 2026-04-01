import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyStatusEnum = pgEnum("company_status", ["draft", "pending", "registered", "rejected"]);
export const legalFormEnum = pgEnum("legal_form", ["SRL", "SA", "SNC", "SCS", "RA", "SRL_D"]);

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tradeName: text("trade_name"),
  legalForm: legalFormEnum("legal_form").notNull(),
  cui: text("cui"),
  registrationNumber: text("registration_number"),
  registeredAddress: text("registered_address").notNull(),
  county: text("county").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code"),
  caenCode: text("caen_code").notNull(),
  caenDescription: text("caen_description"),
  shareCapital: numeric("share_capital", { precision: 15, scale: 2 }).notNull(),
  numberOfShares: integer("number_of_shares").notNull(),
  shareValue: numeric("share_value", { precision: 15, scale: 2 }).notNull(),
  status: companyStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
