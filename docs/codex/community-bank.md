# Codex — Community Bank (categorie: Leningaanvraag)

*Inspiratiebron: standaard loan-agreement-structuur (leenbedrag, rentebepaling, terugbetalingsschema, conditions precedent, covenants, default-clausules) — getweaked voor GoodCompany: geen onderpand/zekerheid, geen traditionele kredietbeoordeling; risicomitigatie loopt via community-stemming + reserve-drempel. Cijfermatige waarden 1:1 overgenomen uit build spec §6, niet zelf ontworpen.*

## 1. Leendoel & toegestane categorie
`mandatory: true`
> "De lening wordt uitsluitend verstrekt voor een omschreven zakelijk doel binnen een toegestane categorie ({{Categorie}}: uitrusting, voorraad, transport, of software). Persoonlijke leefkosten zijn nooit een toegestaan bestedingsdoel, ongeacht de omschrijving die de aanvrager geeft."

*Bron: build spec §2.7 — purpose "must map to an allowed category (equipment, inventory, transport, software — never living expenses)".*

## 2. Rentebepaling
`mandatory: true`, `smart-contract-compatible: true`
> "De rente wordt berekend als {{Basisrente}}% per jaar, verhoogd met {{Termijnopslag}}% per periode van zes maanden voorbij een initiële coulanceperiode van twaalf maanden, met een maximale opslag van {{Maximale opslag}}%. De rente wordt automatisch afgeleid uit de gekozen terugbetalingstermijn en is geen onderhandelbaar bedingpunt."

*Regel vastgelegd in build spec §6.3 (`interest_rate = base_rate + term_adjustment`). Actuele waarden (basisrente, termijnopslag, coulanceperiode, maximale opslag) zijn geen onderdeel van deze clausuletekst meer — canonieke bron: **Configuration Registry, parameter `loan_interest_rate`**. Variabelen zijn hier bewust als `{{...}}` gelaten, niet hardcoded — dit is de enige plek waar deze waarde normatief wordt vastgelegd.*

## 3. Community-stemvereiste & steekproef
`mandatory: true`, `smart-contract-compatible: true`
> "Deze aanvraag wordt beoordeeld door een willekeurig geselecteerde steekproef van {{Steekproefgrootte}} stemgerechtigde leden, geworven totdat {{Benodigde stemmen}} stemmen zijn uitgebracht. Goedkeuring vereist een meerderheid van minimaal {{Drempelpercentage}}% vóór, binnen een termijn van {{Stemtermijn}} dagen na de eerste uitnodiging. Wordt dit aantal stemmen niet binnen de termijn behaald, dan vervalt de aanvraag automatisch."

*Regel vastgelegd in build spec §6.2. Actuele waarden (steekproef-tiers, audience-multiplier, drempelpercentage, stemtermijn) zijn geen onderdeel van deze clausuletekst meer — canonieke bronnen: **Configuration Registry, parameters `required_votes_tiers`, `audience_multiplier`, `community_loan_approval_threshold`, `community_vote_duration`**. De multiplier is daar expliciet gemarkeerd als Illustrative Default (Open decision 10.12) — deze clausule verwijst dus automatisch naar de op dat moment geldende waarde, niet naar een vast getal.*

## 4. Reserve-drempelvoorwaarde
`mandatory: true`
> "Ongeacht een positieve stemuitslag wordt geen enkele lening geactiveerd zolang de Credit Reserve zich onder de minimumdrempel van {{Minimumdrempel}}% van de streefwaarde bevindt. Deze voorwaarde beschermt de coöperatie tegen het in financiële problemen brengen van zichzelf en is niet onderhandelbaar per individuele aanvraag."

*Regel vastgelegd in build spec §6.1 (Safety Reserve minimum threshold) en §4.8 (activatie vereist "reserve stays above min_threshold" bovenop de stemuitslag). Actuele waarde is geen onderdeel van deze clausuletekst meer — canonieke bron: **Configuration Registry, parameter `safety_reserve_threshold`.***

## 5. Leverancier-verificatie & directe uitbetaling
`mandatory: true`
> "De leensom wordt niet aan de aanvrager zelf uitgekeerd, maar rechtstreeks aan de geverifieerde leverancier ({{Leverancier}}) via een gekoppelde SubEscrow-rekening. De leverancier dient te beschikken over een geverifieerd GoodCompany-account voordat de aanvraag in behandeling wordt genomen."

*Bron: build spec §2.7 — LoanApplication vereist `supplier_id → User`, "supplier must have a GC account"; §4.8 — activatie creëert SubEscrow richting leverancier, niet richting aanvrager.*

*Expliciete rationale (nieuw, ter verduidelijking, geen inhoudelijke wijziging): dit mechanisme bestaat niet alleen als betaalgemak, maar als fraudebarrière — de aanvrager kan geleend geld nooit als contant bedrag ontvangen, alleen laten toekomen aan een derde partij binnen het platform. Dat maakt het onmogelijk om een leendoel voor te wenden (bijv. "bedrijfsauto") terwijl het geld feitelijk voor leefkosten wordt gebruikt. Samenspanning met een bevriende leverancier (die het bedrag vervolgens alsnog contant teruggeeft) is een resterend risico dat hiermee niet wordt opgelost — zie "Nog niet uitgewerkt, bewust later" onderaan dit document.*

## 8. Vervroegde aflossing
`mandatory: true`
> "Vervroegde (gedeeltelijke of volledige) aflossing van de lening is te allen tijde toegestaan en wordt niet bestraft met een boete of extra kosten. Vervroegde aflossing vermindert de nog verschuldigde rente naar rato."

*Bron: nieuw vastgelegde productbeslissing (dit gesprek) — niet uit de build spec overgenomen, want die noemt vervroegde aflossing nergens. Expliciete onderbouwing van de product owner: GoodCompany is geen winst-op-rente-model maar een faciliterende coöperatie; sneller aflossen is goed voor zowel de lener (minder rente) als de gezondheid van de Community Bank-reserves. **Actie: dit moet nog worden toegevoegd aan build spec §6.3 zelf — momenteel staat daar geen prepayment-regel.**

## 6. Terugbetaling & wanbetaling
`mandatory: true`
> "Terugbetaling vindt plaats volgens het overeengekomen aflossingsschema over {{Terugbetalingstermijn}} maanden. Bij uitblijven van (voldoende) terugbetaling kan de lening handmatig als wanbetaling ({{Status: defaulted}}) worden aangemerkt; dit vermindert de Credit Reserve en werkt door in de Community Health Score van de aanvrager. Er is geen geautomatiseerde default-detectie in deze versie van het platform."

*Bron: build spec §3.5 (status-flow active → defaulted, "manual trigger") en §8.4 ("No automated default detection. Manual conversion to defaulted, reduces Credit Reserve, feeds Community Health Score").*

## 7. Geïnformeerde inschatting, geen onderbouwde garantie
`editable: true`, `mandatory: false`
> "De door de aanvrager opgegeven verwachte inkomsten ({{Verwacht bedrag}}) dienen ter informatie en worden niet geverifieerd of gegarandeerd door GoodCompany. Deze schatting vormt geen voorwaarde voor goedkeuring en heeft geen bindende juridische status."

*Bron: build spec §2.7 — `projected_income` is "applicant-provided, informational only, not validated". Optioneel/editable omdat dit puur een transparantie-disclaimer is, geen kernvoorwaarde — in tegenstelling tot clausules 1-6 die direct platformmechanismen vastleggen.*

## Bewust weggelaten t.o.v. standaard loan-agreement-structuur
- **Onderpand/zekerheid ("collateral"/"security agreement")** — GoodCompany's model kent geen zekerheidsstelling op bezit; risicomitigatie loopt volledig via community-stemming (clausule 3) en de reserve-drempel (clausule 4). Opnemen zou een verkeerd verwachtingspatroon scheppen.
- **Persoonlijke garantstelling door derden ("guarantee")** — niet aanwezig in de build spec, geen equivalent mechanisme.
- **Prepayment penalty** — niet genoemd in de build spec; geen aanwijzing dat vervroegd aflossen wordt ontmoedigd of bestraft. Niet toevoegen totdat dit expliciet als productbeslissing wordt vastgelegd.
- **Covenants (affirmative/negative)** in de klassieke zin (bijv. verplichte periodieke financiële rapportage) — geen equivalent in de build spec; GoodCompany's "rapportage" loopt via de Community Health Score-snapshot, niet via aanvrager-verplichtingen. Zou een nieuw mechanisme zijn, geen bestaande spec-waarde — dus niet als mandatory clausule opnemen zonder productbeslissing.

## Openstaand na deze set
- Interest_rate-clausule (2) en steekproef-clausule (3) bevatten waarden die de build spec zelf als "illustrative defaults, not validated" markeert (Open decision 10.12 voor de multiplier; geen open-decision-nummer voor de rente, maar wel [DEFAULT]-gelabeld). Bij een toekomstige waarde-wijziging moet de clausuletekst het configurabele karakter behouden — niet alsnog hardcoden.
- Geen clausule ontworpen voor de repayment-schedule-details zelf (frequentie/bedrag per termijn) — de build spec noemt dit als bestaand veld (`repayment_term_months`) maar specificeert geen aflossingsvorm (annuïtair vs. lineair vs. anders). Open vraag, niet in build spec beantwoord, expliciet uitgesteld door de product owner.
- **Spec-afwijking gesignaleerd, nog niet doorgevoerd:** de product owner stelt een geautomatiseerde missed-payment-watchmodule voor (automatische notificatie bij gemiste termijn, escalatie naar community-herbeoordeling bij uitblijven van actie binnen een bepaalde termijn, mogelijkheid tot vroegtijdige beëindiging en juridische stappen). Dit **staat haaks op build spec §8.4**, die momenteel expliciet zegt: "No automated default detection. Manual conversion to defaulted." Dit is dus geen verduidelijking van clausule 6 maar een voorstel tot wijziging van een bestaande MVP1-scopekeuze — moet als apart open decision worden gelogd (en eventueel in build spec §8.4 zelf worden herzien) vóórdat het in een clausule wordt vastgelegd, niet stilzwijgend meegenomen.

## Architectuurspanning, nog open (geen Codex-clausule, geen "later"-ideetje — structureel spanningspunt)
**Handmatige default-detectie (§8.4) schaalt niet naar GoodCompany's beoogde platformomvang.** Build spec §6.2 noemt zelf expliciet dat de gerichte-steekproefaanpak is ontworpen met het oog op "potentially millions of users" — diezelfde schaaloverweging is nooit toegepast op §8.4, dat voor MVP1 bewust simpel is gehouden ("No automated default detection. Manual conversion to defaulted."). Bij groei van het aantal actieve leningen wordt handmatige monitoring van elke lopende terugbetaling een personeelsintensief proces dat niet meeschaalt — vergelijkbaar in aard met de twee eerder gevonden architectuurgaten (Change Order "wrong amount"-risico; garantiedekking), alleen is dit gat nog niet dichtgetimmerd.

**Status: bewust uitgesteld naar MVP2/MVP3, niet naar MVP1.** De product owner heeft expliciet bepaald dat MVP1 lichtgewicht blijft op dit punt (conform §8.4 zoals het nu staat) en dat automatische escrow-transactiemonitoring — met verplichte reden-logging per uitgaande betaling naar de Community Bank, plus een eventueel escalatiepad naar community-herbeoordeling bij uitblijvende actie — een uitwerkingsonderwerp is voor een latere MVP-fase, niet voor nu.

**Wat hier NIET gebeurt, expliciet:** dit wordt geen Codex-clausule (zelfs niet als "non-binding" gelabeld) — een clausule naast de zeven mandatory clausules hierboven zou dezelfde autoriteit suggereren als vastgesteld beleid, terwijl dit uitdrukkelijk nog niet ontworpen is. Zodra dit voor een latere MVP-fase wordt opgepakt, hoort het eerst als formeel open decision in de build spec te landen (zoals 10.12 voor de multiplier), pas daarna als Codex-clausule.

## Nog niet uitgewerkt, bewust later (expliciet door product owner uitgesteld)
- **Samenspanning met bevriende leverancier** — een leverancier die het uitgekeerde bedrag alsnog contant teruggeeft aan de aanvrager, ondanks het "geen cash in hand"-mechanisme (clausule 5). Mogelijk mitigeerbaar via leverings-/acceptatiebewijs, nog niet uitgewerkt.
- **Reputatie-penalty en tijdelijke uitsluiting bij bewezen fraude** — bijv. profielnotificatie + uitsluiting van leningaanvragen voor een vaste periode (genoemd: mogelijk twee jaar) bij niet kunnen aantonen van legitiem gebruik van het geleende bedrag. Geen build-spec-tegenhanger, nieuw te ontwerpen mechanisme.
- **Periodieke rapportage-covenant voor lopende leningen** — alleen voor aanvragers met een openstaande lening, om terugbetalingscapaciteit periodiek te herbevestigen. Vergelijkbaar met klassieke loan-agreement-covenants (zie eerder afgewezen sectie), maar nu voorgesteld als toekomstige, beperktere versie — nog geen productbeslissing.
