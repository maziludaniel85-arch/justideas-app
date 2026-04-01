import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, dosareTable, platiTable } from "@workspace/db";
import {
  ListPlatiQueryParams,
  CreatePlataBody,
  GetPlataParams,
  UpdatePlataParams,
  UpdatePlataBody,
} from "@workspace/api-zod";
import { autentificare } from "../middlewares/auth";

const router: IRouter = Router();

function mapPlata(p: typeof platiTable.$inferSelect) {
  return {
    ...p,
    suma: Number(p.suma),
  };
}

router.get("/plati", autentificare, async (req, res): Promise<void> => {
  const parsed = ListPlatiQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Parametri invalizi: " + parsed.error.message });
    return;
  }

  const { status, dosarId } = parsed.data;
  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const conditions = [];
  if (!isAdmin) conditions.push(eq(platiTable.utilizatorId, userId));
  if (status) conditions.push(eq(platiTable.status, status as "in_asteptare" | "platit" | "esuat" | "rambursat"));
  if (dosarId) conditions.push(eq(platiTable.dosarId, dosarId));

  const plati = await db
    .select()
    .from(platiTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(platiTable.creatLa);

  res.json(plati.map(mapPlata));
});

router.post("/plati", autentificare, async (req, res): Promise<void> => {
  const parsed = CreatePlataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [dosar] = await db
    .select()
    .from(dosareTable)
    .where(
      isAdmin
        ? eq(dosareTable.id, parsed.data.dosarId)
        : and(eq(dosareTable.id, parsed.data.dosarId), eq(dosareTable.utilizatorId, userId)),
    );

  if (!dosar) {
    res.status(400).json({ eroare: "Dosarul specificat nu a fost găsit sau nu vă aparține." });
    return;
  }

  const [plata] = await db
    .insert(platiTable)
    .values({
      ...parsed.data,
      utilizatorId: userId,
      suma: String(parsed.data.suma),
      valuta: parsed.data.valuta ?? "RON",
    })
    .returning();

  req.log.info({ plataId: plata.id, dosarId: plata.dosarId }, "Plată înregistrată");
  res.status(201).json(mapPlata(plata));
});

router.get("/plati/:id", autentificare, async (req, res): Promise<void> => {
  const params = GetPlataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [plata] = await db
    .select()
    .from(platiTable)
    .where(
      isAdmin
        ? eq(platiTable.id, params.data.id)
        : and(eq(platiTable.id, params.data.id), eq(platiTable.utilizatorId, userId)),
    );

  if (!plata) {
    res.status(404).json({ eroare: "Plata nu a fost găsită." });
    return;
  }

  res.json(mapPlata(plata));
});

router.patch("/plati/:id", autentificare, async (req, res): Promise<void> => {
  const params = UpdatePlataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const parsed = UpdatePlataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.dataPlata instanceof Date) {
    updateData.dataPlata = updateData.dataPlata;
  }

  const [plata] = await db
    .update(platiTable)
    .set(updateData)
    .where(
      isAdmin
        ? eq(platiTable.id, params.data.id)
        : and(eq(platiTable.id, params.data.id), eq(platiTable.utilizatorId, userId)),
    )
    .returning();

  if (!plata) {
    res.status(404).json({ eroare: "Plata nu a fost găsită sau nu aveți permisiunea de modificare." });
    return;
  }

  res.json(mapPlata(plata));
});

export default router;
