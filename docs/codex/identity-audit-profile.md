# Codex — Identity, Audit, Profile & Dispute-mediatorprocedure (categorie: Voorwaarden/Systeem)

*Inspiratiebron: grotendeels eigen aan GoodCompany's architectuur (SSI/Identus, Case-audittrail, hired-mediator-principe) — weinig externe tweak nodig, want dit zijn platformmechanismen, geen contractuele onderhandelingsclausules. Waarden 1:1 overgenomen uit build spec §1.1/§1.2/§8.2, whitepaper §5.2.*

## 1. Identiteitsverificatie — bare laag voor MVP1
`mandatory: true`
> "Elke gebruiker verifieert zijn identiteit via een basale Self-Sovereign Identity-laag (Hyperledger Identus) in combinatie met DigiD. Dit betreft een minimale verificatie, geen volledige geattesteerde identiteitscontrole — periodieke herattestatie en gelaagde back-upverificatie zijn nog niet onderdeel van dit platformniveau."

*Bron: build spec §1.1 — "Identity: bare Hyperledger Identus + DigiD... not full AVI"; §1.2 — "Full AVI (six-month re-attestation, three-tier backup, etc.) — MVP 1 ships a bare identity layer only" expliciet buiten scope.*

*Let op: dit is een bewuste scope-beperking, geen weggelaten feature bij vergissing — niet aanvullen met AVI-achtige verplichtingen totdat dat expliciet wordt opgepakt (zie build spec §12, MVP2+).*

## 2. Onveranderlijk audit-dossier per contract
`mandatory: true`, `smart-contract-compatible: true`
> "Voor elk contract wordt, in elke fase, een volledig en onveranderlijk dossier bijgehouden: communicatie, versies van de voorwaarden, offertes, mijlpaalgoedkeuringen, en eventuele heronderhandelingen. Dit dossier is te allen tijde inzichtelijk voor beide contractpartijen."

*Bron: build spec (whitepaper §5.1/§6, product briefing §4) — "For every contract, in every state, the full history must be reviewable: communication, versions of the terms of engagement, quotes, milestone approvals, and any renegotiations (audit view)." Audit trail is een append-only logstructuur, gekoppeld aan elk contract.*

*Let op: volledige export-/compliance-tooling rond dit dossier is expliciet MVP1-buiten-scope (build spec §1.2 — "Full audit/compliance export tooling"). Deze clausule dekt het bestáán en de inzichtelijkheid van het dossier, niet exporteerbaarheid naar externe systemen.*

## 3. Profiel als portfolio
`mandatory: true`
> "Elke gebruiker heeft een profiel dat functioneert als een mini-portfoliowebsite: bedrijfs- of persoonlijke beschrijving met vakgebied-tags, een portfolio van eerder voltooide projecten, ontvangen beoordelingen en aanbevelingen van eerdere opdrachtgevers, en statistieken (aantal voltooide projecten, tevredenheidspercentage, gemiddelde reactietijd)."

*Bron: product briefing §6 — "Every user has a profile that functions as a mini portfolio website"; build spec §9 (Profile-scherm: edit profile, public profile view, portfolio management, reviews list).*

*Let op: gamification-achtige badges/achievements zijn expliciet MVP1-buiten-scope (build spec §1.2). Deze clausule dekt alleen de feitelijke portfolio-/reviewweergave, geen badge-systeem.*

## 4. Vakgebied-gefilterd zoeken
`editable: true`, `mandatory: false`
> "Bij het zoeken naar opdrachten kan een gebruiker de zoekresultaten standaard beperken tot het eigen vakgebied, gebaseerd op de tags in het eigen profiel. Deze beperking staat standaard aan, maar kan handmatig worden uitgeschakeld om breder te zoeken."

*Bron: product briefing §5 — checkbox "Search only within my expertise", "enabled by default, but can be manually disabled." Optioneel/editable omdat dit een gebruikersinstelling is, geen contractuele verplichting.*

## 5. Dispuutprocedure — verplichte, professionele mediator (MVP1-interim)
`mandatory: true`
> "Bij een gemeld geschil wordt de escrow onmiddellijk bevroren en het geschil doorgezet naar een onafhankelijke, professionele mediator. Deze rol wordt uitsluitend vervuld door een ingehuurde, onafhankelijke professional — nooit door een community-lid of gekozen peer-rol. Er is geen zelfhulp- of escalatietrap vooraf: elk gemeld geschil gaat rechtstreeks naar de mediator."

*Bron: build spec §8.2 — "Either party flags a contract for manual review → freeze() on escrow → support ticket created outside the platform for a human mediator. This role is always a hired, independent professional mediator — never a community-elected or peer role, by deliberate design: someone from within the community carries the same risk of emotional or relational bias that made the dispute happen in the first place." Expliciet bevestigd in §10 als reeds afgeronde beslissing tijdens scoping.*

*Belangrijke samenhang met het Reputation Review Addendum: dit bevestigt achteraf de keuze om Model A (community reviewpool) voor reputatie-downgrades te verwerpen — het platform hanteert consequent hetzelfde principe (nooit een community-/peer-rol als formele beoordelaar bij iets met reputationele of financiële gevolgen), nu voor het tweede keer onafhankelijk bevestigd.*

*Let op: "geen escalatietrap vooraf" is een bewuste MVP1-vereenvoudiging, expliciet gemarkeerd als niet-schaalbaar op langere termijn (build spec §8.2: "This is a deliberate simplification that will not scale past low dispute volumes"). Zie build spec §12 (MVP2: self-service laag + AI/ML-suggestie vóór escalatie). Niet in deze clausule oplossen — dat is een apart, toekomstig traject.*

## 6. Mediator gefinancierd uit platformvergoeding
`mandatory: true`
> "De kosten van professionele mediation zijn inbegrepen in de platformvergoeding van 2% — er zijn geen aparte, per-geschil-kosten voor de partijen bovenop deze vergoeding, tenzij expliciet anders overeengekomen."

*Bron: build spec §8.2 — "The 2% platform fee is explicitly understood to fund this professional-mediation guarantee, alongside insurance/legal cover."*

## Bewust weggelaten / niet van toepassing
- **Volledige AVI-identiteitsverificatie** (herattestatie, gelaagde back-up) — expliciet MVP1-buiten-scope, niet vooruitlopend toevoegen.
- **Community-based of peer-mediatie in welke vorm dan ook** — structureel uitgesloten door ontwerp, niet alleen voor MVP1 maar als doorlopend principe (zie samenhang met Reputation Review Addendum hierboven).
- **Achievements/badges-gamification** — expliciet MVP1-buiten-scope.
- **Contacts-gebaseerde outreach/re-engagement** — expliciet MVP1-buiten-scope (build spec §1.2); niet verwarren met de eerder genoteerde "vermijd dit contact"-featuregat uit het Reputation Review Addendum, dat een ander (nog niet opgepakt) punt is.

## Openstaand na deze set
- Geen nieuwe open decisions geïdentificeerd in dit blok — dit is het meest "af" onderdeel van de Codex tot nu toe, grotendeels omdat build spec §10 deze beslissingen zelf al als "resolved during scoping" markeert.
- Kleine samenhang-check nog te doen: de Dispute-categorisatie (Deliverable/Milestone/Quality/Scope/Warranty/Change Order, zie Codex-handoffbriefing) bevat geen aparte categorie voor "geschil zonder onderliggende contractkwestie" — maar dat bleek bij de Reputation Review Addendum niet nodig, omdat Model B geen appeal-categorie meer vereist. Geen actie nodig, alleen ter bevestiging genoteerd.
