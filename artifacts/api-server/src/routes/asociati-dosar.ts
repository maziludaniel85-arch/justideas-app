import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, dosareTable, asociatiTable } from "@workspace/db";
import {
  ListAsociatiDosarParams,
  AddAsociatDosarParams,
  AddAsociatDosarBody,
  UpdateAsociatDosarParams,
  UpdateAsociatDosarBody,
  RemoveAsociatDosarParams,
} from "@workspace/api-zod";
import { autentificare } from "../middlewares/auth";

const router: IRouter = Router({ mergeParams: true });

function mapAsociat(a: typeof asociatiTable.$inferSelect) {
  return {
    ...a,
    procentDetinere: Number(a.procentDetinere),
    aportCapital: Number(a.aportCapital),
  };
}

async function getDosar(dosarId: number, userId: number, isAdmin: boolean) {
  const [dosar] = await db
    .select()
    .from(dosareTable)
    .where(
      isAdmin
        ? eq(dosareTable.id, dosarId)
        : and(eq(dosareTable.id, dosarId), eq(dosareTable.utilizatorId, userId)),
    );
  return dosar;
}

router.get("/", autentificare, async (req, res): Promise<void> => {
  const params = ListAsociatiDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const dosar = await getDosar(params.data.id, req.utilizator!.utilizatorId, req.utilizator!.rol === "admin");
  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  const asociati = await db
    .select()
    .from(asociatiTable)
    .where(eq(asociatiTable.dosarId, params.data.id));

  res.json(asociati.map(mapAsociat));
});

router.post("/", autentificare, async (req, res): Promise<void> => {
  const params = AddAsociatDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const dosar = await getDosar(params.data.id, req.utilizator!.utilizatorId, req.utilizator!.rol === "admin");
  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  const parsed = AddAsociatDosarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const [asociat] = await db
    .insert(asociatiTable)
    .values({
      ...parsed.data,
      dosarId: params.data.id,
      procentDetinere: String(parsed.data.procentDetinere),
      aportCapital: String(parsed.data.aportCapital),
    })
    .returning();

  res.status(201).json(mapAsociat(asociat));
});

router.patch("/:asociatId", autentificare, async (req, res): Promise<void> => {
  const params = UpdateAsociatDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const dosar = await getDosar(params.data.id, req.utilizator!.utilizatorId, req.utilizator!.rol === "admin");
  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  const parsed = UpdateAsociatDosarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof updateData.procentDetinere === "number") updateData.procentDetinere = String(updateData.procentDetinere);
  if (typeof updateData.aportCapital === "number") updateData.aportCapital = String(updateData.aportCapital);

  const [asociat] = await db
    .update(asociatiTable)
    .set(updateData)
    .where(
      and(
        eq(asociatiTable.id, params.data.asociatId),
        eq(asociatiTable.dosarId, params.data.id),
      ),
    )
    .returning();

  if (!asociat) {
    res.status(404).json({ eroare: "Asociatul nu a fost găsit." });
    return;
  }

  res.json(mapAsociat(asociat));
});

router.delete("/:asociatId", autentificare, async (req, res): Promise<void> => {
  const params = RemoveAsociatDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const dosar = await getDosar(params.data.id, req.utilizator!.utilizatorId, req.utilizator!.rol === "admin");
  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  const [asociat] = await db
    .delete(asociatiTable)
    .where(
      and(
        eq(asociatiTable.id, params.data.asociatId),
        eq(asociatiTable.dosarId, params.data.id),
      ),
    )
    .returning();

  if (!asociat) {
    res.status(404).json({ eroare: "Asociatul nu a fost găsit." });
    return;
  }

  res.sendStatus(204);
});

export default router;
