# Security and operational boundary

RepairShop proves a local repair-ticket workflow. Maps, calendar, SMS, tax, accounting, supplier, payment, and AI routes are not authoritative integrations unless an adapter is explicitly implemented and acceptance-tested.

- Routine startup never installs packages, creates/alters/seeds a database, writes `.env`, or kills unrelated processes.
- Destructive fixtures require `ALLOW_DISPOSABLE_SEED=YES` and operator-supplied credentials.
- Public staff registration is disabled. JWTs are one-hour HS256 tokens with pinned issuer/audience and active-user lookup.
- Ticket transitions are explicit; orders cannot be received twice; checkout requires a ready-for-pickup ticket and explicit payment state.
- The Stripe placeholder returns 501 and never claims a payment. Email requires an HTTPS webhook adapter and never logs message/reset contents.
- AI output, diagnoses, quotes, dispatch suggestions, taxes, and customer messages require qualified human review.
