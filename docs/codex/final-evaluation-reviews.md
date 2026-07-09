# Codex — GoodTrade Final Evaluation & Reviews (categorie: Voorwaarden/Contract)

*Inspiratiebron: standaard opleverings-/acceptatie- en beoordelingsclausules — hier grotendeels eigen aan GoodCompany's mechanisme (automatische reputatie-herberekening, discrepantie-notities als onderdeel van de eindevaluatie zelf i.p.v. een apart geschil). Waarden 1:1 overgenomen uit build spec §2.1, §2.1.1, §4.6.*

## 1. Dubbele ondertekening eindevaluatie
`mandatory: true`, `smart-contract-compatible: true`
> "Het contract wordt pas afgerond zodra zowel opdrachtgever als opdrachtnemer de eindevaluatie hebben ondertekend. Bij ondertekening door beide partijen wordt de escrow volledig vrijgegeven en wordt automatisch het factuurpaar (uitgaand/inkomend) gegenereerd — dit is geen aparte, handmatige stap."

*Bron: build spec §4.6 — `evaluation/sign`: "When both signed → contract.status=completed, escrow released fully... Also generates the issued/received Invoice pair — this is not a separate manual step."*

## 2. Discrepantie-notitie bij afronding
`mandatory: true`
> "Bij ondertekening van de eindevaluatie kan elke partij een discrepantie-notitie toevoegen — een schriftelijke aantekening over een verschil van inzicht over de geleverde kwaliteit of omvang, zonder dat dit de afronding van het contract of de vrijgave van de escrow blokkeert."

*Bron: build spec §2.5 — FinalEvaluation-veld `discrepancy_notes (text, nullable)`. Belangrijk verschil met een dispuut: deze notitie is optioneel en blokkerend-vrij — het contract rondt sowieso af. Dit is dus geen geschilprocedure, maar een lichte vorm van "voor de goede orde vastleggen." Als een partij het er niet bij wil laten, is de geschilprocedure (§8.2) de aangewezen route, niet deze notitie.*

## 3. Review pas ná afronding
`mandatory: true`
> "Een beoordeling van de wederpartij kan alleen worden geplaatst nadat het contract volledig is afgerond (beide handtekeningen op de eindevaluatie). Vooraf of tussentijds plaatsen van een beoordeling is niet mogelijk."

*Bron: build spec §4.6 — `contracts/{id}/reviews` "post-completion only."*

## 4. Automatische reputatie-herberekening
`mandatory: true`, `smart-contract-compatible: true`
> "Het plaatsen van een beoordeling triggert automatisch een herberekening van de reputatiescore van de beoordeelde partij. Deze score is het resultaat van een gewogen gemiddelde van alle ontvangen beoordelingen, vermenigvuldigd met een betrouwbaarheidsfactor gebaseerd op het percentage tijdig opgeleverde mijlpalen over de laatste {{Contractvenster}} contracten (met een ondergrens van {{Betrouwbaarheidsvloer}}). Gebruikers hebben geen directe invloed op hun eigen score-berekening."

*Regel vastgelegd in build spec §2.1.1 (`reputation_score = weighted_avg(rating) × reliability_factor`) en §4.6 (trigger). Actuele waarden (betrouwbaarheidsfactor-ondergrens, contractvenster) zijn geen onderdeel van deze clausuletekst meer — canonieke bronnen: **Configuration Registry, parameters `reliability_factor_floor` en `reliability_factor_window`.***

## 5. Automatische reputatiewijziging met Rookie Stage-buffer
`mandatory: true`, `smart-contract-compatible: true`
> "Reputatiewijzigingen — zowel positief als negatief — zijn volledig automatisch en volgen zonder tussenkomst uit de formule hierboven. De reputatiescore wordt intern al vanaf de eerste voltooide opdracht berekend, maar pas publiekelijk zichtbaar na {{Rookie-drempel}} voltooide opdrachten (Rookie Stage); vóór dat punt zijn alleen het aantal voltooide opdrachten en verificatie-badges zichtbaar, geen cijfer. Bij een beoordeling van {{Motivatiedrempel}} sterren of lager is een schriftelijke, niet-openbare motivatie verplicht; daarboven is dit optioneel."

*Regel vastgelegd in het Reputation Review Mechanism Addendum (dit traject) — vervangt de eerdere whitepaper-formulering "Reputation downgrades are community-reviewed" (§4.4 en §11.2), die geen uitvoeringsmechaniek specificeerde. Actuele waarden (Rookie-drempel, motivatiedrempel) zijn geen onderdeel van deze clausuletekst meer — canonieke bronnen: **Configuration Registry, parameters `rookie_reviews_required` en `mandatory_motivation_threshold`.** Gekozen na afweging van twee risico's: gecoördineerde reputatie-aanvallen (grotendeels architectonisch geneutraliseerd doordat elke review een volledig, ondertekend contracttraject vereist) versus de enkele legitieme-maar-oneerlijke review (structureel gedempt via de Rookie Stage-drempel in plaats van procedureel gecorrigeerd). De score telt intern al vanaf opdracht 1 mee voor scoreafhankelijke platformvoordelen (priority matching, leenbedrag-toegang) — alleen de publieke weergave wordt uitgesteld, om te voorkomen dat nieuwe gebruikers dubbel benadeeld worden.*

*Overwogen en verworpen: (a) een voorafgaande Community Review Pool die elke negatieve beoordeling toetst vóór verwerking, en (b) een Review Appeal-procedure via de Community Mediator. Beide zijn losgelaten omdat de Rookie Stage-buffer het onderliggende probleem (disproportionele impact bij weinig reviews) structureel oplost zonder een nieuwe geschilcategorie of reviewer-economie te vereisen — zie het addendum voor de volledige afweging.*

*Actie: whitepaper §4.4 en §11.2 moeten beide worden bijgewerkt (niet slechts één van de twee, anders spreekt de whitepaper zichzelf tegen); build spec §2.1.1 (reputation_score-formule) en de Review-entiteit (§2.1, `comment`-veld) moeten de Rookie Stage-logica resp. de conditioneel-verplichte motivatie nog krijgen — momenteel is `comment` onvoorwaardelijk optioneel.*

## 6. Domein-gescheiden reputatie
`mandatory: true`
> "De reputatiescore die op GoodCompany wordt opgebouwd, is beperkt tot het economische domein (voltooide contracten, betalingsbetrouwbaarheid) en wordt niet automatisch overgenomen naar andere onderdelen van het GoodCompany-ecosysteem, zoals eventuele governance- of reviewreputatie elders."

*Bron: whitepaper §4 — "A member's work reputation on GoodCompany does not automatically transfer to other parts of the ecosystem... distinct from any governance reputation... or review reputation in the Whistleblower platform." Voor MVP1 is dit vooral een principeclausule — er is nog maar één reputatiedomein gebouwd, dus de scheiding is nu triviaal waar, maar de clausule voorkomt latere verwarring zodra andere ecosysteemonderdelen live gaan.*

## Bewust weggelaten / niet van toepassing
- **Klassieke "acceptance testing"-clausules** (bijv. een vaste keuringsperiode met automatische acceptatie bij stilzwijgen) — niet van toepassing op de eindevaluatie zelf, want die vereist expliciete dubbele ondertekening, geen stilzwijgende aanname. (Vergelijkbare stilzwijgen-bij-geen-reactie-mechaniek bestaat wel bij Change Orders, zie de Escrow/Milestone-set — niet hier dupliceren.)
- ~~Recht op verwijdering van een negatieve review~~ — **achterhaald door het Reputation Review Addendum:** clausule 5 kent nu geen enkele verwijderings- of correctieroute meer voor individuele reviews (Model B, volledig automatisch is gekozen, mét Rookie Stage-buffer i.p.v. procedure). Dit punt vervalt.

## Openstaand na deze set
- ~~Mechaniek achter "community-reviewed downgrade" (clausule 5)~~ — **opgelost (dit gesprek):** zie Reputation Review Mechanism Addendum. Model B gekozen (volledig automatisch + Rookie Stage + verplichte motivatie bij lage score), Model A (reviewpool) en Model C (mediator-appeal) bewust verworpen.
- **Reliability_factor als config-waarde** — zelfde aandachtspunt als de audience-multiplier: moet bij implementatie een instelbare parameter zijn, geen hardcoded 0,5-vloer of "laatste 20 contracten"-venster.
- **Nieuw, uit het addendum:** build spec §2.1.1 en de Review-entiteit moeten nog worden uitgebreid met de Rookie Stage-logica en het conditioneel-verplichte motivatieveld — dit staat nog niet in de build spec zelf, alleen in het addendum en nu in deze Codex-clausule.
