# Codex — Payment / Bank Coupling (categorie: Voorwaarden/Systeem)

*Inspiratiebron: standaard PSD2/onramp-offramp-veiligheidsprincipes (nooit ruwe bankgegevens opslaan, provider-tokens, step-up-authenticatie) — grotendeels branchestandaard, geen externe clausuletekst-bron nodig zoals bij de Community Bank. Waarden 1:1 uit build spec §4.7, §6.8, §7.1, §7.2, §8.7, glossary.*

## 1. Geen opslag van bankgegevens
`mandatory: true`
> "GoodCompany slaat nooit rekeningnummers, IBAN's of bankgegevens rechtstreeks op. In plaats daarvan wordt uitsluitend een door een gelicentieerde betaalprovider afgegeven referentietoken bewaard (BankLink)."

*Bron: build spec §7.1 — "Raw bank credentials/IBANs are never stored directly — only provider reference tokens"; glossary — BankLink "held via a licensed payment provider — never raw IBAN/credentials."*

## 2. Verificatie vóór gebruik
`mandatory: true`
> "Voordat geld gestort of opgenomen kan worden, moet de bankkoppeling eerst geverifieerd zijn via de betaalprovider. Een niet-geverifieerde koppeling kan niet worden gebruikt voor funding of uitbetaling."

*Bron: build spec §4.7 — `POST /bank-links`: "initiate provider-hosted bank verification flow. Effect: BankLink(status=pending) → provider webhook flips to verified"; `POST /funding-requests` "Pre: verified BankLink."*

## 3. Step-up-authenticatie bij uitbetaling
`mandatory: true`
> "Elke actie die geld richting de gebruiker beweegt (uitbetaling) vereist een aanvullende, directe herauthenticatie op het moment zelf — ook binnen een reeds ingelogde sessie."

*Bron: build spec §7.1 — "All escrow-moving and payout-moving actions require step-up (re-)authentication"; glossary — "Step-up auth: Re-authentication immediately before a sensitive action, even within an already-logged-in session."*

## 4. Geen synchrone garantie bij geldbeweging
`mandatory: true`, `smart-contract-compatible: true`
> "Een storting of uitbetaling wordt pas als definitief beschouwd na bevestiging via een asynchrone melding van de betaalprovider — nooit alleen op basis van een directe (synchrone) systeemreactie. Een mislukte uitbetaling laat het saldo van de gebruiker nooit in een onduidelijke tussentoestand; het geld verlaat de GoodCompany-omgeving nooit bij een mislukte poging."

*Bron: build spec §4.7 — "Provider webhooks update FundingRequest/PayoutRequest status asynchronously — never trust a synchronous response alone for money movement"; §8.7 — "funds never leave GC custody on a failed attempt", mislukte PayoutRequest keert terug naar `initiated` voor een nieuwe poging.*

## 5. Platformrisico-detectie, geen AML-verantwoordelijkheid
`mandatory: true`
> "GoodCompany kan ongebruikelijke betaalpatronen intern signaleren ter bescherming van het platform en ter ondersteuning van fraudeonderzoek. Dit staat los van de wettelijke AML/KYC-verantwoordelijkheden van de gelicentieerde betaalprovider."

*Bron: build spec §7.2 — "the provider carries the regulated-payment-institution burden, but GoodCompany still needs basic AML-awareness (e.g. flagging unusually large or frequent payouts)." Herformulering (dit gesprek) t.o.v. de eerdere versie, om te voorkomen dat GoodCompany onbedoeld een wettelijke AML-verantwoordelijkheid claimt die feitelijk bij de PSP ligt — subtiel maar juridisch relevant onderscheid.*

## Bewust weggelaten / niet van toepassing
- **Multi-currency-ondersteuning** — expliciet buiten scope, EUR-only voor MVP1 (build spec §10.4, nog te bevestigen als Open decision maar consistent overal in de spec toegepast).
- **Rentevergoeding op geparkeerd saldo** — zelfde als eerder genoteerd bij de Escrow/Milestone-set, niet van toepassing, geen aanwijzing hiervoor in de spec.

## Openstaand na deze set
- ~~Open decision 10.11 — geen betaalprovider gekozen~~ — **opgelost (dit gesprek). Mollie geselecteerd als MVP1 Payment Service Provider.** Zie Implementation Registry voor de volledige rationale en de verplichte Payment Service-abstractielaag (nooit rechtstreeks een providerspecifieke API aanroepen, altijd via een adapter — zodat Stripe Connect of andere PSD2-providers later kunnen worden toegevoegd voor internationale uitbreiding zonder herontwerp).

**Juridische precisie, belangrijk voor clausule 1 hierboven:** Mollie levert geen escrow-licentie. Mollie faciliteert betalingen en uitgestelde uitbetalingen (tot 90 dagen) — de contractuele escrow-/holdback-logica zelf (wie krijgt wanneer wat, onder welke voorwaarden) blijft een GoodCompany-mechanisme, vastgelegd in de Escrow/Milestone-Codex en het Warranty/Holdback Addendum, niet bij de provider. Dit onderscheid moet in geen enkele toekomstige tekst (marketing, UI, juridische documenten) worden vervaagd tot "Mollie biedt escrow."
- **Open decision 10.4 — EUR-only-scope nog formeel te bevestigen** (impliciet overal aangenomen, nooit expliciet als afgeronde beslissing vastgelegd in build spec §10's "resolved"-lijst).
