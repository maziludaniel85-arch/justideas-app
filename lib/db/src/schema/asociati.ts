import { pgTable, text, serial, timestamp, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dosareTable } from "./dosare";

export const tipActIdentitateEnum = pgEnum("tip_act_identitate", ["ci", "pasaport", "alta"]);

export const asociatiTable = pgTable("asociati", {
  id: serial("id").primaryKey(),
  dosarId: integer("dosar_id").notNull().references(() => dosareTable.id, { onDelete: "cascade" }),
  numeComplet: text("nume_complet").notNull(),
  cnp: text("cnp"),
  tipActIdentitate: tipActIdentitateEnum("tip_act_identitate").notNull(),
  serieNumarActIdentitate: text("serie_numar_act_identitate"),
  nationalitate: text("nationalitate").notNull(),
  adresa: text("adresa"),
  numarParti: integer("numar_parti").notNull(),
  procentDetinere: numeric("procent_detinere", { precision: 6, scale: 3 }).notNull(),
  aportCapital: numeric("aport_capital", { precision: 15, scale: 2 }).notNull(),
  estePersoanaJuridica: boolean("este_persoana_juridica").notNull().default(false),
  cuiPersoanaJuridica: text("cui_persoana_juridica"),
  creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAsociatSchema = createInsertSchema(asociatiTable).omit({ id: true, creatLa: true, actualizatLa: true });
export type InsertAsociat = z.infer<typeof insertAsociatSchema>;
export type Asociat = typeof asociatiTable.$inferSelect;
