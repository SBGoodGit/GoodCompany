# Codex — GoodTrade Escrow & Milestones (categorie: Voorwaarden/Contract)

*Inspiratiebron: standaard escrow-/milestone-payment-clausules (funding-voorwaarde, opleverings-/acceptatieproces, geschilbevriezing) — hier al grotendeels eigen aan GoodCompany's smart-contract-model, dus minder externe tweak nodig dan bij de Community Bank-set. Cijfermatige/mechanische waarden 1:1 overgenomen uit build spec §2.5, §3.4, §4.4, §4.5, §8.5, §8.6.*

## 1. Escrow-funding vóór uitvoering
`mandatory: true`, `smart-contract-compatible: true`
> "Uitvoering van de opdracht start niet vóórdat het volledige offertebedrag door de opdrachtgever in escrow is gestort en de storting door de betaalprovider is bevestigd. Een niet-bevestigde of mislukte storting laat het contract, de escrow en de betrokken reserves nooit in een tussentijdse of ambigue staat — de uitvoering wordt pas vrijgegeven ná bevestiging."

*Bron: build spec §4.4 — `escrow/fund` vereist een FundingRequest met status=completed; §8.7 — "A failed FundingRequest or PayoutRequest must never leave a Contract, Escrow, or Reserve in an ambiguous intermediate state."*

## 2. Betaalroute: in één keer of gefaseerd
`mandatory: true`
> "Het overeengekomen bedrag wordt vrijgegeven via één van twee routes, vastgelegd bij het accepteren van de voorwaarden: (a) **in één keer**, na ondertekening van de eindevaluatie door beide partijen, of (b) **gefaseerd**, per overeengekomen mijlpaal, waarbij elke fase pas wordt vrijgegeven na indiening door de opdrachtnemer én goedkeuring en ondertekening door de opdrachtgever."

*Bron: whitepaper §3.4 — lump-sum vs. phased payment; build spec §3.4 Escrow-statusflow (pending→funded→partially_released/released).*

## 3. Mijlpaal-indiening, goedkeuring en afwijzing
`mandatory: true`, `smart-contract-compatible: true`
> "Bij gefaseerde betaling dient de opdrachtnemer elke mijlpaal afzonderlijk in ter beoordeling. De opdrachtgever keurt goed — waarna het bijbehorende escrow-percentage automatisch wordt vrijgegeven — of wijst af. Een afwijzing is alleen geldig vergezeld van een verplichte toelichting; een afwijzing zonder inhoudelijke reden wordt niet verwerkt."

*Bron: build spec §2.5 — Milestone-status enum[pending, submitted, approved, rejected, paid]; §4.4 — `milestones/{mid}/reject` "with required comment"; `.../approve` → "triggers partial escrow release, emits AuditLogEntry."*

## 4. Fasebedragen — som en afronding
`mandatory: true`
> "De betalingsfases tellen op tot exact 100% van het offertebedrag; het systeem staat geen configuratie toe die hier niet aan voldoet. Bij afronding van fasebedragen naar hele centen wordt de 'grootste-restant'-methode gehanteerd, zodat de som van alle fasebedragen altijd exact gelijk is aan het totaalbedrag."

*Bron: build spec §2.4 — payment_phases "must sum to 100"; §8.5 — "Phase splits round using 'largest remainder' method — sum must always exactly equal total_amount."*

*Migratiestatus: **uitzondering, geen Configuration Registry-verwijzing.** De grootste-restant-methode is geen instelbare waarde maar een deterministisch algoritme — vastgelegd als Core Design Rule (zie ook Configuration Registry, sectie "Verplaatst uit dit document"). Blijft daarom inline in deze clausule staan, in tegenstelling tot clausules 9 en de rente-/steekproefclausules elders in de Codex die wél naar de Registry verwijzen.*

## 5. Change Order — scopewijziging tijdens uitvoering
`mandatory: true`
> "Indien tijdens de uitvoering blijkt dat de omvang van het werk groter is dan voorzien, kan de opdrachtnemer dit melden binnen het lopende contract, met een verplichte motivatie waarom dit nodig is. Dit opent een gerichte heronderhandeling over uitsluitend het gewijzigde deel — niet een volledig nieuw traject — die pas na acceptatie door beide partijen het contract en het resterende betalingsbedrag aanpast. Elke Change Order heeft een eigen gekoppelde conversatie (motivatie, reacties, besluit) die onderdeel wordt van het reguliere audit-dossier van het contract."

*Bron: whitepaper §3.5 — "targeted renegotiation (not the entire process from scratch)"; build spec §2.5 — ChangeOrder-status enum[proposed, accepted, rejected], velden description/requested_by/amount_delta/new_terms_version_id.*

**Change Order Conversation-structuur (Decision Confirmed, dit gesprek — uitgebreid t.o.v. eerdere versie van deze clausule):** een Change Order is geen simpele prijswijziging maar een onderhandeling over een contractwijziging, en verdient dezelfde communicatieve rijkdom als de rest van de Negotiation Workspace. Velden:
- **Omschrijving** — wat verandert er (bestaand `description`-veld, build spec §2.5).
- **Financiële wijziging** — het bedrag (`amount_delta`).
- **Motivatie** — verplicht voor de indiener: waaróm dit nodig is.
- **Reactie opdrachtgever:** goedkeuren → optionele reactie; afwijzen → verplichte motivatie (consistent met clausule 3, mijlpaal-afwijzing); een eventueel toekomstig tegenvoorstel-mechanisme (nog niet gebouwd) zou ook een verplichte motivatie krijgen.
- **Besluit** — het uiteindelijke resultaat (accepted/rejected).

**Dit is geen nieuwe auditgarantie, maar een specifieke toepassing van een al bestaande:** Codex Identity/Audit clausule 2 legt al vast dat "communicatie... en eventuele heronderhandelingen" voor elk contract in elke fase bewaard blijven. De Change Order Conversation is die algemene regel, hier concreet uitgewerkt voor dit specifieke object — geen aparte, nieuwe belofte. Praktisch voordeel: bij een later geschil is de context direct gekoppeld aan de contractwijziging zelf, niet verspreid over losse chatberichten.

*Let op — dit is een andere clausule dan de twee Change Order-clausules uit het Warranty/Holdback Addendum (fundingverplichting bij meerwerk; uitsluiting tijdens garantie). Deze clausule regelt de reguliere heronderhandelingsflow tijdens Execution; de addendum-clausules regelen specifiek het fundingsrisico en de garantie-uitsluiting. Alle drie horen in de Codex, geen overlap maar aanvullend op elkaar.*

## 6. Tussentijdse terugtrekking
`mandatory: true`
> "Terugtrekking vóór contractondertekening heeft geen financiële consequenties. Terugtrekking ná contractondertekening (met gefunde escrow) verloopt uitsluitend via de Change Order-/geschillenprocedure — nooit via een eenvoudige statuswijziging."

*Bron: build spec §8.6 — "Pre-contract withdrawal: no financial consequence. Post-contract withdrawal (active escrow): routes through the change-order/dispute path (8.2), never a simple status change."*

**Intrekking van een reeds geaccepteerde Change Order (Decision Confirmed, dit gesprek):** toegepast als analogie op bovenstaand precedent, met één aanvullende beveiliging.
- **Geaccepteerd, nog niet gefund** (beide partijen getekend, additionele escrow nog niet gestort, meerwerk mag dankzij clausule 5/9-koppeling nog niet begonnen zijn): intrekken kan, maar **uitsluitend met wederzijdse instemming** — niet eenzijdig. Eén partij mag een reeds door beide partijen geaccepteerde wijziging niet zomaar ongedaan maken.
- **Geaccepteerd én gefund**: intrekken verloopt via de bestaande Change Order-/geschillenprocedure (§8.2/§8.6) — geen nieuwe, aparte "annuleringsdispuut"-categorie nodig.

Dit sluit de eerder als apart open punt genoteerde vraag (Change Order withdrawal after acceptance) definitief af.

## 7. Escrow-bevriezing bij geschil
`mandatory: true`
> "Zodra een van beide partijen een contract meldt voor beoordeling, wordt de escrow bevroren totdat het geschil is opgelost. Bevriezing raakt alleen het nog niet vrijgegeven deel; reeds uitbetaalde fasebedragen worden niet teruggevorderd."

*Bron: build spec §3.4 — Escrow-status funded/partially_released → frozen (interim dispute process, §8.2), en terug na handmatige oplossing. Consistent met dezelfde bevriezingslogica als in het Warranty/Holdback Addendum (daar toegepast op de garantiefase specifiek).*

## 8. Automatische factuurgeneratie bij afronding
`mandatory: true`
> "Bij afronding van het contract (beide handtekeningen op de eindevaluatie) wordt automatisch een factuur gegenereerd voor het totaal van het basisbedrag plus eventueel geaccepteerde meerwerk-bedragen. Dit is geen aparte, handmatige stap."

*Bron: build spec §2.5 (Invoice-generatieregels) en §4.6 — "Also generates the issued/received Invoice pair (2.5) — this is not a separate manual step."*

## 9. Platform fee — moment van heffing
`mandatory: true`
> "De platformvergoeding van 2% wordt ingehouden op het moment van daadwerkelijke uitbetaling aan de opdrachtnemer — niet bij het funden van de escrow. Bij gefaseerde betaling wordt de vergoeding naar rato ingehouden op elke afzonderlijke mijlpaal-uitbetaling; bij betaling in één keer wordt de volledige vergoeding ingehouden op het moment van de eindafrekening. Dit geldt ook voor additionele uitbetalingen die volgen uit een geaccepteerde Change Order."

*Bron: nieuw vastgelegde productbeslissing (dit gesprek, herzien na signalering van de spanning met §6.1's "completed contract"-formulering). Dit lost de eerdere ambiguïteit in §6.1 (Open decision 10.7: "once at final release, or per-milestone") in één keer op — het is geen keuze tussen die twee, maar één principe (heffing bij uitbetaling) dat zich vanzelf naar beide betaalroutes voegt: één uitbetalingsmoment bij lump-sum, meerdere bij gefaseerde betaling. Voordeel t.o.v. heffing-bij-funding: er wordt nooit fee geïnd over geld dat een opdrachtnemer uiteindelijk niet ontvangt (bijv. bij terugtrekking via §8.6) — de fee volgt exact het geld, niet vooruit erop. **Actie: build spec §6.1 moet hierop worden bijgewerkt, huidige "at final release, or per-milestone"-formulering vervangen door dit uitbetalings-principe.**

## Bewust weggelaten / niet van toepassing
- **Klassieke escrow-agent-aansprakelijkheidsclausules** (bij traditionele escrow-diensten vaak een aparte partij met eigen aansprakelijkheidsbeperking) — niet van toepassing; GoodCompany's escrow is een smart-contract-mechanisme, geen menselijke escrow-agent met een eigen juridische positie.
- **Rentevergoeding over geparkeerd escrowbedrag** — niet genoemd in de build spec, geen aanwijzing dat hier rente over wordt vergoed aan de opdrachtgever. Niet toevoegen zonder productbeslissing.

## Openstaand na deze set
- ~~`POST /workspaces/{id}/sign` kent Open decision 10.2~~ — **opgelost (dit gesprek):** zodra ondertekend wordt, sluiten overige lopende Negotiation Workspaces voor dezelfde Job automatisch, en het bericht aan die kandidaten vermeldt expliciet dat het traject is afgesloten omdat opdrachtgever en -nemer elkaar hebben gevonden, bevestigd door de escrow-funding. Dit is systeemgedrag richting niet-gekozen kandidaten, geen Voorwaarden-clausule tussen de contracterende partijen zelf — hoort dus in build spec §4.3 verwerkt te worden, niet als aparte Codex-clausule.
- `POST /contracts/{id}/change-orders/{cid}/accept` kent nog **Open decision 10.5** — deels definitief opgelost (dit gesprek), één deelvraag blijft open:

  **Wel vastgelegd:**
  - **Acceptatiemechaniek:** beide partijen ondertekenen. De indiener (meestal de opdrachtnemer) tekent als leesbevestiging van het eigen voorstel vóór verzending; de opdrachtgever tekent voor daadwerkelijke acceptatie. Functioneel vergelijkbaar met de dubbele ondertekening bij de oorspronkelijke Contract Preview.
  - **Vervaltermijn, principe:** een voorgestelde Change Order vervalt na een reageerperiode gelijk aan de opleveringstijd van de oorspronkelijke opdracht, met een fallback-maximum van 90 dagen zodat een Change Order nooit onbeperkt blijft hangen.

### Decision 10.5 — Change Order Expiry & Non-Response Rule
**Status: Decision Confirmed (dit gesprek)** — sluit de eerder geschetste optie 2 definitief af, optie 1 (annuleringscorrectie-dispuut) expliciet afgewezen.

**Besluit:** een niet-geaccepteerde Change Order vervalt automatisch wanneer de acceptatietermijn verloopt — zonder gevolgen voor de oorspronkelijke overeenkomst. (Preciezer dan "geen financiële gevolgen" — er kunnen indirecte financiële gevolgen zijn, bijv. dat de opdrachtnemer minder werk uitvoert dan hij bij acceptatie had voorgesteld; de kern is dat er geen *extra verplichting* ontstaat, niet dat er nooit enig financieel effect is.)

**Gedrag bij verval:**
- De oorspronkelijke opdracht blijft ongewijzigd geldig.
- Het voorgestelde meerwerk maakt geen onderdeel uit van het contract.
- De opdrachtnemer levert volgens de oorspronkelijke scope.
- De bestaande escrow-afwikkeling volgt de oorspronkelijke overeenkomst, ongewijzigd.

**Geen automatische claim:**
- Geen acceptatie = geen verplichting tot betaling van het meerwerk.
- Geen afwijzing = geen geschil.
- Geen aparte "annuleringsdispuut"-categorie nodig — dat mechanisme (optie 1, hieronder afgewezen) is dus niet meer nodig.

**Uitzondering:** als de opdrachtgever later alsnog stelt dat het meerwerk onderdeel had moeten zijn van de opdracht, ontstaat geen Change Order-dispuut maar een regulier contract-/betalingsgeschil (bestaande mediatorprocedure, §8.2).

**Rationale:** stilte mag geen automatische financiële verplichting creëren. Een Change Order is per definitie een wijziging van de oorspronkelijke overeenkomst — daarvoor moet expliciete acceptatie bestaan, consistent met Terms before Money. Optie 1 (annuleringscorrectie-dispuut) is afgewezen omdat het stilzwijgen juridisch bijna gelijkstelt aan een actieve beslissing, een nieuw mechanisme introduceert waarbij iemand moet aantonen waarom iets niet doorging, en de Codex onnodig zwaarder maakt. Optie 2 (dit besluit) sluit aan bij bestaande principes: contractwijzigingen vereisen instemming, escrow volgt de overeengekomen scope, en disputes ontstaan uit een concrete afwijking — niet uit passiviteit.

**Nog steeds apart open, niet door dit besluit opgelost — Intrekbaarheid ná acceptatie:** kan een reeds geaccepteerde maar nog niet gefunde Change Order alsnog worden teruggedraaid? Dit is een ander scenario dan non-respons (hier hebben beide partijen al getekend) en blijft onopgelost. Verkende richting: een dispuut met "annuleringscorrectie", die de opdrachtnemer op zijn beurt weer moet accorderen — vereist mogelijk een eigen Codex-onderdeel. Nog niet uitgewerkt, apart van Decision 10.5 te behandelen.
- ~~Platform fee-timing (§6.1, Open decision 10.7)~~ — **volledig opgelost (dit gesprek):** heffing bij daadwerkelijke uitbetaling aan de opdrachtnemer, niet bij funding. Zie clausule 9. Geen resterende sub-vraag meer — de eerdere zorg (fee innen over een contract dat mogelijk niet voltooid raakt) vervalt vanzelf omdat er nu simpelweg niets wordt geheven totdat er ook echt wordt uitbetaald.
