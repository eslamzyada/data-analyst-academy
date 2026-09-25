# Data Analyst Academy: maintenance notes

A local, offline learning app for the user (Excel, SQL, Power Query, Power BI, analyst thinking).
The user is a learner, not a developer: they only use the app. Never ask them to edit files.
North star: **"I can receive an unfamiliar business problem and independently figure out what to do."**
Every feature must improve understanding, practical skill, application, independence, reasoning,
business thinking, tool choice or retention. Never add content only to raise a count.

## The development contract (mandatory, every session)

Claude Code develops. Git records. CI verifies. Pull requests document. **The owner reviews,
approves and merges on GitHub.** CD packages. The learner's progress stays local. Never bypass or
silently weaken any of these, and never drop one safety layer because another exists.

- Repository: https://github.com/eslamzyada/data-analyst-academy (private). `main` is the stable app.
- **Never commit to, push to, or force-push `main`. Never merge a pull request** (not by `gh pr merge`,
  the API, auto-merge or any other route), even after approval, unless the owner explicitly says
  "merge it" for that PR. Never create release tags unless asked. Never skip hooks (`--no-verify`).
- GitHub Free cannot protect `main` on a private repository (branch protection and rulesets answer
  HTTP 403 "Upgrade to GitHub Pro…"). What protects it instead: `.githooks/` (enabled with
  `core.hooksPath`), the `main-guard` CI job, `.claude/settings.json` deny rules, and this contract.
  Claude pushes with the owner's own account, so GitHub itself cannot tell Claude from the owner:
  obeying this contract is the gate. See CONTRIBUTING.md for turning on server-side protection.

### Where things live
| Folder | What it is | Rules |
|---|---|---|
| `C:\Users\MS\Downloads\Data-Analysis-Mastery` | **The learner's installed copy.** The desktop launcher runs it; holds the real `app/data/academy.db`. A git checkout that stays on `main`. | Never develop, commit, run mutations or switch branches here. It only fast-forwards to `origin/main` when the owner asks for an update (below). |
| `C:\Users\MS\Downloads\Data-Analysis-Mastery-dev` | **The development worktree** (`git worktree` of the same repository). | All feature branches and all edits happen here. Has its own `node_modules` and no real progress. |
| `C:\Users\MS\Downloads\Data-Analysis-Mastery-backups` | Backups of progress and source, outside every working tree. | Never inside the repository. Never delete a backup without the owner asking. |

### For every requested change
1. **Understand** what is asked, which system owns the behaviour, which files are relevant, which
   tests already cover it and which new regression test is needed. Keep the change small.
2. **Inspect** the current state (read the code, run the relevant suite if in doubt).
3. **Back up** when the change can touch persistence, schema, progress or data generation: copy
   `academy.db` from the learner's copy into `..\Data-Analysis-Mastery-backups\<date>-<topic>\` and
   record its SHA-256 (`sha256sum`). For large refactors also copy the source there.
4. **Branch** in the dev worktree: `git fetch origin && git switch -c claude/<topic> origin/main`.
5. **Implement.** For bugs fix the root cause: never suppress an error, catch-all, return fake
   success, skip the failing path or loosen a test. Learner failure and system failure stay distinct
   (`CORRECT`, `INCORRECT`, `EVALUATION_ERROR`, `NOT_EVALUABLE`).
6. **Test** in the dev worktree's `app/`: `npm test` (the whole gate; see Commands). Add or update
   a test that fails without the change; for important protections, break the protection on
   purpose (in the dev worktree or a scratch copy, never the learner's copy) and show the suite
   catches it. Test every layer the change touches:
   - UI: typecheck + build + browser tests (+ a look through `node tools/dev-server.js` on 7701).
   - Grading: `test:grading` + `smoke` + browser where relevant.
   - Persistence: save tests + restart/refresh (`smoke`, `test:ui`) + real-data integrity.
   - Quiz: quiz tests + persistence + browser + `validate`.
   - Content: `validate` + `test:grading` + `check:repro` (review every changed answer key).
   - Schema/store: restart + API + end-to-end + persistence.
7. **Verify real data untouched**: the learner copy's `app/data/academy.db` SHA-256 equals the one
   recorded before the work. If it changed unexpectedly: STOP, investigate, do not commit or push.
8. **Update documentation** (this file, README.md) when behaviour, commands or structure change.
9. **Commit** (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`, `refactor:` + what and why).
10. **Push the feature branch** and **open a pull request** into `main` with the template filled in:
    Summary, Why, Technical changes, Tests (exact commands), Results (pass/fail counts), Regression
    coverage, Risks, Data safety. Give the owner the PR URL, report the CI status, and **stop**.
- **Review comments**: continue on the same branch and PR (new commits, rerun tests, update the PR
  description), then wait again. Never open a replacement PR unless necessary. An approval does not
  carry over to new commits: tell the owner what changed since they looked.
- **Never game the tests.** Change a test only when it is demonstrably wrong, and say why in the PR.
- **UX standard** for user-facing work: clear current state, one clear next action, no dead ends, no
  lost work, no duplicate messages, correct completion state and feedback, sensible empty/error
  states. The original problems (missing Completed action, unclear continuation, challenge result not
  shown, quiz repetition, progress lost on refresh) stay covered by browser tests.

### Updating the learner's copy (only when the owner asks, after they merged)
1. Check the app is not running (`netstat -ano | grep ":7700 "`); if it is, ask the owner to close it.
2. Record the SHA-256 of `app/data/academy.db` and copy it to the backups folder.
3. In the learner's copy: `git status --porcelain` must be empty and the branch `main`; then
   `git fetch origin && git merge --ff-only origin/main`.
4. In its `app/`: `npm ci` (if `package-lock.json` changed), then `npm run build`.
5. Confirm `academy.db` is byte-identical to the backup (the app has not run yet). Tell the learner,
   in plain words, what is new. The app adds new tables itself on next start.

### Test isolation (never negotiable)
- Every automated test uses a throw-away progress folder (`os.tmpdir()`), its own port (smoke 7799,
  browser 7798, package check 7797, dev server 7701) and a temporary browser profile. **Never port
  7700, never the learner's `academy.db`, never the learner's copy.** Servers started by tools set
  `ACADEMY_REQUIRE_TEST_DATA=1`, and `server/safety.js` refuses to open the real data folder then.
- Scratch copies go in the session scratchpad, never inside the repository. A copy that links
  `node_modules` or `data` with a junction must have each junction removed with `cmd /c rmdir <link>`
  **before** the copy is deleted (a recursive delete can follow a junction into the real folder).
- Mutation experiments happen in the dev worktree or a scratch copy, and every mutated file is
  restored and checked with `git status`/`git diff` afterwards.

### CI/CD
- `.github/workflows/ci.yml` (pull requests into main, pushes to main): **`test`** (npm ci, typecheck,
  validate, test:grading, test:mastery, smoke, check:repro) → **`browser`** (build + test:ui on pinned
  Chrome) and **`build`** (production build + `npm run package` with planted private decoys that must
  stay out); **`main-guard`** on pushes to main. Node version from `app/.nvmrc` (20.17.0).
- `.github/workflows/cd.yml`: after CI passes on main, package and upload the zip as a build artifact
  (14 days). On a `v*.*.*` tag: run the whole CI on that commit, require the tag to be on main and to
  equal `app/package.json`'s version, package, publish a GitHub release with the zip and SHA-256.
- Never add a check whose only purpose is to be green. Never disable content validation to pass CI.

## Layout
- `Start Data Analyst Academy.cmd`: the launcher (desktop shortcut points here). It runs `node app/server/index.js --open` on http://127.0.0.1:7700.
- `app/server/`: Express API. `store.js` is the progress DB (sql.js, `app/data/academy.db`, **the user's real progress: never delete, overwrite or commit it**). `engine.js` holds mastery, reviews, levels, focus and quiz selection. `workstate.js` holds saved work in progress. `quizsessions.js` holds quiz attempts. `activity.js` turns stored evidence into activity states and "next step" links. `grading/` holds the graders for SQL, formulas (HyperFormula), Excel uploads (ExcelJS) and written answers (checklist + self-check).
- `app/shared/lifecycle.js`: the one vocabulary shared by server and browser: grading outcomes (`CORRECT`, `INCORRECT`, `EVALUATION_ERROR`, `NOT_EVALUABLE`) and activity states (`not-started`, `in-progress`, `submitted`, `evaluated`, `completed`) with the rules that derive them. Change states here only.
- `app/server/content/*.js`: training content (topics with lesson, tryIt, practice, quiz, challenge and cards; plus placement, exams, datasets and databases). Projects are in `projects.js` + `projects-extra.js` + `projects-extra2.js`; `projects-evaluation.js` adds three steps to every project (the data, the approach, checking the numbers) and tags every step with the criteria it shows.
- **The Mastery Layer** (see its own section below): `server/mastery.js` (stages from evidence), `server/adaptive.js` (what comes next), `server/milestones.js`, `server/analyst.js` (Real Analyst mode), `server/grading/analyst.js` and `server/grading/reasoning.js` (graders with more than one good answer), `content/competencies.js`, `content/criteria.js`, `content/analyst.js`.
- `app/server/content/topics/*.js`: topics added after the first version, merged in by `withExtraTopics` (it inserts each one `after` a named topic and keeps the path order). Everything in there is **strict**: every quality check in `validate-content.js` is an error, not a warning.
- `app/server/content/bank/`: extra quiz questions (one file per skill tier) and extra practice tasks (`practice.js`). Each entry names its `topic`; the loader attaches it. Add new questions here, not in the topic files. `bank/index.js` holds two lists: the original banks, and `STRICT_QUIZ`/`STRICT_PRACTICE`/`STRICT_CHALLENGES` (the newer `*-quiz-*.js` files), which are marked `strict` so every check is an error. New banks go in the strict list and must set `kind` explicitly.
- `app/server/content/schema.js`: the question bank's metadata (id, skill, level, topic, difficulty, format, kind, question, answer, explanation, tags, dataset, business_context, skills_tested). Every item is described by `metaOf(item)`; a question may set `kind`, `tags`, `business_context`, `skills_tested` itself, otherwise they are worked out. Kinds: concept, tool-selection, formula-writing, sql-writing, debugging, scenario, interpretation, calculation, sequence, analysis.
- `app/server/content/generated.js`: questions with fresh numbers. The id `g.<generator>.<seed>` rebuilds the exact question and answer, so nothing is stored. `getItem(id)` resolves both stored and generated ids; use it instead of `content.items[id]`.
- Item ids are progress keys: never renumber or reuse them.
- `app/data/practice/*.db`: SQL practice DBs (SQLite). `app/data/files/`: downloadable datasets. `app/data/answers.json`: expected answers, including every project step (server-side only). All three are **committed** and rebuilt by `npm run build:data` (seeded, deterministic: the same source gives identical answer keys, CSVs and databases; zip/xlsx files differ only in their internal timestamps). `npm run check:repro` proves it. `app/seed/` holds the reused Cedarline assets (the build's inputs).
- `app/tools/data/`: the generators and the answer modules. `extra.js` wires them up: `EXTRA_FILE_BUILDERS` builds the newer downloadable files (`pq-extra.js`, `excel-extra.js`, `assess-extra.js`), then `EXTRA_ANSWER_SOURCES` computes their expected answers (`answers-pq.js`, `answers-excel.js`, `answers-pbi.js`, `answers-think.js`, `answers-analyst.js`). An answer module **reads the published file the way the learner would** and then calls `agree()` against the generator, so a file and its answer can never drift apart. `clearTop(map, {lowest, what, minLead})` refuses to produce a "which one is worst" answer when the top two are too close to be fair; a build that throws there means the question, not the data, needs changing.
- `app/client/`: React + Vite UI, built to `app/client/dist` (not committed; served by the server). `client/src/saved.tsx` is the auto-save hook and the "Saving… / Saved ✓" indicator. `components/ItemRunner.tsx` runs every exercise and shows the end of it (Completed / Next / Review / Try again, or "Move on for now"). `components/QuizSession.tsx` runs a quiz attempt and its result and review screens.
- Not in git: `app/data/academy.db` (progress), `app/client/dist`, `node_modules`, `app/reports/` (reports written for the learner describe their progress; coverage output is regenerated), `old-version/` (the previous Markdown system, a local archive with personal progress notes), `graphify-out/`, `release/`.

## Commands (run in `app/`)
- `npm test`: **the gate**, in order: typecheck, validate, test:grading, test:mastery, smoke, check:repro, build, test:ui. **Run it before calling any change done.** (About 3 minutes.)
- `npm run typecheck`: type-checks the client (`tsc --noEmit -p client/tsconfig.json`; Vite does not).
- `npm run test:mastery`: the Mastery Layer on a temp progress DB: stages and the four kinds of evidence, adaptive rules, the reasoning rubric, Real Analyst grading and ordering, assessments, milestones. Every rule it states was checked by breaking it on purpose (13 of 13 caught); when you add a rule, add a test that fails without it.
- `npm run build:data`: regenerate practice DBs, files and answers.json in `app/data` (then run `check:repro` again: it must pass, and every changed answer key must be intended and reviewed).
- `npm run check:repro`: rebuilds all data into a temp folder (`ACADEMY_BUILD_DATA`) and compares it with `app/data`: bytes for CSV/DB/JSON, contents for zip/xlsx (nested too). Lists every added/removed/changed answer key with before and after. Proven to catch a changed seed, a hand-edited key, a stale file, a missing DB and a changed file inside a zip.
- `npm run validate`: runs every reference SQL/formula through the real graders, checks traps (a trap query whose result equals the answer is useless and is reported), files, answer keys, metadata of every question, broken text encoding, and numbers quoted in formula explanations. It also self-grades every `numbers`/`file` question with its own expected answer, rejects a tolerance wide enough to accept 1.25x the truth, and checks that no project step gives away the answer to an earlier step (every step is on one page). `npm run validate:coverage` also prints quiz coverage per topic (kinds, difficulty). **Must pass after any content change.**
- `npm run coverage`: the per-skill table (topics, lessons, quiz, practice, challenges, projects) and the list of topics below target, written to `reports/content-coverage.md`. Targets: a small topic needs 20+ quiz questions, a normal one 25-40, a core one 40-60.
- `npm run build:extra`: rebuilds only the newer generated files (faster than `build:data` while writing content); `npm run fixture` makes a throw-away progress DB to click around in.
- `npm run test:grading`: graders, lifecycle rules, question weighting, save-on-exit (no server). Forces "no AST with such key" and other engine failures and checks they are never INCORRECT.
- `npm run smoke`: end-to-end API test on a temp progress DB (port 7799): quiz attempts, completion and next steps, grading with the calculator broken on purpose (`ACADEMY_TEST_FAULTS=1` enables `/api/test/faults`), restarts and a hard kill.
- `npm run test:ui`: drives headless Edge/Chrome on a temp progress DB (port 7798): refresh, leave/return and restart during tasks, quizzes, quick practice, SQL Lab, projects, lessons and the placement check. Needs Node 20's `--experimental-websocket` (the script passes it). `ACADEMY_TEST_BROWSER` picks the browser (CI: pinned Chrome).
- `npm run build`: build the UI (`npm test` does it before the browser tests, so they never test a stale build).
- `npm run package`: the release zip in `../release/` from an allow-list (launcher, server, shared, built client, practice data, production dependencies). Refuses to ship anything private (proven on a planted `academy.db` first), then starts the app from the unzipped package on port 7797. Same commit → same zip.
- Visual testing: `node tools/dev-server.js` uses a temp progress DB on port 7701. Never test in the browser against port 7700: that writes into the user's real progress.
- Two smoke checks are drawn at random and fail by chance roughly once in fifteen runs ("mixed review leans on the topics with open mistakes" and the fault-injection grading pair). Re-run before investigating.
- Browser tests that refresh right after an action must let the background save land first (`waitSaved` or a short sleep): a refresh can otherwise ask for the saved state before the old page's save arrives.
- Never add a field to an existing API payload under a name the page already uses (a new `mastery` object once replaced the topic percent and blanked the page). Check the client for the name first.
- Shell notes (Windows): heredocs and `node -e` have eaten backslashes and backticks in patches here; write patch scripts to a file and assert their match counts. The PowerShell tool refuses a command that mixes `robocopy` flags with `Remove-Item`; split it.

## The Mastery Layer
Completion is not mastery. The existing percent (`engine.topicMastery`) still exists and still drives unlocking, reviews and the old levels; the Mastery Layer sits beside it and is what the pages show as the learner's standing.
- **Four kinds of evidence** (`mastery.dimensionOf`): knowledge (concept, sequence, calculation questions), skill (writing formulas/queries, debugging, hands-on tasks), application (scenario and interpretation questions, tool choice in a business situation, challenges, project steps, Real Analyst work), independence (an open task, meaning challenge, project step or Real Analyst part, right on the **first** check with **no** hints). A task solved with hints above 1, or after the answer was shown, is never counted as solved.
- **Six stages** per topic, per ability and per skill: Introduced → Learning → Practicing → Competent → Independent → Strong. Knowledge shown → Practicing; + skill → Competent; + application + independence → Independent; Strong also needs two open tasks alone, success on 3+ days spanning a week, recent answers ≥ 80% and no open mistakes. What the content cannot test is "not applicable", except independence, which is never assumed (the validator insists every ability has an open task). A skill's stage is the highest one 60% of its abilities reach. Every stage below Strong lists what would move it up, in plain language.
- **Abilities** (`content/competencies.js`): 33, each owning a set of concepts; every concept belongs to exactly one. Add a concept → add it to an ability.
- **Adaptive** (`adaptive.js`, used by `drawQuiz`/`questionWeight` and `pickPractice`): three right with ≤1 hint → step up (harder, more application); two of the last three wrong → step back (simpler, ideas first, full help); ideas and syntax shown but business use weak → apply mode (scenario questions). Guidance: two guided tasks solved with ≤1 hint → hints open after the first check; with none → after the second. "Open hints anyway" always works; the help endpoint never refuses.
- **Real Analyst** (`/analyst`): cross-tool challenges, work requests (Level 1 clear brief, 2 partial, 3 vague: no objective given), mixed assessments on data the learner has not used (due after 40 checked answers in 2+ skills, then weekly after 30 more). Parts open one at a time; choice parts are final once checked; once a later part is checked, earlier ones are final. A finding is filed under the tool the learner said they used (`byTool`). Answers come from `tools/data/answers-analyst.js` (new data: `tools/data/assess-extra.js`). The validator refuses a request that names a tool or technique, a Level 3 request with an objective, and tool ratings that disagree with their verdicts. Never turn it into a step-by-step tutorial.
- **Reasoning rubric** (`grading/reasoning.js`): uses evidence, answers the question, recognises uncertainty, avoids unsupported conclusions, identifies next steps, shows reasoning. Detected qualities count 1, ones only the learner ticked 0.6, ticking over a flagged claim 0.3. Used by Real Analyst conclusions and project reports (report = 60% key points + 40% reasoning once the learner confirms the rubric). It is a keyword/number heuristic plus learner confirmation: never present it as understanding the text.
- **Ten criteria** (`content/criteria.js`) for projects and Real Analyst work: data understanding, data quality, tool choice, cleaning, transformation, analysis, validation, insight quality, communication, business reasoning. Numbers are checked by result only, so any valid route gets full marks.
- **What the app cannot see**: how work was done in Excel, Power Query or Power BI. It judges the stated tool choice, the reasons and the resulting numbers. Never claim otherwise.
- **Milestones** (`milestones.js`, table `milestones`): Excel Analyst, SQL Analyst, Data Transformation Analyst, BI Beginner, Business Analyst Thinking, Integrated Data Analyst. Requirements are stages, first-check unaided work, days and (for Integrated) Real Analyst results and project criteria. Awarded once and never taken away. The pages show milestones instead of the old levels (`/api/*.level` is kept for compatibility).
- New tables `analyst_work` and `milestones` are created on start (`CREATE TABLE IF NOT EXISTS`), so an existing progress file gains them without losing anything. New saved-work kind: `analyst:<task id>`.
- Performance: the evidence is computed once per change to progress (about 0.25 s on 10,000 answers) and cached.

## Rules
- Progress must stay honest: mastery only from graded evidence. Placement-only credit is capped at 30%; quiz-only at 60%; above 85% needs a passed challenge, exam or project step. A project's score averages every step; skipped steps count as 0.
- A grader failure is never a wrong answer. Every result carries `outcome`; only `CORRECT` and `INCORRECT` are recorded (`afterGrade` / `isRecordable`). `EVALUATION_ERROR` (the app failed) and `NOT_EVALUABLE` (cannot be auto-checked) record nothing, leave quiz and exam scores, and tell the learner their work is saved.
- Formula grading: never use HyperFormula operations that read its AST cache (copy/paste/cut, move rows/columns, undo/redo, named expressions); that cache was the source of "There is no AST with such key in the cache" (reversed ranges like `B4:B2` are stored under a rewritten key). Fill-down translates references itself (`translateFormula`), ranges are put in order first (`orderRanges`), every evaluation uses a new engine, a failure is retried once on a fresh engine, then the model answer is matched as text, else `EVALUATION_ERROR`. Only successful reference results are cached (in memory).
- SQL grading: a missing practice DB or a failing model query is a `fault` → `EVALUATION_ERROR`. Queries run one at a time; each one's time limit starts when it starts, so a runaway query never blames the next. Reference results are cached per practice-DB file version.
- SQL Lab and SQL tasks: the learner never has to reverse-engineer a database. `/api/sql/dbs` gives each database its status (`ready`/`unavailable`), dialect (`SQLite 3.x`), a starter query with a sentence explaining it, and per table its columns, types and `links` (declared foreign keys, else shared `*_id` columns). A query that does not run always answers **200** `{ ok: false, error, help }`; `server/sqlhelp.js` turns the engine message into `help` (kinds: empty, several, unknown-database, unavailable, timeout, db-prefix, other-dialect, unknown-table, unknown-column, ambiguous-column, aggregate-in-where, incomplete, syntax), with the real tables/columns, the closest name and an example. Binary (BLOB) values leave the worker as `{ binary, bytes }` labels: a raw Uint8Array once blanked the whole app.
- Every page sits inside its own `ErrorBoundary` (App.tsx, keyed by path): a page that fails shows "Something went wrong on this page", the menu keeps working, and moving to another page resets it. Test switches (only with `ACADEMY_TEST_FAULTS=1`): `/api/test/sql-faults` (every practice DB unavailable) and `/api/test/break-api` (one GET path answers nonsense).
- Saving: every request writes changed progress to disk before the reply, so anything shown as done survives a kill. Work in progress lives in `work_state` under `item:<id>`, `quiz:<quizKey>` (page position and unchecked answers), `quiz:exam:<id>` (answers, then the result), `project:<id>`, `session:place`, `session:quick`, `session:sqllab`, `session:placement`. Nothing is kept only in the browser.
- Quizzes are server-side attempts (`quiz_sessions`, keys `topic:<id>`, `review`, `today:<date>`): `/api/quiz-sessions/open` resumes or starts one, answers are submitted with `session`, a checked answer is final (only an unchecked one may be sent again), `finish` fixes the score (unanswered = not right, unchecked = left out), a finished attempt stays shown until "Try another quiz", and `/review` rebuilds it. A quiz is completed at 60%+ and stays completed.
- Question selection (`drawQuiz`) is weighted, not uniform: missed before ×4, new ×3, due for review ×1.5, known ×0.35, weak concept ×2, shown in the last 36 hours ×0.06 (week ×0.5), difficulty far from mastery ×0.6; kinds are capped per quiz, the previous attempt's questions are left out when the bank allows, and every pick stores its reason.
- Next steps come from the server (`activity.nextAfter`, `/api/next`): forward through the topic (lesson, practice, challenge, quiz), then the next topic; a failed quiz points to open practice first. Pages must always show one clear way forward after an activity.
- Answers never go to the browser before the learner asks (`clientItem` strips them).
- SQL dialect is SQLite 3.49 (dates are 'YYYY-MM-DD' text; FULL/RIGHT JOIN work); lessons show SQL Server/PostgreSQL equivalents.
- HyperFormula lacks LET/TAKE/SORTBY/CHOOSECOLS/VSTACK etc. (see `UNSUPPORTED` in grading/formula.js); teach those through Excel-file tasks.
- Content files must stay UTF-8. Edit them with the editor tool, not PowerShell `Set-Content` (it produced "Ã·" style damage once); `npm run validate` catches it. Shell heredocs have eaten backslashes and backticks in patches here: use the editor tool for anything containing them.
- Data files are exact bytes (`.gitattributes` marks `app/data/**` and `app/seed/**` `-text`): some CSVs use CRLF on purpose to imitate messy exports. Never let an editor or git normalise them.
- Writing questions: strict items need an explicit `kind` (see schema.js) and an explanation of 40+ characters that teaches something. Distractors must be real: the validator rejects a correct option that is over 45 characters **and** more than 1.9x the longest distractor, two identical options, and "all/none of the above". Difficulty must sit inside its topic's level band (Beginner 1-3, Intermediate 2-4, Advanced 3-5), and a question's `concept` must belong to its own skill (or to `think`) unless it sets `crossConcept: true`. Near-duplicates are found per skill by word overlap, so a question that only swaps North for South is rejected.
- Question format: no topic should be mostly multiple choice. Besides `mc` there are `tf`, `fill`, `number` (with `verify`), `order`, `multi`, `formula`, `sql` (with `traps`), `numbers`, `file` and `open`. `number`/`numbers` answers can be checked as a month (`month: true`) or a date (`date: true`), which accept the usual written forms and reject a neighbouring month or the next day.
- A question's options are shown in a fixed order of their own (`displayOrder`), so the stored answer index and the shown one differ. Rewriting an option's **text** is safe; reordering the array changes what every stored attempt meant.
- Every claim in an explanation should come from the data. Numbers in new content are computed by `build:data` and quoted from `answers.json`, not typed from memory.
- Before adding a lot of content, check `npm run coverage`: it names every topic below target.
