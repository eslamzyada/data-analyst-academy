# Data Analyst Academy

A personal, offline learning app for becoming a data analyst: **Excel, SQL, Power Query,
Power BI and analyst thinking**. It runs on your own computer, in your browser, and keeps your
progress on your computer only.

The goal is not "I completed the academy". It is:

> **I can receive an unfamiliar business problem and independently figure out what to do.**

The app moves a learner from knowing concepts → doing tasks → applying skills → working
independently → handling unfamiliar, ambiguous business problems.

## What it teaches

| | |
|---|---|
| Topics | 72 (Excel 16, SQL 17, Power Query 12, Power BI 14, Analyst Thinking 13) |
| Quiz questions | 1,875, plus generated questions with fresh numbers |
| Practice tasks / challenges | 159 / 60 |
| Projects | 12, judged on ten criteria (data understanding → business reasoning) |
| Flashcards / exams | 155 / 9 |
| Datasets | 21 downloadable datasets (including deliberately messy exports) and 3 SQL practice databases |
| Real Analyst mode | 17 tasks: 8 cross-tool challenges, 7 work requests, 2 mixed assessments |

Answers are checked for real: SQL runs against real SQLite databases, formulas run in a
spreadsheet engine, uploaded Excel files are opened and inspected, and numbers are compared with
answer keys computed from the data.

**The Mastery Layer** judges ability, not activity. Every answer is evidence of one of four
things (*understands*, *can do*, *applies*, *on own*). From that evidence each topic, each of 33
abilities and each skill gets a stage: Introduced → Learning → Practicing → Competent →
Independent → Strong. Difficulty and hints adapt to recent results, and six milestones need
demonstrated, unaided work across several days. They cannot be earned by reading or by
quizzes alone.

What the app can and cannot judge:

- **Checked automatically:** every number, SQL result, formula, tool choice against its rating,
  and whether work was done on the first check without hints.
- **Partly automatic:** written conclusions are read for evidence, uncertainty, overclaiming,
  next steps and reasoning language. That is a heuristic, not an understanding of the text, so
  the learner confirms the rubric and self-ticked qualities count for less.
- **Not visible to the app:** how work was done in Excel, Power Query or Power BI outside the
  app. It judges the stated tool choice, the reasons and the resulting numbers, never the clicks.

## Running it

### For the learner

Double-click **`Start Data Analyst Academy.cmd`**. Your browser opens the app at
http://127.0.0.1:7700; a small minimised window keeps it running. See `README.txt` for the short
version.

### From a release package

Download `data-analyst-academy-<version>.zip` from the GitHub release, unzip it, install
[Node.js](https://nodejs.org), and double-click `Start Data Analyst Academy.cmd`. The package
contains everything needed to run (including its production dependencies) and **no learner
progress**: a new progress file is created on first start.

### From a clone of this repository

Requires Node.js **20.17** (see `app/.nvmrc`; the version CI uses).

```bash
cd app
npm ci           # install exactly what package-lock.json lists
npm run build    # build the browser UI into app/client/dist
npm start        # start on http://127.0.0.1:7700 and open the browser
```

The practice databases, downloadable files and answer keys are committed (`app/data/`), so the
app runs straight after a clone. `npm run build:data` regenerates them.

## Your progress stays on your computer

Progress lives in **`app/data/academy.db`** (a SQLite file). It is **never committed to git and
never pushed to GitHub**: `.gitignore` excludes it, no automated test opens it (every test uses a
throw-away database and the server refuses to start a test run on the real folder), and release
packages are built from an allow-list that leaves it out, which CI checks on planted decoys. To
keep a copy: in the app, **Settings → Download backup**.

## Tests and validation

One command is the safety gate. Run it in `app/` before calling any change done:

```bash
npm test
```

It runs, in order, stopping at the first failure:

| Step | Command | What it proves |
|---|---|---|
| Type check | `npm run typecheck` | the React client type-checks |
| Content validation | `npm run validate` | every reference SQL/formula through the real graders, answer keys, traps, metadata, difficulty bands, duplicates, fairness of "which is worst" questions, method concealment in Real Analyst tasks, that no project step leaks an earlier answer |
| Grading tests | `npm run test:grading` | graders, the four grading outcomes, engine failures never marked wrong |
| Mastery Layer tests | `npm run test:mastery` | evidence, stages, adaptive rules, reasoning rubric, Real Analyst grading, milestones |
| API end-to-end | `npm run smoke` | the whole API on a temp database: quizzes, persistence across restarts and a hard kill, fault injection |
| Reproducibility | `npm run check:repro` | rebuilding all practice data from source gives identical answer keys and files |
| Production build | `npm run build` | the UI builds (and the browser tests below use this build) |
| Browser tests | `npm run test:ui` | headless Edge/Chrome: refresh, restart and leave/return during every kind of activity |

Other commands: `npm run validate:coverage` and `npm run coverage` (content coverage per topic),
`npm run build:data` / `npm run build:extra` (regenerate data), `npm run fixture` (a throw-away
learner to click around with), `node tools/dev-server.js` (the app on port 7701 with a
throw-away progress database), `npm run package` (the release zip).

## How the data works

- **Content** (`app/server/content/`): topics, lessons, questions, tasks, projects and Real Analyst
  tasks as JavaScript modules. Item ids are progress keys and are never reused.
- **Practice data** (`app/tools/data/`): seeded generators build the SQL practice databases and the
  downloadable files, then compute every expected answer *from the published files, the way a
  learner would read them*, cross-checked against the generator. `app/data/answers.json` is
  server-side only; answers never reach the browser before the learner asks.
- **Reproducible:** the same source always gives the same data. `npm run check:repro` rebuilds
  everything into a temporary folder and compares it with `app/data`: any changed answer key is
  reported by name, before and after. CI runs it on every pull request.

## Repository layout

```
Start Data Analyst Academy.cmd   the launcher
app/server/          Express API, progress store, graders, Mastery Layer, content
app/client/          React + Vite UI
app/shared/          vocabulary shared by server and browser (grading outcomes, activity states)
app/tools/           data build, validators, test suites, packaging
app/data/            practice databases, downloadable files, answer keys (+ your local academy.db)
app/seed/            source assets the data build starts from
.github/             CI, release workflow, pull request template
```

## Development

All changes go through a feature branch and a pull request that CI checks and a person reviews
and merges. See [CONTRIBUTING.md](CONTRIBUTING.md). [CLAUDE.md](CLAUDE.md) is the operating
contract for Claude Code sessions working on this repository.
