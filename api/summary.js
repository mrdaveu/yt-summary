import { pool } from "./db.js";
export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { video_id } = req.body || {};
  const { rows } = await pool.query(
    "SELECT short, medium, long FROM summaries WHERE video_id=$1",
    [video_id]
  );
  res.json(rows[0] || {});
};
