const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The fictional seed is disabled in production.");
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin.demo@livestocktrust.example" },
    update: {},
    create: {
      email: "admin.demo@livestocktrust.example",
      displayName: "Demo System Administrator",
      status: "ACTIVE",
    },
  });

  const cooperative = await prisma.cooperative.upsert({
    where: { registrationNumber: "DEMO-COOP-001" },
    update: {},
    create: {
      name: "Demo Dairy Cooperative",
      registrationNumber: "DEMO-COOP-001",
      county: "Demo County",
      createdByUserId: admin.id,
    },
  });

  const existingFarmer = await prisma.farmer.findFirst({ where: { fullName: "Amina Demo Farmer", status: "ACTIVE" } });
  const farmer = existingFarmer ?? await prisma.farmer.create({
    data: {
      fullName: "Amina Demo Farmer",
      createdByUserId: admin.id,
      privateContact: {
        create: {
          phone: "+254700000001",
          address: "Fictional Demo Area",
          createdByUserId: admin.id,
        },
      },
    },
  });

  await prisma.party.upsert({
    where: { farmerId: farmer.id },
    update: { displayName: farmer.fullName },
    create: {
      partyType: "FARMER",
      displayName: farmer.fullName,
      farmerId: farmer.id,
      createdByUserId: admin.id,
    },
  });

  await prisma.farmerCooperativeMembership.upsert({
    where: { farmerId_cooperativeId: { farmerId: farmer.id, cooperativeId: cooperative.id } },
    update: { status: "ACTIVE" },
    create: {
      farmerId: farmer.id,
      cooperativeId: cooperative.id,
      membershipNumber: "DEMO-MEMBER-001",
      createdByUserId: admin.id,
    },
  });

  const existingRole = await prisma.roleAssignment.findFirst({ where: { userId: admin.id, role: "SYSTEM_ADMINISTRATOR", cooperativeId: null, revokedAt: null } });
  if (!existingRole) {
    await prisma.roleAssignment.create({
      data: {
        userId: admin.id,
        role: "SYSTEM_ADMINISTRATOR",
        createdByUserId: admin.id,
      },
    });
  }

  console.log(`Seeded fictional cooperative ${cooperative.name}.`);
}

main().finally(async () => prisma.$disconnect());
