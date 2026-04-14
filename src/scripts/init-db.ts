import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeDb } from "../lib/db/client";

async function main() {
  try {
    await initializeDb();
    process.exit(0);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

main();
