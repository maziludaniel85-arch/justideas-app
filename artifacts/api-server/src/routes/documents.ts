import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, documentsTable } from "@workspace/db";
import {
  AddDocumentBody,
  UpdateDocumentBody,
  ListDocumentsParams,
  AddDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

router.get("/", async (req, res): Promise<void> => {
  const params = ListDocumentsParams.safeParse(req.params);
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

  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.companyId, params.data.id));

  res.json(documents);
});

router.post("/", async (req, res): Promise<void> => {
  const params = AddDocumentParams.safeParse(req.params);
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

  const parsed = AddDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [document] = await db
    .insert(documentsTable)
    .values({
      ...parsed.data,
      companyId: params.data.id,
    })
    .returning();

  res.status(201).json(document);
});

router.patch("/:documentId", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [document] = await db
    .update(documentsTable)
    .set(parsed.data)
    .where(
      and(
        eq(documentsTable.id, params.data.documentId),
        eq(documentsTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(document);
});

router.delete("/:documentId", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [document] = await db
    .delete(documentsTable)
    .where(
      and(
        eq(documentsTable.id, params.data.documentId),
        eq(documentsTable.companyId, params.data.id),
      ),
    )
    .returning();

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
