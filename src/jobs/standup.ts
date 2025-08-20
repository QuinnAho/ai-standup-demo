import { db } from "../db";
<<<<<<< HEAD
import Groq from "groq-sdk";
=======
import { OpenAI } from "openai";
>>>>>>> main
import { Octokit } from "@octokit/rest";

const OWNER = process.env.OWNER!;
const REPO  = process.env.REPO!;
<<<<<<< HEAD
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
=======
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
>>>>>>> main

function since(hours: number) {
  return new Date(Date.now() - hours*3600*1000).toISOString();
}

const qCommits = db.prepare(`
  SELECT * FROM commits
  WHERE repo_owner=? AND repo_name=? AND ts >= ?
  ORDER BY ts ASC
`);
const qPRs = db.prepare(`
  SELECT * FROM pull_requests
  WHERE repo_owner=? AND repo_name=? AND (created_at >= ? OR merged_at >= ? OR closed_at >= ?)
  ORDER BY COALESCE(merged_at, created_at) ASC
`);
const qComments = db.prepare(`
  SELECT * FROM comments
  WHERE repo_owner=? AND repo_name=? AND ts >= ?
  ORDER BY ts ASC
`);

(async () => {
  const start = since(24);
  const commits = qCommits.all(OWNER, REPO, start);
  const prs     = qPRs.all(OWNER, REPO, start, start, start);
  const comments= qComments.all(OWNER, REPO, start);

  const payload = { repo: `${OWNER}/${REPO}`, window: { start, end: new Date().toISOString() }, commits, prs, comments };

  const sys = `You are an engineering standup assistant. Produce a concise standup for the last 24h of GitHub activity.
- Group by person (Yesterday, Today (inferred), ⚠️ Blockers).
- Finish with 2–3 team themes.
Keep it under 250 words. Include helpful links.`;
  const user = JSON.stringify(payload).slice(0, 120_000); // safety cap

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
              VALUES ('standup', ?, ?, ?, ?, ?)`)
    .run(OWNER, REPO, payload.window.start, payload.window.end, body);

  // Post to GitHub Issue “Daily Standup”
  const gh = new Octokit({ auth: process.env.GITHUB_TOKEN }); // create a PAT with repo:scope or use App auth if you prefer
  // Find or create the issue
  const { data: issues } = await gh.issues.listForRepo({ owner: OWNER, repo: REPO, state: "open" });
  const existing = issues.find(i => i.title === "Daily Standup");
  if (!existing) {
    await gh.issues.create({ owner: OWNER, repo: REPO, title: "Daily Standup", body: `Automated standups.\n\n---\n${body}` });
  } else {
    await gh.issues.createComment({ owner: OWNER, repo: REPO, issue_number: existing.number, body: body });
  }

  console.log("Standup posted.");
})();
