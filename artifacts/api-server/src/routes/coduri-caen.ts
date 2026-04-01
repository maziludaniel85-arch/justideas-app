import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, codurICaenTable } from "@workspace/db";
import { ListCodurICaenQueryParams, GetCodCaenParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/coduri-caen", async (req, res): Promise<void> => {
  const parsed = ListCodurICaenQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ eroare: "Parametri invalizi: " + parsed.error.message });
    return;
  }

  const { cautare, sectiune, pagina: paginaRaw, perPagina: perPaginaRaw } = parsed.data;
  const pagina = paginaRaw ?? 1;
  const perPagina = perPaginaRaw ?? 20;
  const offset = (pagina - 1) * perPagina;

  const conditions = [];
  if (sectiune) conditions.push(eq(codurICaenTable.sectiune, sectiune));
  if (cautare) {
    conditions.push(
      or(
        ilike(codurICaenTable.cod, `%${cautare}%`),
        ilike(codurICaenTable.denumire, `%${cautare}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0
    ? conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
    : undefined;

  const [totalResult, date] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(codurICaenTable)
      .where(whereClause)
      .then((r) => r[0]?.count ?? 0),
    db
      .select()
      .from(codurICaenTable)
      .where(whereClause)
      .orderBy(codurICaenTable.cod)
      .limit(perPagina)
      .offset(offset),
  ]);

  res.json({
    date,
    total: totalResult,
    pagina,
    perPagina,
    totalPagini: Math.ceil(totalResult / perPagina),
  });
});

router.get("/coduri-caen/:cod", async (req, res): Promise<void> => {
  const params = GetCodCaenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ eroare: "Cod CAEN invalid." });
    return;
  }

  const [codCaen] = await db
    .select()
    .from(codurICaenTable)
    .where(eq(codurICaenTable.cod, params.data.cod));

  if (!codCaen) {
    res.status(404).json({ eroare: `Codul CAEN '${params.data.cod}' nu a fost găsit.` });
    return;
  }

  res.json(codCaen);
});

export default router;
