# GoodCompany MVP1 — Warranty & Holdback Model
## Build Spec Addendum — Definitieve versie

*Status: architectonisch compleet, klaar om samengevoegd te worden met de hoofd-build-spec. Voortgekomen uit Codex/Clause Library-traject, sluit twee eerder geïdentificeerde architectuurgaten (Change Order "wrong amount"-risico; ontbrekende dekking binnen garantieperiode).*

---

## 1. Kernprincipe

Escrow-funding voorkomt wanbetaling vóór en tijdens uitvoering. Een deel van het contractbedrag (de holdback) blijft na oplevering nog een periode in escrow als motivatiebedrag — geen verzekering, geen dekkingsplafond — om de opdrachtnemer te stimuleren ook ná afronding professioneel te blijven handelen. Reputatie en holdback zijn losgekoppeld: reputatie is een oordeel over een afgeronde toestand, holdback is een financiële prikkel.

---

## 2. Entiteiten

### Escrow (uitbreiding bestaande entiteit)

| Veld | Type / waarden | Toelichting |
|---|---|---|
| `warranty_period_days` | enum [0, 15, 30, 90], default 30 | Instelbaar tijdens offertefase |
| `warranty_active` | boolean, **afgeleid** = `warranty_period_days > 0` | Geen los invoerveld — stuurt holdback_percentage aan |
| `holdback_percentage` | enum [5, 10, 15], default 10 | **Alleen actief/selecteerbaar wanneer `warranty_active = true`** |
| `holdback_amount` | berekend = contractbedrag × holdback_percentage | Herberekend bij elke geaccepteerde Change Order over het nieuwe totaalbedrag |
| `warranty_status` | enum [not_started, active, frozen, completed, claimed] | |
| `warranty_start_date` | datum, gezet bij Final Release | |
| `holdback_payout_schedule` | afgeleid, zie tabel §3 | Niet los configureerbaar |

**UI-/API-regel (twee lagen, beide verplicht):**
- **UI:** wanneer `warranty_period_days = 0` wordt gekozen, toont de holdback-percentage-selector automatisch een niet-interactieve "N.v.t."-weergave — geen keuzeoptie, geen los te selecteren "0%"-waarde naast 5/10/15. Wanneer `warranty_period_days > 0`, toont de selector uitsluitend de drie actieve percentages; "N.v.t." bestaat dan niet als optie.
- **Server-side:** een binnenkomende `holdback_percentage` wordt genegeerd/overschreven naar 0 zodra `warranty_period_days = 0` in dezelfde request zit, ongeacht wat de client meestuurt. UI-grayout alleen is onvoldoende bescherming tegen directe API-calls.

### LedgerTransaction (nieuwe types)

- `Holdback Release` — automatische deel-uitbetaling, smart-contract-triggered
- `Holdback Claim` — uitbetaling na mediator-uitspraak tijdens bevroren staat

---

## 3. Payout-schema

Interval schaalt met garantieduur, maximum 3 holdback-uitbetalingen (i.p.v. vaste 15-dagen-blokken — beperkt on-chain transacties bij lange garantieperiodes).

| `warranty_period_days` | Directe release | Holdback-uitbetalingen | Totaal aantal transacties |
|---|---|---|---|
| 0 | 100% | — (module inactief) | 1 |
| 15 | 100% − holdback% | 100% van holdback, dag 15 | 2 |
| 30 | 100% − holdback% | 50% dag 15, restant dag 30 | 3 |
| 90 | 100% − holdback% | 33,3% dag 30, 33,3% dag 60, restant dag 90 | 4 |

**Rekenregel (hard, geen uitzondering):** elke uitbetaling behalve de laatste = `holdback_amount ÷ aantal_uitbetalingen` (afgerond). De laatste uitbetaling = restsaldo van het escrow-account — dwingt exacte leging af, ongeacht afrondingsverschillen. Nooit losse hardcoded percentages per stap.

---

## 4. State machine — Escrow

```
Funded
  → Execution
      → [Change Order geaccepteerd → nieuwe Quote (parent_case_id) 
          → additionele funding → holdback_amount herberekend over nieuw totaal 
          → terug naar Execution]
      → alleen toegestaan zolang Escrow in staat Execution is
  → Completion
      → Final Release (contractbedrag − holdback_amount)
      → Warranty (substate van Completion, niet aparte top-level fase):
          ├─ Warranty Active     (warranty_start_date gezet, timer(s) lopen)
          │     ├─ payout-moment bereikt + geen open claim → Holdback Release (automatisch)
          │     └─ claim/dispuut geopend → Warranty Frozen
          ├─ Warranty Frozen     (alleen nog niet-uitgekeerd bedrag bevriest;
          │                       reeds uitbetaalde delen zijn onaantastbaar)
          │     → Mediator-uitspraak → Warranty Claimed (verdeling volgens uitspraak)
          └─ alle payout-momenten voltooid zonder claim → Warranty Completed
  → Reputation Bonus (20%) → Case Closed
```

**Harde regel — Change Order tijdens garantie:** zodra Escrow de staat `Warranty` (ongeacht substate) heeft bereikt, is Change Order-creatie op deze Case niet meer toegestaan. Dit is een state guard, niet alleen UI-verberging — voorkomt inconsistente state via alternatieve routes (API, race conditions). Voor aanvullend werk na start van de garantieperiode dient een nieuwe, aparte Case te worden aangemaakt.

**Documentatie-opmerking:** Warranty is bewust gemodelleerd als substate van Completion, niet als sequentiële fase ná Completion. Reden: toekomstige post-completion-mechanismen (onderhoud, SLA's, abonnementen) horen niet in dezelfde state tree, maar krijgen — net als Change Orders — hun eigen Case-object met `parent_case_id` terugverwijzend naar de oorspronkelijke opdracht. Dit patroon ligt al vast; geen generieke "post-completion module"-infrastructuur bouwen in MVP1 zolang er geen tweede concreet mechanisme op de roadmap staat.

---

## 5. Freeze-mechaniek bij claim/dispuut

- Bij het openen van een garantieclaim of dispuut bevriest uitsluitend het bedrag dat nog in escrow staat (nog niet uitgekeerde holdback-delen).
- Reeds uitbetaalde holdback-releases zijn definitief en worden nooit teruggevorderd, ook niet na een mediator-uitspraak in het nadeel van de opdrachtnemer.
- De opdrachtnemer hoeft het escrow-account nooit aan te vullen tot boven wat er nog in staat.
- **Functie, niet bijwerking:** dit creëert oplopende zekerheid voor de opdrachtnemer naarmate de garantieperiode vordert, en oplopende urgentie voor de opdrachtgever om vanaf dag één te controleren in plaats van te wachten. Waard om zo te documenteren in whitepaper/UX-copy, niet alleen als technische regel.

---

## 6. Herstelbedrag groter dan resterende holdback

GoodCompany is geen verzekeraar. Het holdback-bedrag is een gemaximeerd motivatiebedrag, geen dekkingsplafond voor daadwerkelijke herstelkosten. Overstijgt het herstelbedrag de resterende holdback, dan draagt de opdrachtnemer de meerkosten zelf — analoog aan reguliere garantieverplichtingen buiten het platform. Dit moet zichtbaar zijn vóór escrow-funding (Contract Preview / Voorwaarden), niet enkel een interne aanname, om geschillen over verwachtingen te voorkomen.

---

## 7. Reputatie

- 80% van reputatiepunten bij `Completion` (succesvolle oplevering, ongeacht garantie).
- 20% bonus bij `Warranty Completed` (garantieperiode volledig verstreken zonder claim).
- Geen tussentijdse reputatie-updates gekoppeld aan individuele holdback-releases (voorkomt onnodige score-schommeling bij een gebeurtenis waarbij feitelijk niets is gebeurd).

**Uitsluiting Warranty Completion Rate:** `warranty_period_days = 0` levert geen datapunt op voor deze metric. Reden expliciet vastgelegd: nul dagen garantie kent geen meetbare uitdaging, en zou anders gamebaar zijn (score opbouwen via garantieloze opdrachten vóór het aanbieden van garantie).

**Profielweergave (badge):**
```
Warranty Offered           87%
Average Warranty           42 dagen
Warranty Completion Rate   99,4%
```
`Warranty Offered %` = (afgeronde opdrachten met warranty_period_days > 0) ÷ (totaal afgeronde opdrachten).
`Warranty Completion Rate` = (garantieperiodes zonder claim) ÷ (totaal afgeronde garantieperiodes, exclusief 0-dagen).

---

## 8. Mandatory Clauses (Clause Library, categorie: Voorwaarden)

Alle onderstaande: `mandatory: true`, automatisch voor-geladen, niet verwijderbaar uit de picker.

1. **Garantiereservering** — legt `holdback_percentage` en `warranty_period_days` vast; zichtbaar in Offerte, Contract Preview, Contract en Escrow-overzicht.
2. **Geen verzekeringsdekking** — "De garantiereservering is een motivatiebedrag, geen verzekeringsdekking; herstelkosten die de reservering overstijgen komen voor rekening van de opdrachtnemer."
3. **Change Order-fundingverplichting** — "Meerwerk vereist acceptatie en volledige funding vóór aanvang; er bestaat geen verplichting tot uitvoering zonder funding."
4. **Uitsluiting Change Order tijdens garantie** — "Aanvullend werk kan niet worden toegevoegd aan een opdracht waarvan de garantieperiode is gestart; hiervoor dient een nieuwe opdracht te worden aangemaakt."
5. **Garantieverplichting** — "Gedurende de overeengekomen garantieperiode is de opdrachtnemer verplicht aantoonbare gebreken die onder de overeengekomen opdracht vallen binnen een redelijke termijn te herstellen. Geschillen over de vraag of een gebrek onder de garantie valt, worden behandeld volgens de GoodCompany Mediation Procedure."

---

## 9. Openstaande punten

Geen. Beide architectuurgaten (Change Order "wrong amount"-risico; ontbrekende dekking binnen garantieperiode) zijn opgelost en intern consistent uitgewerkt. Dit addendum kan worden samengevoegd met de hoofd-build-spec-chat.
