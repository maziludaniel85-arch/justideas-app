import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL sau EXTERNAL_DATABASE_URL trebuie setat.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false },
  },
});
