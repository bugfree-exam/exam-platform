import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/*
 * Prisma сам читает DATABASE_URL, но обращение к env гарантирует,
 * что конфигурация будет проверена до первого запроса к базе.
 */
void env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (env.APP_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}