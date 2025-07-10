import { Pool } from "pg";
export const pool = new Pool({
  connectionString: process.env.PG_CONN,
  ssl: { rejectUnauthorized: false }
});
