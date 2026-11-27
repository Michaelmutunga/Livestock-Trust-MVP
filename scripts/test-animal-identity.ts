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
  {
    const suffix = Date.now().toString();
    const identifier = await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: `LT-2C-${suffix}`, normalizedValue: `LT-2C-${suffix}`, isPrimary: true, createdByUserId: user.id } });
    await expectReject(prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: `LT-2C-${suffix}`, normalizedValue: `LT-2C-${suffix}`, createdByUserId: user.id } }));
    await expectReject(prisma.animalIdentifier.update({ where: { id: identifier.id }, data: { identifierValue: "rewritten" } }));
    await expectReject(prisma.animalIdentifier.update({ where: { id: identifier.id }, data: { normalizedValue: "rewritten" } }));
    await prisma.animalIdentifier.update({ where: { id: identifier.id }, data: { retiredAt: new Date() } });
    await expectReject(prisma.animalIdentifier.update({ where: { id: identifier.id }, data: { retiredAt: null } }));
    await expectReject(prisma.animalIdentifier.delete({ where: { id: identifier.id } }));
    await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "EAR_TAG", identifierValue: `LT-2C-${suffix}-REPLACEMENT`, normalizedValue: `LT-2C-${suffix}-REPLACEMENT`, isPrimary: true, createdByUserId: user.id } });
    await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "INTERNAL_REFERENCE", identifierValue: `LTI-${suffix}`, normalizedValue: `LTI-${suffix}`, createdByUserId: user.id } }).then(async (internal) => {
      await prisma.animalIdentifier.update({ where: { id: internal.id }, data: { retiredAt: new Date() } });
      await expectReject(prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "INTERNAL_REFERENCE", identifierValue: `LTI-${suffix}`, normalizedValue: `LTI-${suffix}`, createdByUserId: user.id } }));
    });
    const reusedExternal = await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "PASSPORT_NUMBER", identifierValue: `EXT-${suffix}`, normalizedValue: `EXT-${suffix}`, createdByUserId: user.id } });
    await prisma.animalIdentifier.update({ where: { id: reusedExternal.id }, data: { retiredAt: new Date() } });
    await prisma.animalIdentifier.create({ data: { animalId: animal.id, identifierType: "PASSPORT_NUMBER", identifierValue: `EXT-${suffix}`, normalizedValue: `EXT-${suffix}`, createdByUserId: user.id } });

    await prisma.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: cooperative.id, membershipId: membership.cooperativeId === cooperative.id ? membership.id : null, source: "COOPERATIVE_REGISTRATION", linkedByUserId: user.id } });
    await expectReject(prisma.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: otherCooperative.id, membershipId: membership.id, source: "IMPORTED_RECORD", linkedByUserId: user.id } }));
    const link = await prisma.cooperativeAnimalLink.findFirstOrThrow({ where: { animalId: animal.id, cooperativeId: cooperative.id } });
    await expectReject(prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { cooperativeId: otherCooperative.id } }));
    await expectReject(prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { membershipId: null } }));
    await prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { status: "ENDED", endedAt: new Date(), endedByUserId: user.id } });
    await expectReject(prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { status: "ACTIVE", endedAt: null } }));
    await expectReject(prisma.cooperativeAnimalLink.update({ where: { id: link.id }, data: { endedAt: new Date(Date.now() + 60_000) } }));
    await expectReject(prisma.cooperativeAnimalLink.delete({ where: { id: link.id } }));
    const testFarmer = await prisma.farmer.create({ data: { fullName: `M2C1 suspended member ${suffix}`, createdByUserId: user.id } });
    const suspendedMembership = await prisma.farmerCooperativeMembership.create({ data: { farmerId: testFarmer.id, cooperativeId: otherCooperative.id, status: "SUSPENDED", createdByUserId: user.id } });
    await expectReject(prisma.cooperativeAnimalLink.create({ data: { animalId: animal.id, cooperativeId: otherCooperative.id, membershipId: suspendedMembership.id, source: "IMPORTED_RECORD", linkedByUserId: user.id } }));
    assert.equal((await prisma.animal.count({ where: { id: animal.id } })), 1);
    console.log("Animal identity and cooperative-link trigger tests passed. Test records retained as historical records.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
