import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { db, companiesTable, shareholdersTable, directorsTable, documentsTable } from "@workspace/db";
import {
  CreateCompanyBody,
  UpdateCompanyBody,
  ListCompaniesQueryParams,
  GetCompanyParams,
  UpdateCompanyParams,
  DeleteCompanyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/companies/stats", async (req, res): Promise<void> => {
  const [total, byStatus, byLegalForm, recentlyRegistered] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(companiesTable).then((r) => r[0]?.count ?? 0),
    db
      .select({ status: companiesTable.status, count: sql<number>`count(*)::int` })
      .from(companiesTable)
      .groupBy(companiesTable.status),
    db
      .select({ legalForm: companiesTable.legalForm, count: sql<number>`count(*)::int` })
      .from(companiesTable)
      .groupBy(companiesTable.legalForm),
    db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.status, "registered"))
      .orderBy(desc(companiesTable.updatedAt))
      .limit(5),
  ]);

  const statusMap: Record<string, number> = { draft: 0, pending: 0, registered: 0, rejected: 0 };
  for (const row of byStatus) {
    statusMap[row.status] = row.count;
  }

  res.json({
    total,
    byStatus: statusMap,
    byLegalForm: byLegalForm.map((r) => ({ legalForm: r.legalForm, count: r.count })),
    recentlyRegistered: recentlyRegistered.map(mapCompany),
  });
});

router.get("/companies", async (req, res): Promise<void> => {
  const parsed = ListCompaniesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, search } = parsed.data;

  let query = db.select().from(companiesTable).$dynamic();

  if (status) {
    query = query.where(eq(companiesTable.status, status as "draft" | "pending" | "registered" | "rejected"));
  }

  if (search) {
    query = query.where(
      or(
        ilike(companiesTable.name, `%${search}%`),
        ilike(companiesTable.cui, `%${search}%`),
        ilike(companiesTable.registrationNumber, `%${search}%`),
      ),
    );
  }

  const companies = await query.orderBy(desc(companiesTable.createdAt));
  res.json(companies.map(mapCompany));
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .insert(companiesTable)
    .values({
      ...parsed.data,
      shareCapital: String(parsed.data.shareCapital),
      shareValue: String(parsed.data.shareValue),
    })
    .returning();

  res.status(201).json(mapCompany(company));
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id));

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [shareholders, directors, documents] = await Promise.all([
    db.select().from(shareholdersTable).where(eq(shareholdersTable.companyId, company.id)),
    db.select().from(directorsTable).where(eq(directorsTable.companyId, company.id)),
    db.select().from(documentsTable).where(eq(documentsTable.companyId, company.id)),
  ]);

  res.json({
    ...mapCompany(company),
    shareholders: shareholders.map(mapShareholder),
    directors: directors.map(mapDirector),
    documents: documents.map(mapDocument),
  });
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof updateData.shareCapital === "number") updateData.shareCapital = String(updateData.shareCapital);
  if (typeof updateData.shareValue === "number") updateData.shareValue = String(updateData.shareValue);

  const [company] = await db
    .update(companiesTable)
    .set(updateData)
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json(mapCompany(company));
});

router.delete("/companies/:id", async (req, res): Promise<void> => {
  const params = DeleteCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db
    .delete(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.sendStatus(204);
});

function mapCompany(c: typeof companiesTable.$inferSelect) {
  return {
    ...c,
    shareCapital: Number(c.shareCapital),
    shareValue: Number(c.shareValue),
  };
}

function mapShareholder(s: typeof shareholdersTable.$inferSelect) {
  return {
    ...s,
    sharePercentage: Number(s.sharePercentage),
    contribution: Number(s.contribution),
  };
}

function mapDirector(d: typeof directorsTable.$inferSelect) {
  return d;
}

function mapDocument(doc: typeof documentsTable.$inferSelect) {
  return doc;
}

export default router;
