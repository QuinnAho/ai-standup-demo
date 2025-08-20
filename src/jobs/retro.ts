import { db } from "../db";
<<<<<<< HEAD
import Groq from "groq-sdk";
=======
import { OpenAI } from "openai";
>>>>>>> main
import { Octokit } from "@octokit/rest";

const OWNER = process.env.OWNER!;
const REPO  = process.env.REPO!;
const DAYS  = Number(process.env.SPRINT_DAYS || 14);
<<<<<<< HEAD
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
=======
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
>>>>>>> main
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });

function isoDaysAgo(d:number){ return new Date(Date.now()-d*864e5).toISOString(); }

const qPRStats = db.prepare(`
SELECT
  COUNT(*) as total,
  AVG((julianday(COALESCE(merged_at, closed_at, created_at)) - julianday(created_at))*24) as avg_hours_to_done
FROM pull_requests
WHERE repo_owner=? AND repo_name=? AND created_at >= ?
`);

const qActivity = db.prepare(`
SELECT 'commit' as kind, author_login, ts, message as text, url FROM commits WHERE repo_owner=? AND repo_name=? AND ts >= ?
UNION ALL
SELECT 'pr', author_login, COALESCE(merged_at, created_at) as ts, title, url FROM pull_requests WHERE repo_owner=? AND repo_name=? AND created_at >= ?
UNION ALL
SELECT 'comment', author_login, ts, body, url FROM comments WHERE repo_owner=? AND repo_name=? AND ts >= ?
ORDER BY ts ASC
`);

(async () => {
  const start = isoDaysAgo(DAYS);
  const end   = new Date().toISOString();

  const stats = qPRStats.get(OWNER, REPO, start);
  const activity = qActivity.all(OWNER, REPO, start, OWNER, REPO, start, OWNER, REPO, start);

  const payload = { repo: `${OWNER}/${REPO}`, window: { start, end }, stats, activity_sample: activity.slice(-200) };

  const sys = `You are an engineering retro facilitator.
Create:
1) 5–7 Wins (specific, with links)
2) 5–7 Friction/Opportunities (process-light fixes)
3) Key metrics (short table)
4) 3 small experiments for next sprint (with owner placeholder + success metric)
Use the JSON; be concrete.`;
  const user = JSON.stringify(payload).slice(0, 120_000);

<<<<<<< HEAD
  const resp = await groq.chat.completions.create({
    model: "llama3-70b-8192",
=======
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
>>>>>>> main
    temperature: 0.2,
    messages: [{ role: "system", content: sys }, { role: "user", content: user }]
  });

  const body = resp.choices[0].message?.content ?? "(no output)";
  db.prepare(`INSERT INTO reports (kind, repo_owner, repo_name, window_start, window_end, body_md)
              VALUES ('retro', ?, ?, ?, ?, ?)`)
    .run(OWNER, REPO, start, end, body);

  // Open a Retro issue
  await gh.issues.create({
    owner: OWNER, repo: REPO,
    title: `Retro – ${start.slice(0,10)} to ${end.slice(0,10)}`,
    body
  });

  console.log("Retro posted.");
})();
