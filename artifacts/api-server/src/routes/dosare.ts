import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, dosareTable, asociatiTable, platiTable } from "@workspace/db";
import {
  ListDosareQueryParams,
  CreateDosarBody,
  GetDosarParams,
  UpdateDosarParams,
  UpdateDosarBody,
  DeleteDosarParams,
  UpdatePasDosarParams,
  UpdatePasDosarBody,
  TrimiteDosarParams,
} from "@workspace/api-zod";
import { autentificare } from "../middlewares/auth";

const router: IRouter = Router();

function mapDosar(d: typeof dosareTable.$inferSelect) {
  return {
    ...d,
    capitalSocial: d.capitalSocial != null ? Number(d.capitalSocial) : null,
    valoareParte: d.valoareParte != null ? Number(d.valoareParte) : null,
  };
}

router.get("/dosare/statistici", autentificare, async (req, res): Promise<void> => {
  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const baseCondition = isAdmin ? undefined : eq(dosareTable.utilizatorId, userId);

  const [total, peStatus, totalPlati, dosareRecente] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(dosareTable)
      .where(baseCondition)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ status: dosareTable.status, count: sql<number>`count(*)::int` })
      .from(dosareTable)
      .where(baseCondition)
      .groupBy(dosareTable.status),
    db
      .select({ total: sql<number>`coalesce(sum(suma::numeric), 0)::float` })
      .from(platiTable)
      .where(
        isAdmin
          ? eq(platiTable.status, "platit")
          : and(eq(platiTable.utilizatorId, userId), eq(platiTable.status, "platit")),
      )
      .then((r) => r[0]?.total ?? 0),
    db
      .select()
      .from(dosareTable)
      .where(baseCondition)
      .orderBy(desc(dosareTable.actualizatLa))
      .limit(5),
  ]);

  const statusMap: Record<string, number> = {
    ciorna: 0, in_asteptare: 0, in_procesare: 0, aprobat: 0, respins: 0,
  };
  for (const row of peStatus) {
    statusMap[row.status] = row.count;
  }

  res.json({
    total,
    peStatus: statusMap,
    totalPlatiEfectuate: Number(totalPlati),
    dosareRecente: dosareRecente.map(mapDosar),
  });
});

router.get("/dosare", autentificare, async (req, res): Promise<void> => {
  const parsed = ListDosareQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Parametri invalizi: " + parsed.error.message });
    return;
  }

  const { status, cautare } = parsed.data;
  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const conditions = [];
  if (!isAdmin) conditions.push(eq(dosareTable.utilizatorId, userId));
  if (status) conditions.push(eq(dosareTable.status, status as "ciorna" | "in_asteptare" | "in_procesare" | "aprobat" | "respins"));
  if (cautare) conditions.push(ilike(dosareTable.denumireFirma, `%${cautare}%`));

  const dosare = await db
    .select()
    .from(dosareTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(dosareTable.actualizatLa));

  res.json(dosare.map(mapDosar));
});

router.post("/dosare", autentificare, async (req, res): Promise<void> => {
  const parsed = CreateDosarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const [dosar] = await db
    .insert(dosareTable)
    .values({
      ...parsed.data,
      utilizatorId: req.utilizator!.utilizatorId,
      capitalSocial: parsed.data.capitalSocial != null ? String(parsed.data.capitalSocial) : null,
      valoareParte: parsed.data.valoareParte != null ? String(parsed.data.valoareParte) : null,
    })
    .returning();

  req.log.info({ dosarId: dosar.id }, "Dosar nou creat");
  res.status(201).json(mapDosar(dosar));
});

router.get("/dosare/:id", autentificare, async (req, res): Promise<void> => {
  const params = GetDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [dosar] = await db
    .select()
    .from(dosareTable)
    .where(
      isAdmin
        ? eq(dosareTable.id, params.data.id)
        : and(eq(dosareTable.id, params.data.id), eq(dosareTable.utilizatorId, userId)),
    );

  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  const [asociati, plati] = await Promise.all([
    db.select().from(asociatiTable).where(eq(asociatiTable.dosarId, dosar.id)),
    db.select().from(platiTable).where(eq(platiTable.dosarId, dosar.id)),
  ]);

  res.json({
    ...mapDosar(dosar),
    asociati: asociati.map(mapAsociat),
    plati: plati.map(mapPlata),
  });
});

router.patch("/dosare/:id", autentificare, async (req, res): Promise<void> => {
  const params = UpdateDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const parsed = UpdateDosarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof updateData.capitalSocial === "number") updateData.capitalSocial = String(updateData.capitalSocial);
  if (typeof updateData.valoareParte === "number") updateData.valoareParte = String(updateData.valoareParte);

  const [dosar] = await db
    .update(dosareTable)
    .set(updateData)
    .where(
      isAdmin
        ? eq(dosareTable.id, params.data.id)
        : and(eq(dosareTable.id, params.data.id), eq(dosareTable.utilizatorId, userId)),
    )
    .returning();

  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  res.json(mapDosar(dosar));
});

router.delete("/dosare/:id", autentificare, async (req, res): Promise<void> => {
  const params = DeleteDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [dosar] = await db
    .delete(dosareTable)
    .where(
      isAdmin
        ? eq(dosareTable.id, params.data.id)
        : and(eq(dosareTable.id, params.data.id), eq(dosareTable.utilizatorId, userId)),
    )
    .returning();

  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit sau nu aveți permisiunea de ștergere." });
    return;
  }

  res.sendStatus(204);
});

router.patch("/dosare/:id/pas", autentificare, async (req, res): Promise<void> => {
  const params = UpdatePasDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const parsed = UpdatePasDosarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Date invalide: " + parsed.error.message });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [dosar] = await db
    .update(dosareTable)
    .set({ pasCurent: parsed.data.pas })
    .where(
      isAdmin
        ? eq(dosareTable.id, params.data.id)
        : and(eq(dosareTable.id, params.data.id), eq(dosareTable.utilizatorId, userId)),
    )
    .returning();

  if (!dosar) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  res.json(mapDosar(dosar));
});

router.post("/dosare/:id/trimite", autentificare, async (req, res): Promise<void> => {
  const params = TrimiteDosarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "ID invalid." });
    return;
  }

  const userId = req.utilizator!.utilizatorId;
  const isAdmin = req.utilizator!.rol === "admin";

  const [existent] = await db
    .select()
    .from(dosareTable)
    .where(
      isAdmin
        ? eq(dosareTable.id, params.data.id)
        : and(eq(dosareTable.id, params.data.id), eq(dosareTable.utilizatorId, userId)),
    );

  if (!existent) {
    res.status(404).json({ eroare: "Dosarul nu a fost găsit." });
    return;
  }

  if (existent.status !== "ciorna") {
    res.status(400).json({ eroare: `Dosarul cu statusul '${existent.status}' nu poate fi trimis. Doar dosarele în stare ciornă pot fi trimise.` });
    return;
  }

  const [dosar] = await db
    .update(dosareTable)
    .set({ status: "in_asteptare", pasCurent: 6 })
    .where(eq(dosareTable.id, params.data.id))
    .returning();

  req.log.info({ dosarId: dosar.id }, "Dosar trimis pentru procesare");
  res.json(mapDosar(dosar));
});

function mapAsociat(a: typeof asociatiTable.$inferSelect) {
  return {
    ...a,
    procentDetinere: Number(a.procentDetinere),
    aportCapital: Number(a.aportCapital),
  };
}

function mapPlata(p: typeof platiTable.$inferSelect) {
  return {
    ...p,
    suma: Number(p.suma),
  };
}

export default router;
