// prisma/seed.ts
// Minimal seed: 4 users, one per role. Password: password123 for all.
// Full Phase-1 seed (customers, products, warehouses, etc.) lives elsewhere.
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2ID = 2;
const hashOpts = { algorithm: ARGON2ID, memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

async function hashPassword(password: string): Promise<string> {
  return hash(password, hashOpts);
}

const USERS: Array<{ email: string; name: string; role: Role; approvalLimitPct: number }> = [
  { email: "rep@dealflow.local",      name: "Riley Rep",       role: Role.SALES_REP,     approvalLimitPct: 0 },
  { email: "manager@dealflow.local",  name: "Morgan Manager",  role: Role.SALES_MANAGER, approvalLimitPct: 25 },
  { email: "finance@dealflow.local",  name: "Finley Finance",  role: Role.FINANCE,       approvalLimitPct: 0 },
  { email: "admin@dealflow.local",    name: "Avery Admin",     role: Role.ADMIN,         approvalLimitPct: 100 },
];

async function main() {
  const passwordHash = await hashPassword("password123");

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, approvalLimitPct: u.approvalLimitPct },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        approvalLimitPct: u.approvalLimitPct,
        passwordHash,
      },
    });
    console.log(`  ✓ ${u.email.padEnd(28)} ${u.role}`);
  }

  console.log(`\nSeeded ${USERS.length} users. Password for all: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
