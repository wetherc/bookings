import { createClient } from "@libsql/client";
import { createTablesSql } from "./schema";

export function getDbClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  return createClient({
    url: url,
    authToken: authToken,
  });
}

export async function initializeDb() {
  const db = getDbClient();
  console.log("Initializing database schema...");
  try {
    const statements = createTablesSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await db.execute(statement);
    }
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    // For some environments, client might need to be explicitly closed.
    // However, for Vercel Serverless Functions, connections are often managed
    // per invocation and implicitly closed.
  }
}
