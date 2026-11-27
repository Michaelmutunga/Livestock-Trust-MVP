import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function expectReject(action: Promise<unknown>) {
  await assert.rejects(action);
}

async function main() {
  const user = await prisma.user.findFirstOrThrow({ where: { status: "ACTIVE" } });
  const membership = await prisma.farmerCooperativeMembership.findFirstOrThrow();
  const cooperative = await prisma.cooperative.findUniqueOrThrow({ where: { id: membership.cooperativeId } });
  const otherCooperative = await prisma.cooperative.findFirstOrThrow({ where: { NOT: { id: cooperative.id } } });

  const animal = await prisma.animal.create({ data: { species: "CATTLE", breed: "Ayrshire", sex: "FEMALE", name: "Malaika", createdByUserId: user.id } });
  try {
    const identifier = await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: "LT-2C-001", normalizedValue: "LT-2C-001", isPrimary: true, createdByUserId: user.id } });
    await expectReject(prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: "LT-2C-001", normalizedValue: "LT-2C-001", createdByUserId: user.id } }));
    await prisma.animalIdentifier.update({ where: { id: identifier.id }, data: { retiredAt: new Date() } });
    await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: "LT-2C-001-REPLACEMENT", normalizedValue: "LT-2C-001-REPLACEMENT", isPrimary: true, createdByUserId: user.id } });

    await prisma.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: cooperative.id, membershipId: membership.cooperativeId === cooperative.id ? membership.id : null, source: "COOPERATIVE_REGISTRATION", linkedByUserId: user.id } });
    await expectReject(prisma.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: otherCooperative.id, membershipId: membership.id, source: "IMPORTED_RECORD", linkedByUserId: user.id } }));
    const link = await prisma.cooperativeAnimalLink.findFirstOrThrow({ where: { animalId: animal.id, cooperativeId: cooperative.id } });
    await prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { status: "ENDED", endedAt: new Date(), endedByUserId: user.id } });
    assert.equal((await prisma.animal.count({ where: { id: animal.id } })), 1);
    console.log("Animal identity and cooperative-link integrity tests passed.");
  } finally {
    await prisma.animalIdentifier.deleteMany({ where: { animalId: animal.id } });
    await prisma.cooperativeAnimalLink.deleteMany({ where: { animalId: animal.id } });
    await prisma.animal.delete({ where: { id: animal.id } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
