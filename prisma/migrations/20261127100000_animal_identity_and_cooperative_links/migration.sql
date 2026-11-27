-- Milestone 2C: animal identity and explicit cooperative links.
-- Create-only migration: no existing application tables or rows are rewritten.

CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED', 'TRANSFERRED');
CREATE TYPE "AnimalSex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');
CREATE TYPE "AnimalIdentifierType" AS ENUM ('EAR_TAG', 'RFID', 'NATIONAL_ID', 'PASSPORT_NUMBER', 'INTERNAL_REFERENCE');
CREATE TYPE "AnimalLinkStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "AnimalLinkSource" AS ENUM ('COOPERATIVE_REGISTRATION', 'FARMER_REGISTRATION', 'IMPORTED_RECORD', 'CONSENTED_LINK', 'TRANSFER');

CREATE TABLE "animals" (
  "id" TEXT NOT NULL,
  "species" TEXT NOT NULL,
  "breed" TEXT,
  "sex" "AnimalSex" NOT NULL DEFAULT 'UNKNOWN',
  "name" TEXT,
  "birthDate" TIMESTAMP(3),
  "birthDateEstimated" BOOLEAN NOT NULL DEFAULT false,
  "status" "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "animal_identifiers" (
  "id" TEXT NOT NULL,
  "animalId" TEXT NOT NULL,
  "identifierType" "AnimalIdentifierType" NOT NULL,
  "identifierValue" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "animal_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cooperative_animal_links" (
  "id" TEXT NOT NULL,
  "animalId" TEXT NOT NULL,
  "cooperativeId" TEXT NOT NULL,
  "membershipId" TEXT,
  "status" "AnimalLinkStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" "AnimalLinkSource" NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "linkedByUserId" TEXT NOT NULL,
  "endedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cooperative_animal_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "animals_status_idx" ON "animals"("status");
CREATE INDEX "animals_species_status_idx" ON "animals"("species", "status");
CREATE INDEX "animal_identifiers_identifierType_normalizedValue_idx" ON "animal_identifiers"("identifierType", "normalizedValue");
CREATE INDEX "animal_identifiers_animalId_retiredAt_idx" ON "animal_identifiers"("animalId", "retiredAt");
CREATE UNIQUE INDEX "animal_identifiers_active_unique" ON "animal_identifiers"("identifierType", "normalizedValue") WHERE "retiredAt" IS NULL;
CREATE UNIQUE INDEX "animal_identifiers_one_primary_active" ON "animal_identifiers"("animalId") WHERE "isPrimary" = true AND "retiredAt" IS NULL;
CREATE INDEX "cooperative_animal_links_cooperativeId_status_idx" ON "cooperative_animal_links"("cooperativeId", "status");
CREATE INDEX "cooperative_animal_links_animalId_status_idx" ON "cooperative_animal_links"("animalId", "status");
CREATE INDEX "cooperative_animal_links_membershipId_cooperativeId_idx" ON "cooperative_animal_links"("membershipId", "cooperativeId");
CREATE UNIQUE INDEX "cooperative_animal_links_active_unique" ON "cooperative_animal_links"("animalId", "cooperativeId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "farmer_cooperative_memberships_id_cooperativeId_key" ON "farmer_cooperative_memberships"("id", "cooperativeId");

ALTER TABLE "animals" ADD CONSTRAINT "animals_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "animal_identifiers" ADD CONSTRAINT "animal_identifiers_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "animal_identifiers" ADD CONSTRAINT "animal_identifiers_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cooperative_animal_links" ADD CONSTRAINT "cooperative_animal_links_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cooperative_animal_links" ADD CONSTRAINT "cooperative_animal_links_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cooperative_animal_links" ADD CONSTRAINT "cooperative_animal_links_membership_fkey" FOREIGN KEY ("membershipId", "cooperativeId") REFERENCES "farmer_cooperative_memberships"("id", "cooperativeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cooperative_animal_links" ADD CONSTRAINT "cooperative_animal_links_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cooperative_animal_links" ADD CONSTRAINT "cooperative_animal_links_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "professional_authorization_scopes" DROP CONSTRAINT IF EXISTS "professional_authorization_scope_animal_deferred";
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scopes_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_authorization_scopes" DROP CONSTRAINT IF EXISTS "professional_authorization_scope_shape";
ALTER TABLE "professional_authorization_scopes" ADD CONSTRAINT "professional_authorization_scope_shape" CHECK (
  ("scopeType" = 'COOPERATIVE' AND "farmerId" IS NULL AND "animalId" IS NULL)
  OR ("scopeType" = 'FARMER' AND "farmerId" IS NOT NULL AND "animalId" IS NULL)
  OR ("scopeType" = 'ANIMAL' AND "farmerId" IS NULL AND "animalId" IS NOT NULL)
);

CREATE OR REPLACE FUNCTION validate_animal_identifier_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."animalId", NEW."identifierType", NEW."normalizedValue") IS DISTINCT FROM (OLD."animalId", OLD."identifierType", OLD."normalizedValue") THEN
    RAISE EXCEPTION 'animal identifier identity is immutable; retire and create a new identifier';
  END IF;
  IF NEW."retiredAt" IS NOT NULL AND NEW."retiredAt" < NEW."issuedAt" THEN
    RAISE EXCEPTION 'identifier cannot be retired before it was issued';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER animal_identifier_history_guard BEFORE INSERT OR UPDATE ON "animal_identifiers"
FOR EACH ROW EXECUTE FUNCTION validate_animal_identifier_history();

CREATE OR REPLACE FUNCTION validate_animal_link_history() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'ACTIVE' AND NEW."endedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'active animal links cannot have an end date';
  END IF;
  IF NEW."status" = 'ENDED' AND NEW."endedAt" IS NULL THEN
    RAISE EXCEPTION 'ended animal links require an end date';
  END IF;
  IF NEW."membershipId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "farmer_cooperative_memberships" m WHERE m."id" = NEW."membershipId" AND m."cooperativeId" = NEW."cooperativeId"
  ) THEN
    RAISE EXCEPTION 'animal link membership must belong to the linked cooperative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER animal_link_history_guard BEFORE INSERT OR UPDATE ON "cooperative_animal_links"
FOR EACH ROW EXECUTE FUNCTION validate_animal_link_history();

CREATE OR REPLACE FUNCTION validate_animal_professional_scope() RETURNS trigger AS $$
BEGIN
  IF NEW."scopeType" = 'ANIMAL' AND NOT EXISTS (
    SELECT 1 FROM "cooperative_animal_links" l WHERE l."animalId" = NEW."animalId" AND l."cooperativeId" = NEW."cooperativeId" AND l."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'animal professional scope requires an active cooperative animal link';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER animal_professional_scope_guard BEFORE INSERT OR UPDATE ON "professional_authorization_scopes"
FOR EACH ROW EXECUTE FUNCTION validate_animal_professional_scope();
