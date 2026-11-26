-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('FARMER', 'COOPERATIVE', 'ORGANIZATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CooperativeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FarmerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MERGED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMINISTRATOR', 'COOPERATIVE_ADMINISTRATOR', 'FIELD_OFFICER', 'VETERINARIAN', 'FARMER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "farmerId" TEXT,
    "cooperativeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperatives" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "county" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" "CooperativeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooperatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "status" "FarmerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_private_contacts" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "phone" TEXT,
    "alternativePhone" TEXT,
    "address" TEXT,
    "locationNote" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_private_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_cooperative_memberships" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "membershipNumber" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_cooperative_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_user_links" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedByUserId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),

    CONSTRAINT "farmer_user_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "cooperativeId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parties_farmerId_key" ON "parties"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "parties_cooperativeId_key" ON "parties"("cooperativeId");

-- CreateIndex
CREATE INDEX "parties_partyType_status_idx" ON "parties"("partyType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cooperatives_registrationNumber_key" ON "cooperatives"("registrationNumber");

-- CreateIndex
CREATE INDEX "cooperatives_status_idx" ON "cooperatives"("status");

-- CreateIndex
CREATE INDEX "farmers_status_idx" ON "farmers"("status");

-- CreateIndex
CREATE INDEX "farmers_fullName_idx" ON "farmers"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_private_contacts_farmerId_key" ON "farmer_private_contacts"("farmerId");

-- CreateIndex
CREATE INDEX "farmer_cooperative_memberships_cooperativeId_status_idx" ON "farmer_cooperative_memberships"("cooperativeId", "status");

-- CreateIndex
CREATE INDEX "farmer_cooperative_memberships_farmerId_status_idx" ON "farmer_cooperative_memberships"("farmerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_cooperative_memberships_farmerId_cooperativeId_key" ON "farmer_cooperative_memberships"("farmerId", "cooperativeId");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_cooperative_memberships_cooperativeId_membershipNumb_key" ON "farmer_cooperative_memberships"("cooperativeId", "membershipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_user_links_userId_key" ON "farmer_user_links"("userId");

-- CreateIndex
CREATE INDEX "farmer_user_links_farmerId_idx" ON "farmer_user_links"("farmerId");

-- CreateIndex
CREATE INDEX "role_assignments_cooperativeId_role_revokedAt_idx" ON "role_assignments"("cooperativeId", "role", "revokedAt");

-- CreateIndex
CREATE INDEX "role_assignments_userId_revokedAt_idx" ON "role_assignments"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_userId_role_cooperativeId_key" ON "role_assignments"("userId", "role", "cooperativeId");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperatives" ADD CONSTRAINT "cooperatives_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_private_contacts" ADD CONSTRAINT "farmer_private_contacts_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_private_contacts" ADD CONSTRAINT "farmer_private_contacts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_cooperative_memberships" ADD CONSTRAINT "farmer_cooperative_memberships_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_cooperative_memberships" ADD CONSTRAINT "farmer_cooperative_memberships_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_cooperative_memberships" ADD CONSTRAINT "farmer_cooperative_memberships_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_user_links" ADD CONSTRAINT "farmer_user_links_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_user_links" ADD CONSTRAINT "farmer_user_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_user_links" ADD CONSTRAINT "farmer_user_links_linkedByUserId_fkey" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Role scope is enforced in the database as well as in application authorization.
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "role_assignment_cooperative_scope"
  CHECK (
    ("role" IN ('COOPERATIVE_ADMINISTRATOR', 'FIELD_OFFICER') AND "cooperativeId" IS NOT NULL)
    OR
    ("role" IN ('SYSTEM_ADMINISTRATOR', 'VETERINARIAN', 'FARMER') AND "cooperativeId" IS NULL)
  );

-- Party references must agree with the party type. Non-farmer, non-cooperative
-- parties use their own canonical display and registration fields.
ALTER TABLE "parties"
  ADD CONSTRAINT "party_reference_matches_type"
  CHECK (
    ("partyType" = 'FARMER' AND "farmerId" IS NOT NULL AND "cooperativeId" IS NULL)
    OR
    ("partyType" = 'COOPERATIVE' AND "cooperativeId" IS NOT NULL AND "farmerId" IS NULL)
    OR
    ("partyType" IN ('ORGANIZATION', 'INDIVIDUAL') AND "farmerId" IS NULL AND "cooperativeId" IS NULL)
  );

ALTER TABLE "farmer_cooperative_memberships"
  ADD CONSTRAINT "membership_end_after_start"
  CHECK ("endedAt" IS NULL OR "endedAt" >= "joinedAt");
