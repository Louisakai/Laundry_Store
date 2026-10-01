import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('Khach@123', 10);
  const user = await prisma.user.update({
    where: { email: 'customer1@gmail.com' },
    data: { passwordHash: hash },
  });
  console.log('Updated password for:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
