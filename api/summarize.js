import OpenAI from "openai";
import { pool } from "./db.js";

export const config = { maxDuration: 60 };

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { video_id, transcript, openai_key } = req.body || {};

  /* fast path – avoid re-summarising */
  const { rows } = await pool.query(
    "SELECT short, medium, long FROM summaries WHERE video_id=$1",
    [video_id]
  );
  if (rows.length) return res.json(rows[0]);

  const openai = new OpenAI({ apiKey: openai_key });
  const prompt = `You are a professional summarizer. Given the following video transcript, provide:
- Short summary (1 sentence).
- Medium summary (3-4 sentences).
- Long summary (~150 words).

TRANSCRIPT:
"${transcript}"

Return JSON:
{ "short": "", "medium": "", "long": "" }`;

  const chat = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", temperature: 0.3,
    messages: [{ role: "user", content: prompt }]
  });

  const json = JSON.parse(chat.choices[0].message.content);

  await pool.query(
    `INSERT INTO summaries (video_id, short, medium, long)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (video_id)
     DO UPDATE SET short=EXCLUDED.short,
                   medium=EXCLUDED.medium,
                   long=EXCLUDED.long`,
    [video_id, json.short, json.medium, json.long]
  );

  res.json(json);
};
