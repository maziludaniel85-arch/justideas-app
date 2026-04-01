import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dosareTable } from "./dosare";
import { utilizatoriTable } from "./utilizatori";

export const statusPlataEnum = pgEnum("status_plata", ["in_asteptare", "platit", "esuat", "rambursat"]);
export const metodaPlataEnum = pgEnum("metoda_plata", ["card", "transfer_bancar", "numerar"]);

export const platiTable = pgTable("plati", {
  id: serial("id").primaryKey(),
  dosarId: integer("dosar_id").notNull().references(() => dosareTable.id, { onDelete: "cascade" }),
  utilizatorId: integer("utilizator_id").notNull().references(() => utilizatoriTable.id, { onDelete: "cascade" }),
  suma: numeric("suma", { precision: 12, scale: 2 }).notNull(),
  valuta: text("valuta").notNull().default("RON"),
  status: statusPlataEnum("status").notNull().default("in_asteptare"),
  metodaPlata: metodaPlataEnum("metoda_plata"),
  referintaPlata: text("referinta_plata"),
  descriere: text("descriere"),
  dataPlata: timestamp("data_plata", { withTimezone: true }),
  creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlataSchema = createInsertSchema(platiTable).omit({ id: true, creatLa: true, actualizatLa: true });
export type InsertPlata = z.infer<typeof insertPlataSchema>;
export type Plata = typeof platiTable.$inferSelect;
