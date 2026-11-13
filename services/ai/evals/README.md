# Assistant evals

Persian regression cases for the shopping assistant (`apps/api/src/modules/assistant`).
Each YAML file is a list of cases; a case is one conversation against the demo catalog.

```yaml
- name: short description
  dest: tehran            # destination city (default tehran)
  turns:
    - user: "متن خریدار"
      expect:
        tools: [search_products]        # tools that must have run, in order
        contains: ["تومان"]             # substrings of the answer
        notContains: ["رایگان"]
        minCards: 1                     # product cards returned
        maxCards: 0
        proposal: true                  # a basket proposal is (not) returned
        maxProposalTotalRial: 8000000
        compare: true                   # a comparison link is (not) returned
```

Every turn also gets the checks that hold for any model: amounts in the answer come from tool results,
the cart is never changed by a chat turn, and every tool call is in `ai.ai_audit_log`.

Run with the rule-based model (CI): `pnpm --filter @nobar/api test assistant-evals`.
Run against a real model: set `LLM_PROVIDER=openai-compatible`, `LLM_BASE_URL`, `LLM_MODEL` (and `LLM_API_KEY`)
in the environment before the same command. Expectations on exact wording (`contains`) are written for the
rule-based model; with a real model treat those failures as review items, and the tool/number/cart checks as hard failures.
