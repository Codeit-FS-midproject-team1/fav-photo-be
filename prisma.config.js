import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

try {
  process.loadEnvFile();
} catch {
  // .env 가 없으면 이미 설정된 환경 변수를 그대로 사용
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: { connection: process.env.DATABASE_URL },
  }),
});
