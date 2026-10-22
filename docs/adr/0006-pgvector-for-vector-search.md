# 0006. pgvector first for vector search, Qdrant later

- Status: Proposed
- Date: 2026-10-22

## Context
Phase 3 adds hybrid search (BM25 + semantic) and the AI assistant needs semantic retrieval over products and review insights. Expected scale for the first years is in the range of 10⁴–10⁶ product vectors, partitioned by city. We already run PostgreSQL and want to minimize new infrastructure on a resource-constrained dev machine.

## Options considered
1. **pgvector in PostgreSQL** — no new system; HNSW indexes; vectors can be filtered by `city_id`, `status`, and stock with plain SQL; transactional with metadata.
2. **Qdrant** — purpose-built, fast filtered search, quantization, horizontal scaling; one more stateful system to run.
3. **OpenSearch k-NN** — vectors live next to the BM25 index (single query for hybrid); but heavier JVM memory, and mixes two concerns into one cluster.

## Decision
Start with **pgvector** (HNSW, cosine distance) in the `ai-workers` database, behind a `VectorStore` interface (`upsert`, `delete`, `query(vector, filters, k)`). Hybrid ranking merges OpenSearch BM25 results with pgvector results using Reciprocal Rank Fusion in the search service.

Move to **Qdrant** (new adapter behind the same interface) when any of these is true: > ~5M vectors, p95 vector query > 100 ms after index tuning, or vector load starts competing with transactional load.

## Consequences
- + Zero new infrastructure in Phases 3–4; backups and monitoring already exist.
- + City/stock filters are exact SQL predicates.
- − Two round trips for hybrid search (OpenSearch + PostgreSQL), fused in code.
- − Embedding dimension is tied to the embedding model; changing models requires a re-embed job (planned in the pipeline, versioned by `model` column).
