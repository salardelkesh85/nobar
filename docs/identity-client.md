# Identity integration foundation

`IdentityClient` in `@nobar/contracts` covers the existing OTP, verification, profile, address and logout API. Construct one instance per user session, never a shared server singleton.

Tokens remain in memory; no browser persistence is introduced. Concurrent 401 responses share one refresh request so rotating refresh tokens are not reused. Requests retry once, and 403 responses never refresh. Logout clears local state immediately even if revocation fails; an in-flight refresh cannot sign the user back in. Network failures remain errors rather than becoming successful local mutations.

This is the transport foundation, not completed storefront integration. The current UI continues using demo state. Next work: explicit API/demo mode, reactive session provider, OTP form loading/errors, profile/address mutation feedback, and end-to-end checks against NestJS. Reload persistence needs an explicit session strategy before enabling production authentication. No real SMS provider or backend deployment was added.
