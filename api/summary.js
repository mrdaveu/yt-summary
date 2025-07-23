import { pool } from "./db.js";
export default async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") return res.status(405).end();
  const { video_id } = req.body || {};
  const { rows } = await pool.query(
    "SELECT short, medium, long FROM summaries WHERE video_id=$1",
    [video_id]
  );
  res.json(rows[0] || {});
};
