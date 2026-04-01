import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, directorsTable } from "@workspace/db";
import {
  AddDirectorBody,
  UpdateDirectorBody,
  ListDirectorsParams,
  AddDirectorParams,
  UpdateDirectorParams,
  RemoveDirectorParams,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

function toDateString(d: Date | string | null | undefined): string | null | undefined {
  if (d == null) return d as null | undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

router.get("/", async (req, res): Promise<void> => {
  const params = ListDirectorsParams.safeParse(req.params);
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

  const directors = await db
    .select()
    .from(directorsTable)
    .where(eq(directorsTable.companyId, params.data.id));

  res.json(directors);
});

router.post("/", async (req, res): Promise<void> => {
  const params = AddDirectorParams.safeParse(req.params);
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

  const parsed = AddDirectorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [director] = await db
    .insert(directorsTable)
    .values({
      ...parsed.data,
      companyId: params.data.id,
      mandateStartDate: toDateString(parsed.data.mandateStartDate),
      mandateEndDate: toDateString(parsed.data.mandateEndDate),
    })
    .returning();

  res.status(201).json(director);
});

router.patch("/:directorId", async (req, res): Promise<void> => {
  const params = UpdateDirectorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDirectorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [director] = await db
    .update(directorsTable)
    .set({
      ...parsed.data,
      mandateStartDate: toDateString(parsed.data.mandateStartDate),
      mandateEndDate: toDateString(parsed.data.mandateEndDate),
    })
    .where(
      and(
        eq(directorsTable.id, params.data.directorId),
        eq(directorsTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!director) {
    res.status(404).json({ error: "Director not found" });
    return;
  }

  res.json(director);
});

router.delete("/:directorId", async (req, res): Promise<void> => {
  const params = RemoveDirectorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [director] = await db
    .delete(directorsTable)
    .where(
      and(
        eq(directorsTable.id, params.data.directorId),
        eq(directorsTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!director) {
    res.status(404).json({ error: "Director not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
