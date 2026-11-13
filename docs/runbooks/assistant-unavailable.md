# Assistant unavailable

**Alert:** NobarAssistantUnavailable — over 20% of assistant turns failed to reach the model for 10 minutes.

The store already falls back: the assistant answers `503 ASSISTANT_UNAVAILABLE` and the page sends buyers to normal
search. Nothing about orders or payments depends on the model.

## Look first
1. Dashboard → "Assistant turns per hour" (`model_unavailable`) and "Tool calls".
2. Logs for `llm` upstream errors (timeout, HTTP status).
3. The model server: `LLM_BASE_URL` reachable from the cluster? (Self-hosted: GPU node up? Hosted: key valid, not rate limited?)

## Actions
- Model server down: restart it, or switch `LLM_PROVIDER=fake` temporarily (rule-based answers, no model) and restart.
- Slow model: raise `LLM_TIMEOUT_MS` only if answers are correct but late; otherwise fix the server.
- Cost spike instead of failures: lower `AI_DAILY_MESSAGES`.
