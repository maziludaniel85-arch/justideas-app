import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, registrationsTable } from "@workspace/db";
import {
  CreateRegistrationBody,
  UpdateRegistrationBody,
  ApproveRegistrationBody,
  RejectRegistrationBody,
  ListRegistrationsQueryParams,
  GetRegistrationParams,
  UpdateRegistrationParams,
  DeleteRegistrationParams,
  SubmitRegistrationParams,
  ApproveRegistrationParams,
  RejectRegistrationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toDateString(d: Date | string | null | undefined): string | null | undefined {
  if (d == null) return d as null | undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

router.get("/registrations", async (req, res): Promise<void> => {
  const parsed = ListRegistrationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, companyId } = parsed.data;

  let query = db
    .select({
      id: registrationsTable.id,
      companyId: registrationsTable.companyId,
      companyName: companiesTable.name,
      status: registrationsTable.status,
      submittedAt: registrationsTable.submittedAt,
      reviewedAt: registrationsTable.reviewedAt,
      reviewerNotes: registrationsTable.reviewerNotes,
      estimatedCompletionDate: registrationsTable.estimatedCompletionDate,
      referenceNumber: registrationsTable.referenceNumber,
      createdAt: registrationsTable.createdAt,
      updatedAt: registrationsTable.updatedAt,
    })
    .from(registrationsTable)
    .leftJoin(companiesTable, eq(registrationsTable.companyId, companiesTable.id))
    .$dynamic();

  if (status) {
    query = query.where(eq(registrationsTable.status, status as "draft" | "submitted" | "under_review" | "approved" | "rejected"));
  }

  if (companyId) {
    query = query.where(eq(registrationsTable.companyId, companyId));
  }

  const registrations = await query;
  res.json(registrations);
});

router.post("/registrations", async (req, res): Promise<void> => {
  const parsed = CreateRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, parsed.data.companyId));

  if (!company) {
    res.status(400).json({ error: "Company not found" });
    return;
  }

  const [registration] = await db
    .insert(registrationsTable)
    .values({
      ...parsed.data,
      estimatedCompletionDate: toDateString(parsed.data.estimatedCompletionDate),
    })
    .returning();

  res.status(201).json({ ...registration, companyName: company.name });
});

router.get("/registrations/:id", async (req, res): Promise<void> => {
  const params = GetRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [registration] = await db
    .select({
      id: registrationsTable.id,
      companyId: registrationsTable.companyId,
      companyName: companiesTable.name,
      status: registrationsTable.status,
      submittedAt: registrationsTable.submittedAt,
      reviewedAt: registrationsTable.reviewedAt,
      reviewerNotes: registrationsTable.reviewerNotes,
      estimatedCompletionDate: registrationsTable.estimatedCompletionDate,
      referenceNumber: registrationsTable.referenceNumber,
      createdAt: registrationsTable.createdAt,
      updatedAt: registrationsTable.updatedAt,
    })
    .from(registrationsTable)
    .leftJoin(companiesTable, eq(registrationsTable.companyId, companiesTable.id))
    .where(eq(registrationsTable.id, params.data.id));

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  res.json(registration);
});

router.patch("/registrations/:id", async (req, res): Promise<void> => {
  const params = UpdateRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [registration] = await db
    .update(registrationsTable)
    .set({
      ...parsed.data,
      estimatedCompletionDate: toDateString(parsed.data.estimatedCompletionDate),
    })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, registration.companyId));

  res.json({ ...registration, companyName: company?.name ?? null });
});

router.delete("/registrations/:id", async (req, res): Promise<void> => {
  const params = DeleteRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [registration] = await db
    .delete(registrationsTable)
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/registrations/:id/submit", async (req, res): Promise<void> => {
  const params = SubmitRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(400).json({ error: `Cannot submit a registration in status '${existing.status}'` });
    return;
  }

  const [registration] = await db
    .update(registrationsTable)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, registration.companyId));

  await db
    .update(companiesTable)
    .set({ status: "pending" })
    .where(and(eq(companiesTable.id, registration.companyId), eq(companiesTable.status, "draft")));

  res.json({ ...registration, companyName: company?.name ?? null });
});

router.post("/registrations/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ApproveRegistrationBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  if (existing.status !== "submitted" && existing.status !== "under_review") {
    res.status(400).json({ error: `Cannot approve a registration in status '${existing.status}'` });
    return;
  }

  const [registration] = await db
    .update(registrationsTable)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewerNotes: body.data.reviewerNotes ?? null,
      referenceNumber: body.data.referenceNumber ?? null,
      estimatedCompletionDate: toDateString(body.data.estimatedCompletionDate),
    })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  await db
    .update(companiesTable)
    .set({ status: "registered" })
    .where(eq(companiesTable.id, registration.companyId));

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, registration.companyId));

  res.json({ ...registration, companyName: company?.name ?? null });
});

router.post("/registrations/:id/reject", async (req, res): Promise<void> => {
  const params = RejectRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RejectRegistrationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  if (existing.status !== "submitted" && existing.status !== "under_review") {
    res.status(400).json({ error: `Cannot reject a registration in status '${existing.status}'` });
    return;
  }

  const [registration] = await db
    .update(registrationsTable)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewerNotes: body.data.reviewerNotes ?? null,
    })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();

  await db
    .update(companiesTable)
    .set({ status: "rejected" })
    .where(eq(companiesTable.id, registration.companyId));

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, registration.companyId));

  res.json({ ...registration, companyName: company?.name ?? null });
});

export default router;
