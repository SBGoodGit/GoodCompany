# GoodCompany Implementation Registry v1

*Bevat technische implementatiekeuzes, gescheiden van de Codex (regels en principes) en de Configuration Registry (instelbare waarden). Een technische keuze kan veranderen zolang de onderliggende productgarantie behouden blijft — zie sectie 6.*

**Statuscategorieën:**

| Status | Betekenis |
|---|---|
| Confirmed | Vastgelegde implementatiekeuze voor de betreffende release |
| Directional | Architectuurvoorkeur/richting; de daadwerkelijke implementatiekeuze blijft bij engineering |
| Open Decision | Nog geen keuze gemaakt |
| Deprecated | Eerdere keuze, niet meer actief |

---

## 1. Identity & Trust Layer

| Component | Implementatie | Status | Bron | Opmerking |
|---|---|---|---|---|
| Self-Sovereign Identity framework | Hyperledger Identus | Confirmed | Build Spec §1.1 | MVP1-specifieke keuze — overschrijft de voorwaardelijker formulering in Product Briefing §9 |
| Overheidsidentificatie | DigiD | Confirmed | Build Spec §1.1 | Onderdeel van de "bare" identiteitslaag, geen volledige AVI |
| SSI-architectuurprincipe | Selective disclosure / SSI-model | Confirmed | Whitepaper §5.2 | *Nog niet verwijzend naar Core Design Principles, want dat document bestaat nog niet — bij te werken zodra dat er is* |

## 2. Blockchain / Settlement Layer

| Component | Implementatie | Status | Bron | Opmerking |
|---|---|---|---|---|
| Publieke verificatielaag | Cardano | Directional | Whitepaper / Product Briefing §9 / Build Spec §5 | Architectuurrichting, geen MVP1-bindende keuze |
| Private rekenlaag | Midnight | Directional | Whitepaper / Product Briefing §9 / Build Spec §5 | Privacydoel staat vast, technologie niet |
| Smart contract-framework | Plutus | Directional | Whitepaper | Technische voorkeur, geen harde implementatie-eis |

**Vast (productgarantie):** publieke/verifieerbare gebeurtenissen moeten controleerbaar zijn; privacygevoelige data moet afgeschermd blijven; smart contracts mogen afspraken afdwingen.

**Niet vast (technische vrijheid):** welke blockchain, welke smart contract-taal, welke L2/private-executietechnologie.

## 3. Payment Infrastructure

| Component | Implementatie | Status | Bron | Opmerking |
|---|---|---|---|---|
| Betaalprovider | **Mollie (MVP1)** — DNB-gelicentieerde e-money instelling, kandidaten Stripe Connect/andere PSD2-providers blijven beschikbaar voor latere internationale uitbreiding | Confirmed (MVP1); Directional (toekomstige providers) | Decision Confirmed (dit gesprek); build spec §6.8, Open decision 10.11 nu gesloten | Rationale: primaire markt Nederland/EU, optimale iDEAL-ondersteuning, minimale technische complexiteit. **Mollie ondersteunt de benodigde payout-timing voor MVP1 binnen de bestaande Warranty/Holdback-termijnen** — de contractuele escrow-/holdback-logica blijft volledig eigendom van GoodCompany, vastgelegd in de Codex/addenda, niet bij de provider. Mollie levert geen escrow-licentie; het is de payout-control die de gewenste workflow ondersteunt, niet een door Mollie geleverd escrowmechanisme. **Architectuurregel — verplichte abstractielaag:** GoodCompany's Payment Service Layer abstraheert de provider; de code roept nooit rechtstreeks de Mollie-API aan, maar een Payment Service met een Mollie-adapter (MVP1) ernaast toekomstige adapters voor Stripe Connect of andere PSP's, om vendor lock-in te voorkomen. |
| Settlement Currency (MVP1) | EUR | Confirmed | Configuration Registry, `currency_scope` | Releasebeperking, geen architectuurkeuze — zie Core Design Principles |
| FX Conversion | Niet ondersteund in MVP1 | Directional (MVP2+) | Nieuw, dit gesprek — geen bestaande bronpassage | Toekomstig model: lokale valuta → settlement-valuta → lokale valuta, transparant voor beide partijen |
| Cross-border Payments | Niet ondersteund in MVP1 | Directional (MVP2+) | Nieuw, dit gesprek | Volgt uit FX Conversion hierboven |
| Settlement-stablecoin (MVP2+) | **Nog niet gekozen — bewust.** Kandidaten genoemd: USDM, USDA, USDR, RLUSD. | Open Decision | Nieuw, dit gesprek | **Expliciet niet vastpinnen op één specifieke stablecoin nu** — dit is een implementatiekeuze, niet een architectuurbeslissing. De garantie ("een stabiele settlement-valuta voor internationale transacties bestaat") staat los van welke specifieke munt dat wordt, consistent met "Technology Serves Guarantees, Not the Reverse." |

## 4. Storage Layer

| Component | Implementatie | Status | Bron | Opmerking |
|---|---|---|---|---|
| Documentopslag | TBD | Open Decision | Geen — geen bestaande spec-vermelding | Moet voldoen aan privacy- en beschikbaarheidseisen (GDPR, zie Build Spec §7.2); geen enkele kandidaat-technologie tot nu toe genoemd in enige bron |

## 5. Notification Layer

| Component | Implementatie | Status | Bron | Opmerking |
|---|---|---|---|---|
| Contact-uitnodigingskanaal (MVP1) | E-mail | Confirmed | Build Spec §6.9 | Kanaalkeuze, laagste integratiekosten |
| Uitbreiding (SMS/WhatsApp) | TBD | Open Decision | Build Spec §6.9, Open decision 10.15 | Aanbeveling in de bron zelf: eerst SMS toevoegen vóór WhatsApp, indien/wanneer een tweede kanaal gerechtvaardigd is |

---

## 6. Development Boundary Rules

*Waarom dit onderscheid ertoe doet: GoodCompany's architectuur is bewust zo opgezet dat de productgarantie losstaat van de technologie die 'm realiseert. Dit voorkomt technologie-lock-in.*

| Productgarantie | Technische vrijheid |
|---|---|
| Identiteit moet betrouwbaar en herbruikbaar zijn | SSI-provider kan wijzigen |
| Publieke acties moeten verifieerbaar zijn | Blockchain kan wijzigen |
| Privédata moet beschermd blijven | Privacytechnologie kan wijzigen |
| Afspraken moeten automatisch afdwingbaar zijn | Smart contract-platform kan wijzigen |

---

## Decision Authority (in plaats van een Owner-kolom, zoals bij de Configuration Registry)

*Bij technologiekeuzes gaat het niet om wie een waarde mag wijzigen, maar om wie de uiteindelijke architectuurkeuze mag maken. Ook dit is een voorgestelde indeling, geen bestaande, formeel ingestelde structuur.*

| Component | Decision Authority (voorgesteld) |
|---|---|
| SSI | Product Architecture |
| Blockchain | Technical Architecture |
| Payment provider | Business + Compliance |
| Storage/Hosting | Engineering |
| Notification-kanalen | Product + Engineering |

---

## Documentatiestructuur, ter referentie

- **Core Design Principles** → waarom bestaat het systeem zo?
- **Codex** → welke regels gelden?
- **Build Spec** → hoe wordt de huidige versie gebouwd? (verwijst naar de twee registries hieronder voor actuele waarden/keuzes)
- **Configuration Registry** → welke waarden kunnen veranderen?
- **Implementation Registry** (dit document) → welke technologie realiseert dit?

*Herzien: de registries hangen niet als vervolgstap ná de Build Spec, maar zijn ondersteunende naslagdocumenten waar de Build Spec zelf naar verwijst — zie Core Design Principles §7 voor het volledige diagram.*
