# Codex — Negotiation Workspace: Technische Intake, Offerte & Contract Preview (categorie: Voorwaarden/Contract)

*Inspiratiebron: grotendeels eigen aan GoodCompany's structuur (gefaseerde onderhandeling i.p.v. vrije chat) — het "vraag-bibliotheek"-concept waaruit dit hele Codex-traject ooit is ontstaan, is hier het meest direct van toepassing. Waarden 1:1 uit build spec §2.4/§4.3, product briefing §3.3.*

## 1. Technische intake — verplichte, gestructureerde vragenlijst
`mandatory: true`
> "Voordat een opdrachtnemer een offerte kan opstellen, doorloopt hij een gestructureerde technische intake: een vragenlijst waarmee de benodigde informatie over de opdracht wordt verzameld. Alle intakevragen moeten beantwoord zijn voordat de onderhandeling naar de volgende fase (Voorwaarden) kan overgaan."

*Bron: build spec §4.3 — `POST /workspaces/{id}/advance`: "Pre: required intake questions answered before leaving technical_intake"; product briefing §3.3 — "Technical intake: structured Q&A in which the contractor gathers the information needed to properly assess the work."*

## 2. Vragenbibliotheek met vrij veld
`editable: true`, `mandatory: false`
> "De technische intake bestaat uit een combinatie van standaardvragen — te kiezen uit een vooraf samengestelde bibliotheek per vakgebied — aangevuld met een vrij invulbaar custom veld voor opdrachtspecifieke vragen. De opdrachtnemer bepaalt zelf welke standaardvragen relevant zijn voor deze specifieke opdracht."

*Bron: dit is het oorspronkelijke "vraag-bibliotheek"-idee waaruit het hele Codex/Clause Library-traject is ontstaan (zie de allereerste overdrachtsbriefing). Optioneel/editable omdat de precieze vragenset per vakgebied verschilt — dit is een mechaniek-clausule, geen vaste inhoudelijke vragenlijst.*

*Let op: de daadwerkelijke standaardvragen per vakgebied zijn nog niet uitgewerkt — dit is een mechaniek-clausule, geen kant-en-klare vragenbibliotheek. Zie "Openstaand" hieronder.*

## 3. Prijs pas na overeenstemming over voorwaarden
`mandatory: true`
> "De opdrachtnemer stelt pas een prijs vast nadat overeenstemming is bereikt over de voorwaarden (werktijden, communicatiekanaal, garantietermijn, eigendom van materialen/IP, betalingsfases, annuleringsvoorwaarden). Prijs wordt dus nooit besproken vóór de voorwaarden zijn vastgesteld."

*Bron: product briefing §1.2 — "Terms before money: terms of engagement... are agreed before price is discussed"; §3.3 — "only after agreement on the terms of engagement does the contractor set the price"; build spec §4.3 — `POST /workspaces/{id}/quote`: "Pre: an accepted terms version exists."*

*Belangrijke samenhang: dit principe is de directe onderbouwing voor de eerder vastgestelde keuze in de Marketplace-Codex om het indicatieve budget nooit vóór de Offerte-fase aan een individuele kandidaat te tonen (Variant C) — dezelfde "terms before money"-logica geldt op beide plekken.*

## 4. Automatische fasesplitsing van de offerte
`mandatory: true`, `smart-contract-compatible: true`
> "Bij gefaseerde betaling wordt de offerte automatisch gesplitst in fasebedragen, volgens de percentages die al in de voorwaardenfase zijn overeengekomen. De opdrachtnemer stelt alleen het totaalbedrag vast; de verdeling volgt automatisch."

*Bron: product briefing §3.3 — "For phased payment, the quote is automatically split into phase amounts according to the previously agreed percentages"; build spec §2.4 — `phase_amounts`: "auto-derived from terms.payment_phases × total_amount." Consistent met de eerder vastgelegde "grootste-restant"-afrondingsmethode uit de Escrow/Milestone-set (clausule 4 daar) — dezelfde berekening, hier toegepast op het ontstaansmoment van de offerte zelf.*

## 5. Dubbele ondertekening bij contractvorming
`mandatory: true`, `smart-contract-compatible: true`
> "Het contract komt pas tot stand zodra beide partijen de contract preview (eindoverzicht van voorwaarden + offerte) ondertekenen. Bij dubbele ondertekening worden het contract en de escrow (in status 'pending', nog niet gefund) automatisch aangemaakt — dit is geen aparte, handmatige stap."

*Bron: build spec §4.3 — `POST /workspaces/{id}/sign`: "Effect: once both signed → Contract + Escrow(status=pending) created"; product briefing §3.3 — "Contract preview & signing: final overview of terms + quote; once both parties agree, the contract becomes active."*

*Let op: dit is een ander moment dan escrow-fúnding (Escrow/Milestone-Codex, clausule 1) — hier ontstaat de escrow alleen als lege, ongefunde plaatshouder. Niet verwarren met de daadwerkelijke storting, die pas later volgt via het Payment-Bank-Coupling-traject.*

## 6. Bevroren snapshot bij contractvorming
`mandatory: true`
> "Op het moment van contractvorming worden de geaccepteerde voorwaardenversie en de offerte bevroren als vaste momentopname. Latere wijzigingen aan een voorwaardensjabloon of offerte-tooling raken dit specifieke contract niet meer — alleen een Change Order kan het contract nog wijzigen."

*Bron: build spec §2.5 — Contract-entiteit: `terms_version_id` ("frozen snapshot at contract creation"), `quote_id` ("frozen snapshot").*

## Bewust weggelaten / niet van toepassing
- ~~Vaste geldigheidsduur van een offerte met automatisch verval~~ — **opgelost (dit gesprek): bewust géén aparte vervaldatum.** Zie Decision 10.6 hieronder.

### Decision 10.6 — Offerte-geldigheidsduur
**Status: Decision Confirmed (dit gesprek)** — geen bestaande bronpassage, nieuwe beslissing.

**Besluit:**
- Een niet-geaccepteerde offerte heeft **geen eigen vervaldatum.**
- De offerte blijft beschikbaar zolang de gekoppelde Negotiation Workspace actief is.
- De bestaande 21-dagen-workspace-inactiviteitstimer (§8.1) bepaalt wanneer een workspace zonder activiteit een statuswijziging krijgt — niet een aparte offertetimer.
- Bij heractivatie van de workspace blijft de offerte behouden, tenzij één van de partijen deze intrekt of een nieuwe offerteversie wordt aangemaakt.

**Rationale:** een offerte is onderdeel van een workspace-proces, geen losstaand commercieel object met een eigen countdown. Eén lifecycle-mechanisme voor inactiviteit voorkomt meerdere timers die elkaar kunnen tegenspreken, en voorkomt het scenario waarin een actieve onderhandeling plotseling eindigt omdat alleen de offertetimer afliep terwijl partijen nog wel degelijk actief communiceerden.

**Let op — dit generaliseert niet naar een universeel principe.** Dit is een specifieke toepassing, geen "één timer voor alles"-regel: Change Order-vervaltermijn (gekoppeld aan opleveringstijd, fallback 90 dagen) en de Community Bank-stemtermijn (14 dagen) hebben elk hun eigen, functioneel andere logica en blijven apart bestaan. Deze koppeling werkt hier specifiek omdat de offerte functioneel onderdeel ís van dezelfde workspace, niet ernaast staat.

## Openstaand na deze set
- **Inhoudelijke vragenbibliotheek per vakgebied is nog niet uitgewerkt.** Clausule 2 legt het mechaniek vast (standaardvragen + custom veld), maar de daadwerkelijke standaardvragen per categorie (bijv. "gewenste techstack" voor IT, "vierkante meters" voor bouw) bestaan nog niet als concrete lijst. Dit was ook al zo in het testbestand (`GoodCompany_ClauseLibrary_Test.html`) — geen regressie, gewoon nog nooit opgepakt.
