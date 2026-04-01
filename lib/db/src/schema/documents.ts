import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const documentTypeEnum = pgEnum("document_type", [
  "act_constitutiv",
  "statut",
  "contract_sediu",
  "dovada_sediu",
  "cazier_fiscal",
  "cazier_judiciar",
  "specimen_semnatura",
  "declaratie_asociat",
  "declaratie_beneficiar",
  "cerere_inregistrare",
  "alte_documente",
]);

export const documentStatusEnum = pgEnum("document_status", ["pending", "uploaded", "approved", "rejected"]);

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  status: documentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
