# Search performance

Roadmap Phase 1 exit criterion: search p95 < 300 ms on 100k products.

## How it is measured

`pnpm --filter @nobar/api bench` builds a catalog of 100,000 listings (the demo catalog copied into 2,000 shops),
runs each query 40 times on the production search code (`packages/domain` `createMarket().search`, which the API
calls) and writes the table below to `docs/performance-search.md`. It measures the search itself, not HTTP or JSON;
the run below is from the development container (one process, no other load).

## Result

Catalog: 100,000 listings in 2,000 shops; market built in 51 ms; 40 runs per query; Node v22.23.4.

| Query | Hits | p50 (ms) | p95 (ms) | max (ms) |
|---|---:|---:|---:|---:|
| word | 21,567 | 186.2 | 263.6 | 329.6 |
| two words | 16,172 | 113.8 | 171.5 | 288.5 |
| no query (browse) | 87,246 | 357.6 | 533.7 | 676.6 |
| category filter | 51,217 | 189.1 | 263.9 | 453.8 |
| cheapest landed | 2,696 | 21.9 | 27.5 | 29.3 |
| no match | 0 | 0.1 | 0.1 | 0.2 |

**Met** for text searches and filtered browsing. **Not met** for browsing the whole market with no query and no
filter (about 87k deliverable listings): every one needs a delivery quote before the first page can be ranked.
The bench keeps a 1 s regression guard on that case.

## What changed to get here

Before, one text search over 10,000 listings took about 1.7 s and browsing about 1.4 s; at 100,000 the benchmark
did not finish in ten minutes. Results are unchanged: `apps/api/test/search-index.test.ts` compares the indexed
search with a full scan over 500+ query, city, filter and sort combinations.

| Change | Why it was slow |
|---|---|
| One `Intl.DateTimeFormat` for weekdays, made once | A new formatter was built for every delivery quote |
| Freshness and dispatch day remembered per listing / shop for the Tehran day | Recomputed several times per listing per search, with date formatting each time |
| Tehran day of each timestamp remembered (bounded) | Date formatting for every harvest date on every search |
| Listing words normalised once per catalog snapshot | Every field of every listing was tokenised again for each query token |
| Word index (word → listings) for text queries | Every query scanned all listings; now only listings containing a matching word are scored |
| Weak matches dropped in one pass | `splice` inside a loop was quadratic with thousands of weak matches |
| Sort keys computed once per hit | The comparator built dates and looked up maps n·log n times |
| City lookups by `Map`, transit table built once, city distances remembered | Small per-quote costs repeated 100k times |
| `Math.max` over hits with a loop | Spreading ~100k values into `Math.max` can overflow the call stack |

## Still open

- Unfiltered browse of a 100k market: page the store (`/v1/search` now takes `limit` and `offset`; the store does
  not use them yet), and move search to OpenSearch as planned (architecture §5) or cache offers per destination.
- The catalog snapshot is reloaded every 30 s and after writes; the word index is rebuilt on the first text search
  after each reload (measured with the snapshot build: 40–60 ms here).
- No k6 run against a deployed API yet (needs an environment).
