# Contributing

Every change, whoever makes it (Claude Code included), follows one path:

```
feature branch → implementation → tests → pull request → CI → human review → human merge
```

1. **Branch from the latest main.** `git fetch origin && git switch -c claude/<topic> origin/main`
   (Claude uses `claude/…`; any clear name works for people).
2. **Make one focused change**, with a test that fails without it.
3. **Run the gate** in `app/`: `npm test`. It must pass. Never weaken a test to make it pass.
4. **Commit** with a meaningful message: `feat: …`, `fix: …`, `test: …`, `docs: …`, `ci: …`,
   `chore: …`. Not `update` or `changes`.
5. **Push the branch and open a pull request** into `main`, filling in the template.
6. **CI** runs `test`, `browser` and `build`. A red or missing check means: do not merge.
7. **The owner reviews and merges on GitHub.** Review comments are answered with new commits on
   the same branch and pull request.

Nobody pushes to `main` directly, and Claude never merges.

## What protects main

This repository is private on GitHub Free, and GitHub does not offer branch protection or
rulesets for private repositories on that plan (the API answers *"Upgrade to GitHub Pro or make
this repository public to enable this feature."*). Until that changes, `main` is protected by:

- **Git hooks** (`.githooks/`): refuse commits on `main` and pushes to `main`. Enable them once
  per clone with `git config core.hooksPath .githooks`.
- **CI `main-guard`**: any commit that reaches `main` without a merged pull request fails CI on
  `main`, and GitHub emails the owner. CD only packages `main` commits whose CI passed.
- **Claude Code settings** (`.claude/settings.json`): deny merging pull requests, pushing to
  `main`, skipping hooks and turning on auto-merge.
- **`CLAUDE.md`**: the operating contract every Claude Code session reads.

These make a mistake visible and hard to make. None of them can *stop* someone holding the
owner's GitHub credentials; only server-side protection can.

### Turning on server-side protection

With GitHub Pro (or a public repository), apply the ruleset in `.github/rulesets/protect-main.json`:
no deletion, no force-push, pull request required with 1 approval (stale approvals dismissed,
the latest push re-approved, conversations resolved), and `test`, `browser`, `build` required
and up to date.

```bash
gh api -X POST repos/eslamzyada/data-analyst-academy/rulesets --input .github/rulesets/protect-main.json
```

**One account cannot approve its own pull requests.** While Claude Code pushes with the owner's
own GitHub account, a required approval can never be given. Either give Claude Code its own
GitHub account (a collaborator with write access and no bypass), or set
`required_approving_review_count` to `0` before applying. Pull requests and green checks are
then still enforced, and the owner's merge is the approval.

## Releases

1. Bump `version` in `app/package.json` in a pull request, and merge it.
2. Tag main: `git tag v1.2.0 origin/main && git push origin v1.2.0`.
3. CD runs the whole CI gate on that commit, checks that the tag is on `main` and matches the
   version, packages the app and publishes a GitHub release with the zip and its SHA-256.

## Learner progress

`app/data/academy.db` is private and local. It is ignored by git, no test may open it, and
packages leave it out. Tests use throw-away databases (`ACADEMY_DATA` + `ACADEMY_REQUIRE_TEST_DATA=1`;
the server refuses to start a test run on the real folder).
