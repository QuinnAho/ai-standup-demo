# AI Standup Demo

AI-powered async standups and sprint retros, driven by GitHub activity.  
This project connects to a GitHub repository, ingests commits, pull requests, and comments, then uses OpenAI to generate:

- **Daily Standup Summaries** – condensed updates grouped by contributor, including highlights, inferred next steps, and blockers.  
- **Sprint Retrospectives** – end-of-sprint reports highlighting wins, friction points, and suggested improvements.

No meetings required.

---

## Features

- Collects activity from **GitHub commits, PRs, and comments** via webhooks  
- Stores events in **SQLite** for easy local use  
- Generates **daily standup summaries** with OpenAI  
- Generates **retro reports** at the end of a sprint window  
- Posts summaries directly back to GitHub Issues in your repo  

---

## Tech Stack

- **Node.js + TypeScript**  
- **Probot** – GitHub App framework  
- **SQLite (better-sqlite3)** – lightweight local database  
- **OpenAI API** – natural language summaries  
- **Octokit** – post reports to GitHub Issues  

---

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/ai-standup-demo.git
cd ai-standup-demo
npm install
```

### 2. Configure
Copy `.env.example` to `.env` and fill in your GitHub App, OpenAI, and repository details.

### 3. Run the server
```bash
npm run dev
```

### 4. Run jobs manually
```bash
npm run standup:now
npm run retro:now
```
