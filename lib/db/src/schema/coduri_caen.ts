import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const codurICaenTable = pgTable("coduri_caen", {
  cod: text("cod").primaryKey(),
  denumire: text("denumire").notNull(),
  sectiune: text("sectiune").notNull(),
  diviziune: text("diviziune"),
  grupa: text("grupa"),
  clasa: text("clasa"),
});

export const insertCodCaenSchema = createInsertSchema(codurICaenTable);
export type InsertCodCaen = z.infer<typeof insertCodCaenSchema>;
export type CodCaen = typeof codurICaenTable.$inferSelect;
