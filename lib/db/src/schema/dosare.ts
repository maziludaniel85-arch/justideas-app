import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { utilizatoriTable } from "./utilizatori";

export const statusDosarEnum = pgEnum("status_dosar", ["ciorna", "in_asteptare", "in_procesare", "aprobat", "respins"]);
export const formaJuridicaEnum = pgEnum("forma_juridica", ["SRL", "SA", "SNC", "SCS", "RA", "SRL_D"]);

export const dosareTable = pgTable("dosare", {
  id: serial("id").primaryKey(),
  utilizatorId: integer("utilizator_id").notNull().references(() => utilizatoriTable.id, { onDelete: "cascade" }),
  denumireFirma: text("denumire_firma").notNull(),
  formaJuridica: formaJuridicaEnum("forma_juridica").notNull(),
  judet: text("judet"),
  localitate: text("localitate"),
  adresaSediu: text("adresa_sediu"),
  codPostal: text("cod_postal"),
  codCaenPrincipal: text("cod_caen_principal"),
  descriereActivitate: text("descriere_activitate"),
  capitalSocial: numeric("capital_social", { precision: 15, scale: 2 }),
  numarParti: integer("numar_parti"),
  valoareParte: numeric("valoare_parte", { precision: 15, scale: 2 }),
  pasCurent: integer("pas_curent").notNull().default(1),
  status: statusDosarEnum("status").notNull().default("ciorna"),
  numarInregistrare: text("numar_inregistrare"),
  cui: text("cui"),
  noteMentor: text("note_mentor"),
  creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDosarSchema = createInsertSchema(dosareTable).omit({ id: true, creatLa: true, actualizatLa: true });
export type InsertDosar = z.infer<typeof insertDosarSchema>;
export type Dosar = typeof dosareTable.$inferSelect;
