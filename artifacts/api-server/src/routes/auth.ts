import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, utilizatoriTable } from "@workspace/db";
import {
  InregistrareUtilizatorBody,
  AutentificareUtilizatorBody,
  UpdateProfilBody,
} from "@workspace/api-zod";
import { autentificare, semneazaToken } from "../middlewares/auth";

const router: IRouter = Router();

function serializeUtilizator(u: typeof utilizatoriTable.$inferSelect) {
  const { parola: _parola, ...rest } = u;
  return {
    ...rest,
    creatLa: u.creatLa,
    actualizatLa: u.actualizatLa,
  };
}

router.post("/auth/inregistrare", async (req, res): Promise<void> => {
  const parsed = InregistrareUtilizatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const { email, parola, nume, prenume, telefon } = parsed.data;

  const [existent] = await db
    .select()
    .from(utilizatoriTable)
    .where(eq(utilizatoriTable.email, email.toLowerCase()));

  if (existent) {
    res.status(409).json({ eroare: "Adresa de email este deja înregistrată." });
    return;
  }

  const parolaHash = await bcrypt.hash(parola, 12);

  const [utilizator] = await db
    .insert(utilizatoriTable)
    .values({
      email: email.toLowerCase(),
      parola: parolaHash,
      nume,
      prenume,
      telefon: telefon ?? null,
    })
    .returning();

  const token = semneazaToken({
    utilizatorId: utilizator.id,
    email: utilizator.email,
    rol: utilizator.rol,
  });

  req.log.info({ utilizatorId: utilizator.id }, "Utilizator nou înregistrat");
  res.status(201).json({ token, utilizator: serializeUtilizator(utilizator) });
});

router.post("/auth/autentificare", async (req, res): Promise<void> => {
  const parsed = AutentificareUtilizatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const { email, parola } = parsed.data;

  const [utilizator] = await db
    .select()
    .from(utilizatoriTable)
    .where(eq(utilizatoriTable.email, email.toLowerCase()));

  if (!utilizator) {
    res.status(401).json({ eroare: "Email sau parolă incorectă." });
    return;
  }

  const parolaCorecta = await bcrypt.compare(parola, utilizator.parola);
  if (!parolaCorecta) {
    res.status(401).json({ eroare: "Email sau parolă incorectă." });
    return;
  }

  const token = semneazaToken({
    utilizatorId: utilizator.id,
    email: utilizator.email,
    rol: utilizator.rol,
  });

  req.log.info({ utilizatorId: utilizator.id }, "Autentificare reușită");
  res.json({ token, utilizator: serializeUtilizator(utilizator) });
});

router.get("/auth/profil", autentificare, async (req, res): Promise<void> => {
  const [utilizator] = await db
    .select()
    .from(utilizatoriTable)
    .where(eq(utilizatoriTable.id, req.utilizator!.utilizatorId));

  if (!utilizator) {
    res.status(404).json({ eroare: "Utilizatorul nu a fost găsit." });
    return;
  }

  res.json(serializeUtilizator(utilizator));
});

router.patch("/auth/profil", autentificare, async (req, res): Promise<void> => {
  const parsed = UpdateProfilBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const [utilizator] = await db
    .update(utilizatoriTable)
    .set(parsed.data)
    .where(eq(utilizatoriTable.id, req.utilizator!.utilizatorId))
    .returning();

  if (!utilizator) {
    res.status(404).json({ eroare: "Utilizatorul nu a fost găsit." });
    return;
  }

  res.json(serializeUtilizator(utilizator));
});

export default router;
