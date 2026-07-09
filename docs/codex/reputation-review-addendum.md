# GoodCompany Reputation Review Mechanism — Addendum

*Status: architectonisch besloten. Vult de whitepaper §4.4/§11.2-clausule "Reputation downgrades are community-reviewed" in met een concreet mechanisme. Nog niet samengevoegd met de hoofd-build-spec of de Codex — zie "Vervolgstappen" onderaan.*

## Aanleiding
Whitepaper §4.4 en §11.2 stellen beide dat reputatie-downgrades "community-reviewed" moeten zijn, zonder een uitvoeringsmechaniek te specificeren. Dit document legt vast welk mechanisme is gekozen, en waarom de twee eerder overwogen alternatieven zijn verworpen.

## Gekozen model: volledig automatisch (Model B), met Rookie Stage-buffer

**Kern:**
- Reviews zijn wederzijds — opdrachtgever beoordeelt opdrachtnemer, en andersom. Bestond al (build spec §2.1 Review-entiteit), hier expliciet herbevestigd als kernprincipe van dit mechanisme.
- Reputatie-updates zijn volledig automatisch — geen community review, geen mediator-tussenkomst, geen reviewpool.
- **Rookie Stage:** reputatiescore wordt vanaf de eerste voltooide opdracht berekend, maar pas publiekelijk getoond na 10 voltooide opdrachten. Vóór dat punt ziet de buitenwereld alleen "X opdrachten voltooid" en eventueel badges (identiteit geverifieerd, geen openstaande geschillen), geen cijfer/sterren.
- **Score telt intern al vanaf opdracht 1** voor score-afhankelijke platformvoordelen (priority matching, hogere leenbedragen-toegang, zie whitepaper §4 "Reputation as access") — alleen de publieke weergave wordt uitgesteld, niet de functionele werking. Dit voorkomt dat nieuwe gebruikers dubbel benadeeld worden (geen zichtbare score én geen toegang tot scoreafhankelijke voordelen).
- **Verplichte motivatie bij 1-3 sterren**, optioneel bij 4-5 sterren. Minimaal een tekstveld (indicatief: 100 tekens). Deze motivatie is privé — geen verificatieplicht, geen openbaarmakingsplicht. Functie: (1) de beoordeelde begrijpt de score, (2) context mocht er ooit een regulier contractgeschil ontstaan via de bestaande mediatorroute, (3) remt impulsieve beoordelingen af.
- **Geen cooldown-periode** voor het aanpassen van reviews. Overwogen en expliciet verworpen — een vaste bedenktijd verschuift een wraakreview alleen naar de laatste dag van die periode, het voorkomt niets.

## Verworpen alternatieven (bewust, niet zomaar losgelaten)

**Model A — voorafgaande Community Review Pool.** Elke negatieve review zou eerst naar 5 willekeurig geselecteerde, hoog-reputatie, belangeloze reviewers gaan, met een meerderheidsstem (bijv. 4/5) die bepaalt of de downgrade wordt doorgevoerd. Verworpen omdat: (1) het een tweede, parallelle beoordelingslaag naast de bestaande Community Mediator introduceert, zonder dat de verhouding tussen die twee ooit is opgelost; (2) de drempelwaarde (4/5, of iets anders bij een gespreide 3-optie-stem: downgrade terecht/onterecht/onvoldoende informatie) nooit sluitend is gedefinieerd; (3) het niet schaalt zonder een aparte reviewer-economie met eigen meta-reputatie op te tuigen — een compleet nieuw subsysteem voor een risico (Risico B, zie hieronder) dat statistisch ook lichter op te lossen is.

**Model C — automatisch + Review Appeal via mediator.** Reviews verlopen automatisch, maar een gebruiker kan een specifieke review aanvechten via een "Appeal"-knop; de Community Mediator toetst dan niet de score zelf maar of de review aantoonbaar in strijd is met de contract-audittrail (bijv. "leverde nooit op" terwijl de audittrail een getekende oplevering toont). Dit was tijdelijk de voorkeursvariant, maar is losgelaten ten gunste van Model B, omdat de Rookie Stage-buffer het onderliggende probleem (disproportionele impact bij weinig reviews) structureel oplost zonder een nieuwe geschilcategorie ("review dispute") te hoeven definiëren binnen de bestaande Dispute-categorisatie (Deliverable/Milestone/Quality/Scope/Warranty/Change Order).

## Onderliggend inzicht: twee aparte risico's, niet één
- **Risico A — gecoördineerde reputatieaanval** (bijv. 20 nepreviews om iemand te saboteren): grotendeels architectonisch geneutraliseerd, omdat elke review een volledig, ondertekend contracttraject vereist (opdracht → contract → escrow → uitvoering → max. 1 review per partij). Kost tijd, geld, en laat een volledige audit trail achter.
- **Risico B — de enkele, legitieme maar oneerlijke review** (één ontevreden partij geeft onterecht 1 ster na een reëel contract): blijft bestaan, maar wordt door de Rookie Stage statistisch gedempt in plaats van procedureel gecorrigeerd. Bij een gevestigde gebruiker (bijv. 150 opdrachten, 148 positief) verandert één oneerlijke review nauwelijks iets; bij een nieuwe gebruiker (2 opdrachten, 1 negatief) zou het zonder buffer wél disproportioneel zijn — vandaar de 10-opdrachten-drempel vóór publieke zichtbaarheid.

## Whitepaper-impact — beide passages moeten herschreven worden, niet alleen één
De whitepaper bevat de "community-reviewed"-formulering **twee keer** — §4.4 (Reputation System) én §11.2 (Reputation Gaming, als risicomitigatie). Beide moeten consistent worden bijgewerkt, anders spreekt de whitepaper zichzelf tegen.

Voorgestelde herformulering (samenvoeging van de tijdens dit traject overwogen versies):

> "Reputation updates are derived exclusively from completed contracts. Each contract allows a single review per party, preventing coordinated reputation attacks. Reputation adjustments are automatic. Public reputation becomes visible only after a minimum number of completed contracts (Rookie Stage), ensuring statistically meaningful scores while preventing disproportionate impact from isolated reviews. Reviews below a neutral threshold require a private written justification from the reviewer."

Dit vervangt in beide secties de oorspronkelijke zin "Reputation downgrades are community-reviewed. This prevents targeted reputation attacks while maintaining accountability" / "Downgrades are community-reviewed."

## Nieuw, klein featuregat ontdekt tijdens dit traject (niet opgelost, wel genoteerd)
De Contacts-module (build spec §2.2) is momenteel puur een adresboek — geen "vermijd deze partij bij toekomstige matches"-signaal. Tijdens dit gesprek kwam het idee op om intern te kunnen aantekenen "met dit contact doe ik geen zaken meer" na een negatieve ervaring, zonder dat dit een formele blokkade of dispuut hoeft te zijn. Geen bestaand mechanisme hiervoor. Klein, concreet, niet urgent — apart genoteerd zodat het niet zoekraakt, geen onderdeel van dit reputatiemechanisme zelf.

## Vervolgstappen (nog niet uitgevoerd)
1. Whitepaper §4.4 en §11.2 bijwerken met de voorgestelde herformulering (of een definitieve variant daarvan).
2. Build spec §2.1.1 (reputation_score-formule) uitbreiden met de Rookie Stage-logica (intern berekenen vanaf opdracht 1, publiek tonen vanaf opdracht 10) en het verplichte-motivatie-veld bij Review (huidige Review-entiteit heeft alleen `rating` + `comment`, comment is nu optioneel voor alle scores — moet conditioneel verplicht worden bij rating ≤3).
3. Dit addendum samenvoegen met de hoofd-build-spec zodra er tijd is — net als het Warranty/Holdback-addendum, geen blokkerende afhankelijkheid voor lopend Codex-werk.
4. Contacts-featuregat (hierboven) apart oppakken wanneer relevant, geen onderdeel van dit mechanisme.
