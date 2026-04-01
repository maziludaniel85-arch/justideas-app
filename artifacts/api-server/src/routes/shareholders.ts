import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, shareholdersTable } from "@workspace/db";
import {
  AddShareholderBody,
  UpdateShareholderBody,
  ListShareholdersParams,
  AddShareholderParams,
  UpdateShareholderParams,
  RemoveShareholderParams,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

router.get("/", async (req, res): Promise<void> => {
  const params = ListShareholdersParams.safeParse(req.params);
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

  const shareholders = await db
    .select()
    .from(shareholdersTable)
    .where(eq(shareholdersTable.companyId, params.data.id));

  res.json(shareholders.map(mapShareholder));
});

router.post("/", async (req, res): Promise<void> => {
  const params = AddShareholderParams.safeParse(req.params);
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

  const parsed = AddShareholderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [shareholder] = await db
    .insert(shareholdersTable)
    .values({
      ...parsed.data,
      companyId: params.data.id,
      sharePercentage: String(parsed.data.sharePercentage),
      contribution: String(parsed.data.contribution),
    })
    .returning();

  res.status(201).json(mapShareholder(shareholder));
});

router.patch("/:shareholderId", async (req, res): Promise<void> => {
  const params = UpdateShareholderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateShareholderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (typeof updateData.sharePercentage === "number") updateData.sharePercentage = String(updateData.sharePercentage);
  if (typeof updateData.contribution === "number") updateData.contribution = String(updateData.contribution);

  const [shareholder] = await db
    .update(shareholdersTable)
    .set(updateData)
    .where(
      and(
        eq(shareholdersTable.id, params.data.shareholderId),
        eq(shareholdersTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!shareholder) {
    res.status(404).json({ error: "Shareholder not found" });
    return;
  }

  res.json(mapShareholder(shareholder));
});

router.delete("/:shareholderId", async (req, res): Promise<void> => {
  const params = RemoveShareholderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [shareholder] = await db
    .delete(shareholdersTable)
    .where(
      and(
        eq(shareholdersTable.id, params.data.shareholderId),
        eq(shareholdersTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!shareholder) {
    res.status(404).json({ error: "Shareholder not found" });
    return;
  }

  res.sendStatus(204);
});

function mapShareholder(s: typeof shareholdersTable.$inferSelect) {
  return {
    ...s,
    sharePercentage: Number(s.sharePercentage),
    contribution: Number(s.contribution),
  };
}

export default router;
