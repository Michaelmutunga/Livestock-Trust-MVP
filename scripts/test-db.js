const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString();
  const admin = await prisma.user.create({ data: { email: `test-${suffix}@example.test`, displayName: "Test Admin", status: "ACTIVE" } });
  const cooperativeA = await prisma.cooperative.create({ data: { name: `Test Cooperative A ${suffix}`, createdByUserId: admin.id } });
  const cooperativeB = await prisma.cooperative.create({ data: { name: `Test Cooperative B ${suffix}`, createdByUserId: admin.id } });
  const farmer = await prisma.farmer.create({ data: { fullName: `Test Farmer ${suffix}`, createdByUserId: admin.id } });

  await prisma.farmerCooperativeMembership.create({ data: { farmerId: farmer.id, cooperativeId: cooperativeA.id, createdByUserId: admin.id } });
  await prisma.farmerCooperativeMembership.create({ data: { farmerId: farmer.id, cooperativeId: cooperativeB.id, createdByUserId: admin.id } });

  await assert.rejects(
    prisma.farmerCooperativeMembership.create({ data: { farmerId: farmer.id, cooperativeId: cooperativeA.id, createdByUserId: admin.id } }),
    /Unique constraint failed/,
  );

  await assert.rejects(
    prisma.roleAssignment.create({ data: { userId: admin.id, role: "COOPERATIVE_ADMINISTRATOR", createdByUserId: admin.id } }),
    /role_assignment_cooperative_scope|check constraint|violates check constraint/i,
  );

  const scopedRole = await prisma.roleAssignment.create({ data: { userId: admin.id, role: "COOPERATIVE_ADMINISTRATOR", cooperativeId: cooperativeA.id, createdByUserId: admin.id } });
  assert.equal(scopedRole.cooperativeId, cooperativeA.id);
  assert.notEqual(scopedRole.cooperativeId, cooperativeB.id);

  await prisma.roleAssignment.delete({ where: { id: scopedRole.id } });
  await prisma.farmerCooperativeMembership.deleteMany({ where: { farmerId: farmer.id } });
  await prisma.farmer.delete({ where: { id: farmer.id } });
  await prisma.cooperative.deleteMany({ where: { id: { in: [cooperativeA.id, cooperativeB.id] } } });
  await prisma.user.delete({ where: { id: admin.id } });
  console.log("Membership uniqueness and cooperative role scoping tests passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
