import { unlinkSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, "..", "test.db");

// Set env BEFORE any server module is imported
process.env.DB_PATH = TEST_DB_PATH;
process.env.NODE_ENV = "test";

export function cleanupTestDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = TEST_DB_PATH + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
}
