import { pool } from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { video_id } = req.body;
    const { rows } = await pool.query(
      "SELECT short, medium, long FROM summaries WHERE video_id=$1",
      [video_id]
    );
    if (rows.length) res.json(rows[0]);
    else res.json({});
  } catch (e) {
    console.error(e);
    res.status(500).send("DB error");
  }
}
