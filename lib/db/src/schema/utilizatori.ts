import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rolUtilizatorEnum = pgEnum("rol_utilizator", ["client", "admin"]);

export const utilizatoriTable = pgTable("utilizatori", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  parola: text("parola").notNull(),
  nume: text("nume").notNull(),
  prenume: text("prenume").notNull(),
  telefon: text("telefon"),
  rol: rolUtilizatorEnum("rol").notNull().default("client"),
  creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUtilizatorSchema = createInsertSchema(utilizatoriTable).omit({ id: true, creatLa: true, actualizatLa: true });
export type InsertUtilizator = z.infer<typeof insertUtilizatorSchema>;
export type Utilizator = typeof utilizatoriTable.$inferSelect;
