import dotenv from "dotenv";
dotenv.config();

import { Probot } from "probot";
import Fastify from "fastify";
import { db } from "./db";
import cron from "node-cron";
import { exec } from "child_process";

const fastify = Fastify();
const app = new Probot({
  appId: Number(process.env.APP_ID),
  privateKey: process.env.PRIVATE_KEY!,
  secret: process.env.WEBHOOK_SECRET!,
});

// Ingest helpers
const insertCommit = db.prepare(`
  INSERT OR IGNORE INTO commits (id, repo_owner, repo_name, author_login, ts, message, url)
  VALUES (@id, @repo_owner, @repo_name, @author_login, @ts, @message, @url)
`);

const insertPR = db.prepare(`
  INSERT OR REPLACE INTO pull_requests
  (id, repo_owner, repo_name, author_login, created_at, merged_at, closed_at, additions, deletions, title, url)
  VALUES (@id, @repo_owner, @repo_name, @author_login, @created_at, @merged_at, @closed_at, @additions, @deletions, @title, @url)
`);

const insertComment = db.prepare(`
  INSERT OR IGNORE INTO comments
  (id, repo_owner, repo_name, parent_type, parent_ref, author_login, ts, body, url)
  VALUES (@id, @repo_owner, @repo_name, @parent_type, @parent_ref, @author_login, @ts, @body, @url)
`);

app.webhooks.on("push", async (ctx) => {
  const { repository, commits } = ctx.payload as any;
  const repo_owner = repository.owner.login;
  const repo_name  = repository.name;

  for (const c of commits) {
    insertCommit.run({
      id: c.id,
      repo_owner, repo_name,
      author_login: c.author?.username ?? c.author?.name ?? "unknown",
      ts: c.timestamp,
      message: c.message?.split("\n")[0] ?? "",
      url: c.url
    });
  }
});

app.webhooks.on(["pull_request.opened","pull_request.edited","pull_request.closed","pull_request.synchronize"], async (ctx) => {
  const pr = ctx.payload.pull_request;
  const repo_owner = ctx.payload.repository.owner.login;
  const repo_name  = ctx.payload.repository.name;

  insertPR.run({
    id: pr.number,
    repo_owner, repo_name,
    author_login: pr.user?.login ?? "unknown",
    created_at: pr.created_at,
    merged_at: pr.merged_at,
    closed_at: pr.closed_at,
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    title: pr.title ?? "",
    url: pr.html_url
  });
});

app.webhooks.on(["issue_comment.created","commit_comment.created","pull_request_review.submitted"], async (ctx) => {
  const repo_owner = ctx.payload.repository.owner.login;
  const repo_name  = ctx.payload.repository.name;
  const author_login = (ctx.payload as any).comment?.user?.login
                    ?? (ctx.payload as any).review?.user?.login
                    ?? "unknown";
  const body = (ctx.payload as any).comment?.body
            ?? (ctx.payload as any).review?.body
            ?? "";
  const url = (ctx.payload as any).comment?.html_url
           ?? (ctx.payload as any).review?.html_url
           ?? "";
  const id  = url;
  const ts  = (ctx.payload as any).comment?.created_at
           ?? (ctx.payload as any).review?.submitted_at
           ?? new Date().toISOString();
  const parent_type = "thread";
  const parent_ref  = ((ctx.payload as any).issue?.number ?? (ctx.payload as any).pull_request?.number ?? "").toString();

  insertComment.run({ id, repo_owner, repo_name, parent_type, parent_ref, author_login, ts, body, url });
});

// Expose webhook endpoint via Fastify
fastify.post("/api/github/webhooks", async (req, reply) => {
  await app.webhooks.verifyAndReceive({
    id: req.headers["x-github-delivery"] as string,
    name: req.headers["x-github-event"] as string,
    payload: req.body as any,
    signature: req.headers["x-hub-signature-256"] as string,
  });
  reply.send({ ok: true });
});

fastify.get("/healthz", async () => ({ ok: true }));

const TZ = process.env.TIMEZONE || "America/New_York";
const STANDUP_HOUR = Number(process.env.STANDUP_HOUR || 9);

// Daily standup on weekdays at STANDUP_HOUR local time
cron.schedule(`0 ${STANDUP_HOUR} * * 1-5`, () => {
  exec("npm run standup:now");
}, { timezone: TZ });

// Retro every SPRINT_DAYS at 6pm local
cron.schedule("0 18 */1 * *", () => {
  // naive trigger: only run when today aligns with period boundary (simple check)
  // exec("npm run retro:now");
}, { timezone: TZ });

fastify.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
  console.log("Server on :3000");
});
