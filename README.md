# GoodCompany

A cooperative freelance marketplace platform with escrow-based contract management, community bank lending, and a self-sovereign identity layer — currently in MVP1 development.

Part of the broader [GoodCompany Ecosystem](https://github.com/SBGoodGit/goodcompany-ecosystem) (which also includes P3 and Whistleblower/Journalism). This repository contains the GoodCompany product itself: its architecture documentation and an interactive click-through showcase.

## Live showcase

**[View the interactive demo →](https://sbgoodgit.github.io/goodcompany/)**

A UI-only showcase (no real backend, no real payments) demonstrating the full user experience: job posting, structured negotiation, escrow/milestone payments, warranty & holdback, Community Bank lending, reputation, and a simulated AVI identity onboarding flow.

## Documentation structure

Documentation is organized in five layers, each answering a different question:

```
Core Design Principles   → why does the system work this way?
        ↓
Codex                    → what are the rules?
        ↓
Build Specification      → how is the current release built?
      ↙                              ↘
Configuration Registry      Implementation Registry
→ current tunable values     → current technology choices
```

- **[`docs/00-core-design-principles.md`](docs/00-core-design-principles.md)** — the foundational design philosophy (e.g. *Terms before Money*, *Escrow before Execution*, *Technology Serves Guarantees, Not the Reverse*). Every principle is labeled `Confirmed`, `Confirmed (Derived)`, `Decision Confirmed`, or `Proposed` depending on how directly it's traceable to a source — no design claim is given more authority than its actual evidence.
- **[`docs/codex/`](docs/codex/)** — nine domain-specific rule sets (Community Bank, Escrow/Milestones, Final Evaluation & Reviews, Identity/Audit/Profile, Marketplace/Jobs, Negotiation Workspace, Payment/Bank Coupling, plus two addenda on Warranty/Holdback and the Reputation Review mechanism).
- **[`docs/configuration-registry.md`](docs/configuration-registry.md)** — every tunable platform value (fees, thresholds, timers), each with its canonical source, so no value is duplicated across documents.
- **[`docs/implementation-registry.md`](docs/implementation-registry.md)** — technology choices, explicitly separated by how firm they are.
- **[`docs/build-spec/`](docs/build-spec/)** — the MVP1 technical build specification.
- **[`docs/whitepaper/`](docs/whitepaper/)** and **[`docs/GC_Product_Briefing_EN.md`](docs/GC_Product_Briefing_EN.md)** — the original product vision and briefing documents.

## A note for Cardano/Midnight developers

GoodCompany's identity and blockchain layers are deliberately **not locked to a specific implementation**. The `implementation-registry.md` distinguishes between:

- **Confirmed** — decisions locked in for the current MVP1 release (e.g. Hyperledger Identus + DigiD for identity, Mollie for payments)
- **Directional** — the architectural guarantee is fixed, but the underlying technology remains open (e.g. Cardano for the public verification layer, Midnight for private computation — the *what* is decided, the *how* is not)
- **Open Decision** — genuinely undecided (e.g. which settlement stablecoin, if any, for future multi-currency support)

This separation is intentional: it's meant to make clear where community input or existing tooling (e.g. more mature Identus implementations, if they already exist) could directly replace a from-scratch build, rather than presenting the current state as fixed further than it actually is.

## Status

MVP1 is in the specification + interactive-showcase stage. No production backend has been built yet. See `docs/00-core-design-principles.md` §7 for how the documentation layers relate to the eventual build.
