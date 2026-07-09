# Codex — Marketplace: Jobs & Contacts (categorie: Voorwaarden/Systeem)

*Inspiratiebron: grotendeels eigen aan GoodCompany's ontwerp (geen zichtbaar budget, status-mechaniek als anti-onderhandelingsmoeheid-instrument) — geen externe inspiratie nodig, dit zijn platform-UX-principes, geen juridische clausules in de klassieke zin. Waarden 1:1 uit build spec §3.1/§4.1/§4.2, product briefing §3.1-3.3.*

## 1. Geen zichtbaar budget bij plaatsing
`mandatory: true`
> "Bij het plaatsen van een opdracht wordt geen budget getoond aan potentiële kandidaten. Dit voorkomt dat prijs het eerste en enige selectiecriterium wordt. Een indicatief budget kan optioneel door de opdrachtgever gedeeld worden als zoekfilterwaarde — nooit als vast onderdeel van de openbare vermelding, en nooit zichtbaar voor een individuele kandidaat vóór de Quote-fase van de Negotiation Workspace."

*Bron: product briefing §3.1 — "No budget is deliberately shown"; product briefing §5 — "Filter by (indicative) budget, if the client optionally chooses to share this."*

### Decision 10.3 — Budget Visibility
**Status: Decision Confirmed (dit gesprek)** — nieuwe, hier genomen beslissing, geen bestaande bronpassage die dit letterlijk zo vastlegt (in tegenstelling tot de twee losse feiten hierboven, die wel direct herleidbaar zijn).

**Besluit:** het opdrachtbudget wordt uitsluitend gebruikt als intern zoek- en matchcriterium. Het budget is niet zichtbaar voor opdrachtnemers vóór de Quote-fase. Een financieel voorstel ontstaat pas wanneer een formele offerte wordt uitgebracht.

**Rationale:** budget heeft twee functies in GoodCompany, en die twee horen niet vermengd te worden:
1. **Matching (intern)** — voorkomt irrelevante matches, wordt gebruikt als zoekfilter/ranking, is geen onderdeel van de onderhandeling zelf.
2. **Contractvorming (extern)** — pas tijdens de Quote-fase wordt een concreet bedrag onderdeel van de overeenkomst; vanaf dat moment gelden Terms before Money en vervolgens Escrow before Execution.

Budget is dus **vóór de offerte metadata, en ná de offerte contractdata** — een sterkere architectonische scheiding dan alleen "we verbergen het bedrag." Budget ondersteunt matching, maar stuurt de onderhandeling niet.

**Design rationale (economische logica, aanvullend op de architecturale):** de traditionele marktplaatslogica werkt als *prijs → selectie → gesprek → uitvoering*. GoodCompany draait dit om: *geschiktheid → gesprek → voorwaarden → prijs → escrow → uitvoering*. De opdrachtgever beschrijft de behoefte, niet de prijs van de oplossing — de prijs is het resultaat van de professionele dialoog en wordt pas onderdeel van de overeenkomst tijdens de Quote-fase. Dit voorkomt twee ongewenste dynamieken: (1) een race naar de bodem, waarbij professionals primair op laagste prijs concurreren in plaats van op kwaliteit/aanpak/vertrouwen, en (2) informatie-asymmetrie, waarbij een opdrachtgever zonder vakkennis vooraf een prijs zou moeten verzinnen voor werk waarvan hij de complexiteit niet kan beoordelen. Dit is geen marketingtekst maar de vastgelegde reden waarom Variant C bestaat — zodat een toekomstige vraag als "waarom laten we het budget niet gewoon zien zoals andere platforms?" een direct, herleidbaar antwoord heeft in plaats van opnieuw uitgevonden te moeten worden.

**Verworpen alternatieven:**
| Variant | Beoordeling | Reden |
|---|---|---|
| A — Budget volledig zichtbaar op de listing | Afgewezen | Stuurt het gesprek direct naar prijs, ondermijnt de focus op voorwaarden en oplossing |
| B — Budget zichtbaar zodra een kandidaat reageert | Afgewezen | Blijft een prijsanker vóór de offertefase, staat op gespannen voet met Terms before Money (product briefing §1.2) |
| C — Budget uitsluitend als zoekfilter, nooit zichtbaar vóór de Quote-fase | **Confirmed (als Decision 10.3)** | Laat opdrachtgevers filteren zonder dat budget de onderhandeling domineert |

## 2. Drie statussen, klantgestuurd
`mandatory: true`, `smart-contract-compatible: true`
> "Een opdrachtgever bepaalt te allen tijde de status van een geplaatste opdracht: open (nieuwe reacties welkom), gesloten (vervuld of ingetrokken), of slapend (tijdelijk geen nieuwe reacties gewenst, omvormbaar naar open). Bij de slapende status blijven alle bestaande reacties en lopende gesprekken volledig behouden — alleen nieuwe reacties worden geblokkeerd. Deze statuswijziging is een eenzijdige, handmatige actie van de opdrachtgever."

*Bron: product briefing §3.2 — drie statussen, expliciet bedoeld om "negotiation fatigue" te beheersen; build spec §3.1 — statusflow `open ⇄ dormant`, `open/dormant → closed`, "No automatic transitions in MVP 1."*

*Let op: er zijn géén automatische statusovergangen in MVP1 — zie "Openstaand" hieronder, dit is een expliciete open decision (10.1), niet een ontbrekende feature.*

## 3. Eén actieve onderhandeling per kandidaat per opdracht
`mandatory: true`
> "Een kandidaat kan slechts één actieve Negotiation Workspace tegelijk hebben per opdracht. Een opdrachtgever kan wél meerdere Workspaces tegelijk open hebben met verschillende kandidaten voor dezelfde opdracht."

*Bron: build spec §4.1 — `POST /jobs/{id}/responses`: "Pre: job.status=open, no existing open Workspace for this job"; product briefing §3.3 — "A client can have multiple Negotiation Workspaces open simultaneously with different candidates."*

## 4. Vakgebied-adresboek, geen social network
`mandatory: true`
> "Contactpersonen worden georganiseerd in een eigen, persoonlijk adresboek, gegroepeerd naar rol (bijv. leveranciers, vakmensen). Een contact toevoegen creëert geen automatische koppeling of zichtbaarheid voor de andere partij, tenzij er al een bestaand GoodCompany-account bij hoort — in dat geval wordt de koppeling automatisch herkend."

*Bron: build spec §4.2 — `POST /contacts`: "Contact(status=unlinked) unless email/phone matches an existing User, in which case status=linked."*

## 5. Persoonlijke Prefer/Avoid-markering
*Interne codenaam: Prefer/Avoid. Functionele naam: **Private Collaboration Preference** — de codenaam blijft handig als interne verwijzing, maar "Avoid" klinkt te snel als een reputatiescore of blacklist. De functionele naam maakt het verschil met Reviews/Trust expliciet: dit is een privévoorkeur, geen oordeel.*
`editable: true`, `mandatory: false`
> "Een gebruiker kan een contact markeren als 'liever niet meer mee samenwerken.' Deze markering is uitsluitend zichtbaar voor en van invloed op de eigen gebruiker — geen blokkade, geen melding richting de andere partij, geen effect op diens reputatie of zichtbaarheid elders op het platform. De markering beïnvloedt hoogstens toekomstige matching-suggesties aan de eigen kant."

*Bron: Decision Confirmed (dit gesprek) — nieuw, geen bestaande bronpassage. Ontstaan uit een herhaaldelijk genoemd feature-gat (eerder onafhankelijk aangeraakt in het Reputation Review Addendum en tijdens het opstellen van deze Codex-set), nu geformaliseerd in plaats van langer als los "later te bekijken"-punt te blijven staan.*

*Bewust géén blokkeer- of meldingsfunctie:* dit is expliciet een puur persoonlijke aantekening, geen sanctie richting de andere partij — vergelijkbaar met hoe een negatieve review al reputatie-effect heeft zonder aparte bestraffingslaag (zie Reputation Review Addendum, Model B). Een blokkeerfunctie zou een tweede, ongereguleerd bestraffingsmechanisme naast het reguliere reviewsysteem creëren.

## Bewust weggelaten / niet van toepassing
- **Contact-gebaseerde outreach/re-engagement** ("we zien dat je lang niet met X hebt samengewerkt, neem contact op") — expliciet MVP1-buiten-scope (build spec §1.2), gepland voor MVP2 met de nadrukkelijke eis "must stay relationship-toned, never discount-spam." Niet vooruitlopend toevoegen.
- **Applicant-flow throttling** (een cap op hoeveel kandidaten een opdrachtgever tegelijk in onderhandeling mag hebben) — genoemd in de MVP2-roadmap (§12), niet in MVP1. Geen clausule hierover totdat dit wordt opgepakt.

## Openstaand na deze set
- **Open decision 10.1** — moeten verlopen `open`-opdrachten automatisch aflopen, of oneindig open kunnen blijven staan? Niet vastgelegd, clausule 2 dekt alleen de handmatige statuswijziging, niet een eventuele automatische timeout.
- ~~Mogelijk duplicaat van de al opgeloste Open decision 10.2~~ — **opgelost (dit gesprek), samengevoegd met 10.2.** Er bestaat geen aparte "kandidaat geselecteerd"-status: de selectie van een kandidaat wordt impliciet gemaakt door het aanbieden van het contract ter ondertekening (`contract_preview`-stage). Geen extra business-event nodig — dit voorkomt een status "geselecteerd maar nog geen contract" en de bijbehorende edge cases (wat als iemand wél selecteert maar nooit een contract verstuurt?). Overige kandidaten blijven "in onderhandeling" tot een contract daadwerkelijk wordt aangeboden of de opdracht wordt gesloten. Build spec §10 kan dit punt uit de "still open"-lijst verwijderen als duplicaat van 10.2.
- ~~Prefer/Avoid-markering op Contacts~~ — **opgelost (dit gesprek), vastgelegd als clausule 5.**
- ~~Zichtbaarheid van het indicatieve budget~~ — **opgelost (dit gesprek), vastgelegd als Decision 10.3 bij clausule 1.** Variant C bevestigd, A en B expliciet verworpen met reden — zie clausule 1 voor de volledige afweging.

## Design Note — architectuurvisie, expliciet géén Codex-clausule
*Dit is een ontwerpfilosofie-aantekening, geen functionele of mandatory clausule. Bewust apart gehouden van de vastgestelde clausules hierboven om niet te suggereren dat de huidige implementatie dit al ondersteunt.*

**Mogelijke platformevolutie:** toekomstige uitbreidingen van GoodCompany kunnen dezelfde transactionele kerncomponenten (identiteit, onderhandeling, contractvorming, escrow, uitvoering, settlement) hergebruiken voor economische interacties buiten reguliere werkcontracten om — bijvoorbeeld een leveranciersmarkt of het Innovation Fund. Dit is een **convergentie die zich mogelijk aftekent**, geen bestaand architectuurprincipe: de Innovation Fund (product briefing §7.4, "investment slots") en de leveranciersrelatie bij Community Bank-leningen (enkele geverifieerde ontvangende partij, geen onderhandelingsmarkt) delen deze cyclus nu nog niet. Vastgelegd als richtinggevende gedachte voor toekomstige architectuurkeuzes, niet als iets om nu tegen te bouwen.
