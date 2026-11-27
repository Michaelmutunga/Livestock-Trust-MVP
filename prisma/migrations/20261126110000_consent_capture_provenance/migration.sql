-- Preserve existing consent records while adding explicit capture provenance.
ALTER TABLE "farmer_consents"
  ADD COLUMN "captureNotes" TEXT,
  ADD COLUMN "capturedByUserId" TEXT;

UPDATE "farmer_consents"
SET "captureNotes" = 'Legacy record migrated; original capture notes were not stored.',
    "capturedByUserId" = "createdByUserId"
WHERE "captureNotes" IS NULL OR "capturedByUserId" IS NULL;

ALTER TABLE "farmer_consents"
  ALTER COLUMN "captureNotes" SET NOT NULL,
  ALTER COLUMN "capturedByUserId" SET NOT NULL;

ALTER TABLE "farmer_consents"
  ADD CONSTRAINT "farmer_consents_captureNotes_nonempty"
  CHECK (length(btrim("captureNotes")) > 0);

ALTER TABLE "farmer_consents"
  ADD CONSTRAINT "farmer_consents_capturedByUserId_fkey"
  FOREIGN KEY ("capturedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consent_revisions"
  ADD COLUMN "captureNotes" TEXT,
  ADD COLUMN "capturedByUserId" TEXT;

UPDATE "consent_revisions"
SET "captureNotes" = 'Legacy revision migrated; original capture notes were not stored.',
    "capturedByUserId" = "createdByUserId"
WHERE "captureNotes" IS NULL OR "capturedByUserId" IS NULL;

ALTER TABLE "consent_revisions"
  ALTER COLUMN "captureNotes" SET NOT NULL,
  ALTER COLUMN "capturedByUserId" SET NOT NULL;

ALTER TABLE "consent_revisions"
  ADD CONSTRAINT "consent_revisions_captureNotes_nonempty"
  CHECK (length(btrim("captureNotes")) > 0);

ALTER TABLE "consent_revisions"
  ADD CONSTRAINT "consent_revisions_capturedByUserId_fkey"
  FOREIGN KEY ("capturedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
