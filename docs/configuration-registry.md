# GoodCompany Configuration Registry v2

*Bevat alle instelbare platformparameters, gescheiden van de Codex (regel en betekenis), de Implementation Registry (leveranciers-/technologiekeuzes, apart document) en Core Design Principles (het waarom). Bron-kolom wijst altijd naar de oorspronkelijke bron — nooit naar een Codex-document — om een verwijzingsketen te voorkomen.*

**Statuscategorieën:**

| Status | Betekenis |
|---|---|
| Confirmed | Vastgelegd in een primaire bron (build spec, whitepaper, product briefing, addendum) |
| Decision Confirmed | Besloten tijdens dit traject, maar de primaire bron zelf moet nog worden bijgewerkt (zie migratielijst) |
| Illustrative Default | De bron zelf markeert de waarde als voorlopig/nog te valideren met echte gebruiksdata, of expliciet "illustrative, configurable" |
| Proposed | Nog geen besluit, ter overweging genoemd tijdens dit traject |

**Owner-kolom, disclaimer:** de genoemde "Owner"-waarden (Community Governance, Financial Governance, etc.) zijn een **voorgestelde organisatorische indeling**, geen verwijzing naar bestaande, formeel ingestelde bestuursorganen — die bestaan nog niet in de build spec of whitepaper. Dit is een aanbeveling voor toekomstige inrichting, geen beschrijving van iets dat al zo georganiseerd is.

---

## 1. Governance parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `community_loan_approval_threshold` | 60% vóór-stemmen | Governance | Community Governance (voorgesteld) | Community approval vereist | Confirmed | Build Spec §4.8 / §6.2 |
| `required_votes_tiers` | 50/100/250/500, hard cap bij 500 | Governance | Community Governance (voorgesteld) | Community approval vereist | Illustrative Default | Build Spec §6.2 |
| `audience_multiplier` | ×3 | Governance | Community Governance (voorgesteld) | Platform governance | Illustrative Default | Build Spec §6.2, Open decision 10.12 |
| `community_vote_duration` | 14 dagen | Governance | Community Governance (voorgesteld) | Platform governance | Confirmed | Build Spec §6.2 |

## 2. Financial / Risk parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `safety_reserve_threshold` | 55% van target | Risk Management | Financial Governance (voorgesteld) | Financial governance approval | Confirmed | Build Spec §6.1 |
| `reserve_split` | Safety 60% / Credit 20% / Legal 10% / Innovation 10% | Risk Management | Financial Governance (voorgesteld) | Financial governance approval | Illustrative Default | Build Spec §6.1 / Product Briefing §7.1 ("illustrative and should be configurable") |
| `platform_fee` | 2%, geheven bij uitbetaling | Financial | Financial Governance (voorgesteld) | Platform governance | Confirmed (bedrag); Decision Confirmed (heffingsmoment) | Build Spec §6.1 (bedrag); heffingsmoment vastgelegd dit traject, nog niet in build spec verwerkt |
| `organization_reserve_fraction` | 1% van de fee (0,02% van contractwaarde) | Financial | Financial Governance (voorgesteld) | Platform governance | Confirmed | Build Spec §6.1 / Appendix A |
| `loan_interest_rate` | 4% basis + 0,25%/6 mnd na 12 mnd coulance, cap +3% | Financial | Financial Governance (voorgesteld) | Financial governance approval | Confirmed | Build Spec §6.3 |
| `innovation_fund_slot` | €500.000 per slot | Financial | Financial Governance (voorgesteld) | Financial governance approval | Confirmed | Product Briefing §7.4 |
| `loan_early_repayment_penalty` | Geen, te allen tijde toegestaan | Financial | Financial Governance (voorgesteld) | Platform governance | Decision Confirmed | Community Bank Codex clausule 8; nog te verwerken in Build Spec §6.3 |

## 3. Contract parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `warranty_holdback_schedule` | 15d→5%, 30d→10%, 90d→15%, max. 3 uitbetalingen | Contract Risk Management | Contract Governance (voorgesteld) | Contract Governance | Confirmed | Warranty/Holdback Addendum |
| `change_order_expiry` | Opleveringstijd oorspronkelijke opdracht, fallback max. 90 dagen | Contract Governance | Contract Governance (voorgesteld) | Contract Governance | Decision Confirmed | Escrow/Milestone Codex; nog te verwerken als (deel van) Open decision 10.5 in Build Spec |
| `workspace_inactivity_timeout` | 21 dagen, melding 3 dagen vooraf | Contract Governance | Platform Governance (voorgesteld) | Platform governance | Confirmed | Build Spec §8.1 |
| `currency_scope` (MVP1 Settlement Currency) | **MVP1: uitsluitend EUR.** Productvisie: multi-currency met automatische FX-conversie voor internationale handel (lokale valuta → settlement-valuta → lokale valuta). | Contract Governance | Platform Governance (voorgesteld) | Platform governance | Decision Confirmed (dit gesprek) | Geen bestaande bronpassage voor de EUR-beperking zelf — nu expliciet vastgelegd als **releasebeperking, geen architectuurkeuze**. Zie Core Design Principle "Currency is an Implementation Choice" en Implementation Registry (Settlement Currency-tabel). |

## 4. Reputation parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `rookie_reviews_required` | 10 voltooide opdrachten | Reputation System | Reputation Governance (voorgesteld) | Platform governance | Confirmed | Reputation Review Addendum |
| `reliability_factor_floor` | 0,5 | Reputation System | Reputation Governance (voorgesteld) | Platform governance | Illustrative Default | Build Spec §2.1.1 |
| `reliability_factor_window` | Laatste 20 contracten | Reputation System | Reputation Governance (voorgesteld) | Platform governance | Illustrative Default | Build Spec §2.1.1 |
| `mandatory_motivation_threshold` | Verplicht bij ≤3 sterren | Reputation System | Reputation Governance (voorgesteld) | Contract Governance | Confirmed | Reputation Review Addendum |

## 5. Community parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `allowed_loan_categories` | Uitrusting, voorraad, transport, software (nooit leefkosten) | Community Bank | Financial Governance (voorgesteld) | Financial governance approval | Confirmed | Build Spec §2.7 |
| `loan_supplier_verification` | Verplicht bestaand, geverifieerd GC-account | Community Bank | Platform Governance (voorgesteld) | Platform governance | Confirmed | Build Spec §2.7 / §4.8 |

## 6. Platform operation parameters

| Parameter | Waarde | Domein | Owner | Wijzigingsniveau | Status | Primaire bron |
|---|---|---|---|---|---|---|
| `identity_layer_scope` | Bare Hyperledger Identus + DigiD, geen volledige AVI | Platform Operation | Platform Governance (voorgesteld) | Platform governance | Confirmed, MVP1-scope | Build Spec §1.1 / §1.2 |
| `dispute_escalation_ladder` | Geen, rechtstreeks naar mediator | Platform Operation | Platform Governance (voorgesteld) | Platform governance | Confirmed, MVP1-scope (MVP2 wijzigt dit) | Build Spec §8.2 |
| `contact_invitation_channel` | E-mail only | Platform Operation | Platform Governance (voorgesteld) | Platform governance | Confirmed, MVP1-scope | Build Spec §6.9, Open decision 10.15 op uitbreiding |

---

## Verplaatst uit dit document
- **`phase_rounding_method` ("grootste-restant"-methode)** — dit is geen instelbare waarde maar een deterministische systeemregel. Hoort thuis in de Codex als Core Design Rule, bijvoorbeeld: *"Milestone-percentages worden altijd afgerond volgens de grootste-restant-methode om cumulatieve afrondingsverschillen te voorkomen."* Nog te verwerken in de Escrow/Milestone-Codex (waar het al inline stond) als expliciete regel, niet in deze Registry.

## Nog niet opgenomen — geen bevestigde waarde, geen bestaand mechanisme
- **Prefer/Avoid-markering op Contacts** — nog geen bestaand mechanisme, dus geen registry-entry mogelijk.
- **Payment provider, SSI-technologie-implementatiedetails, blockchain-keuze (Cardano/Midnight)** — leveranciers-/technologiekeuzes, horen in de nog op te stellen Implementation Registry. Let op: Cardano/Midnight is daar **niet** automatisch "Confirmed" — build spec §5 en product briefing §9 noemen dit expliciet **directional, geen bindende MVP1-implementatiekeuze** (alleen de data-plaatsingsgrenzen liggen vast, niet de onderliggende technologie zelf). Hyperledger Identus + DigiD is wél specifiek bevestigd voor MVP1 (build spec §1.1, die de meer voorwaardelijke formulering in product briefing §9 overschrijft).
- **Offerte-geldigheidsduur** — nog geen bevestigde koppeling aan `workspace_inactivity_timeout`, alleen een niet-geverifieerde aanname.
- **Budget-zichtbaarheidsvariant (A/B/C)** — architectuurkeuze, geen configureerbare waarde, hoort in de Codex thuis zodra beslist.

## Migratielijst — status
- ~~Community Bank Codex, clausule 2 (rente), clausule 3 (steekproef/drempel)~~ — **uitgevoerd** (was al eerder gedaan, lijst hier niet bijgewerkt).
- ~~Community Bank Codex, clausule 4 (reservedrempel)~~ — **uitgevoerd (dit gesprek).** Viel destijds buiten de afgesproken scope van de oorspronkelijke migratieronde, nu alsnog meegenomen.
- Escrow/Milestone Codex, clausule 4 (afrondingsmethode) — **geen migratie nodig**, wordt Core Design Rule (geen instelbare waarde, zie sectie hierboven).
- ~~Final Evaluation/Reviews Codex, clausule 4 (reliability_factor), clausule 5 (Rookie-drempel, motivatiedrempel)~~ — **uitgevoerd.**
- ~~Warranty/Holdback Addendum~~ — **geschrapt, verkeerd gerichte migratie** (addendum is zelf de primaire bron, blijft ongewijzigd — zie hierboven).

**Migratielijst hiermee volledig afgerond — geen resterende punten.**
