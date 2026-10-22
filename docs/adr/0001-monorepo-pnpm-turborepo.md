# 0001. Monorepo with pnpm workspaces and Turborepo

- Status: Proposed
- Date: 2026-10-22

## Context
Nobar has ~15 services, 3 web apps and several shared packages (contracts, common runtime code, UI kit, Persian text utilities). Event schemas and API contracts change together with their producers and consumers. The team is small, and the project is also a teaching artefact for a software-engineering seminar, so the whole system should be readable in one place.

## Options considered
1. **Polyrepo** (one repo per service) — strong isolation, independent pipelines; but contract changes need coordinated PRs across repos, shared code needs a private package registry, and onboarding is slow for a small team.
2. **Monorepo with pnpm workspaces + Turborepo** — atomic changes across contracts and services, one CI config, shared tooling; Turborepo gives task caching and "only build what changed".
3. **Monorepo with Nx** — richer generators and dependency graph, but heavier and more opinionated; more to learn.

## Decision
Option 2. pnpm workspaces for dependency management (strict, disk-efficient, fast on Windows), Turborepo for the task graph (`build`, `lint`, `test`, `dev`) with local caching. Python (`services/ai-workers`) lives in the same repo with its own `pyproject.toml` (uv) and is wired into Turborepo through package scripts.

## Consequences
- + One PR can change a contract, its producer and its consumers; contract tests run in the same CI.
- + Shared `packages/common` and `packages/contracts` without publishing to a registry.
- − CI must avoid rebuilding everything: use Turborepo `--filter=...[origin/main]` and per-service image builds only for affected services.
- − Service independence must be protected by rules, not repo walls: services may depend on `packages/*` but **never import from another service**. An ESLint boundary rule enforces this.
