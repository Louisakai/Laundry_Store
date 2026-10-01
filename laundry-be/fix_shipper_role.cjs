require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { staffType: 'SHIPPER' },
    select: { id: true, email: true, fullName: true, role: true, staffType: true },
  });

  console.log(JSON.stringify(users, null, 2));

  let fixed = 0;
  for (const u of users) {
    if (u.role !== 'STAFF') {
      console.log(`Updating ${u.email} from role ${u.role} to STAFF`);
      await prisma.user.update({
        where: { id: u.id },
        data: { role: 'STAFF' },
      });
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log('All SHIPPER users already have role STAFF');
  } else {
    console.log(`Fixed ${fixed} user(s)`);
  }

  // Also check WASHER users
  const washers = await prisma.user.findMany({
    where: { staffType: 'WASHER' },
    select: { id: true, email: true, fullName: true, role: true, staffType: true },
  });
  console.log('\nWASHER users:');
  console.log(JSON.stringify(washers, null, 2));
  const washerFixed = [];
  for (const u of washers) {
    if (u.role !== 'STAFF') {
      console.log(`Updating washer ${u.email} from role ${u.role} to STAFF`);
      await prisma.user.update({
        where: { id: u.id },
        data: { role: 'STAFF' },
      });
      washerFixed.push(u.email);
    }
  }
  if (washerFixed.length > 0) {
    console.log(`Fixed ${washerFixed.length} washer(s)`);
  } else {
    console.log('All WASHER users already have role STAFF');
  }
}

main().catch(console.error).finally(() => prisma['\x24disconnect']());
