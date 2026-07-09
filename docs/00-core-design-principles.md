# GoodCompany Core Design Principles v1

*Verklaart waarom de regels in de Codex bestaan. Dupliceert bewust geen regels (Codex), waarden (Configuration Registry) of technologiekeuzes (Implementation Registry) — dit document legt uit "waarom", de andere lagen leggen vast "wat" en "hoe". Zie sectie 7 voor de volledige documentatiehiërarchie (herzien: Build Spec verwijst náár de registries, hangt er niet onder).*

**Statuscategorieën:**

| Status | Betekenis |
|---|---|
| Confirmed | Direct herleidbaar naar een expliciete bronpassage (letterlijk of vrijwel letterlijk geciteerd) |
| Confirmed (Derived) | Niet letterlijk zo geformuleerd, maar rechtstreeks afgeleid uit meerdere vastgelegde ontwerpkeuzes |
| Decision Confirmed | Nieuw besloten tijdens een sessie met de product owner — geen bestaande bronpassage, wel een bewuste, definitieve keuze. Consistent met dezelfde status in Configuration Registry/Implementation Registry. |
| Proposed | Nog geen bevestiging, ter overweging |

**Bronconventie:** waar relevant wordt onderscheid gemaakt tussen *Primary source* (waar iets oorspronkelijk is vastgelegd: whitepaper, build spec, product briefing, addendum), *Derived from/Uitwerking* (waar de praktische toepassing staat: Configuration Registry, Implementation Registry, Codex), en *See also* (overige, niet-primaire verwijzingen). Dit voorkomt dat een afgeleid document ongemerkt dezelfde autoriteit krijgt als de oorspronkelijke bron.

---

## 1. Purpose Statement

*Ter verduidelijking: dit is een doelverklaring, geen Principle — niet te toetsen zoals de Foundational Principles hieronder.*

GoodCompany bestaat om onafhankelijke werkers (zzp'ers, kleine ondernemers) toegang te geven tot betalingszekerheid, betaalbare financiering, en juridische bescherming — zaken die traditioneel voorbehouden zijn aan grotere organisaties met bestaande kredietgeschiedenis en juridische middelen. *(Bron: whitepaper §2, "Independent workers absorb financial risk that larger organisations would never accept"; product briefing §1.1.)*

## 2. Foundational Principles — niet-onderhandelbaar

| Principe | Betekenis | Status | Bron |
|---|---|---|---|
| Terms before Money | Geen financiële transactie zonder vooraf vastgelegde voorwaarden, afspraken en verantwoordelijkheden | Confirmed | Product Briefing §1.2 |
| Escrow before Execution | Middelen worden veiliggesteld voordat verplichtingen worden uitgevoerd — niet alleen vóór vrijgave, maar vóór het starten van de uitvoering zelf | Confirmed | Build Spec §4.4, Codex Escrow/Milestone clausule 1 ("Uitvoering... start niet vóórdat het volledige offertebedrag... in escrow is gestort") |
| Verifiable by Design, Private by Default | Publieke controle blijft mogelijk waar nodig; privacygevoelige data blijft afgeschermd, tenzij verificatie vereist | Confirmed (Derived) — vervangt de eerder overwogen en verworpen formulering "Transparency by default" | Whitepaper §5.1 (dual-layer Cardano/Midnight-scheiding), §5.2 (selective disclosure) |
| Identity Once, Reuse Everywhere | Een gebruiker verifieert zijn identiteit één keer en hergebruikt deze verificatie binnen het ecosysteem | Confirmed | Whitepaper §5.2, §9 ("can use the same identity in P3 without re-verifying") |
| One Review per Completed Contract | Elke afgeronde opdracht resulteert in precies één wederzijdse evaluatie per partij | Confirmed | Build Spec §4.6, Reputation Review Addendum |
| Technology Serves Guarantees, Not the Reverse | Productgaranties (bijv. "publieke acties zijn verifieerbaar") liggen vast; de technologie die dit realiseert blijft vervangbaar | Confirmed (Derived) — verplaatst vanuit Architectural Principles: dit is een van de meest onderscheidende ontwerpkeuzes van GoodCompany, verklaart waarom Cardano/Midnight niet bindend zijn en waarom de Implementation Registry bestaat | Primary source: Build Spec §5. See also: Implementation Registry §6 |

## 3. Architectural Principles — hoe het systeem gebouwd wordt

| Principe | Betekenis | Status | Bron |
|---|---|---|---|
| Data Minimisation over Data Accumulation | Alleen strikt noodzakelijke gegevens worden bewaard/gedeeld | Confirmed | Build Spec §7.2 |
| Rules are Deterministic, Parameters are Configurable | De onderliggende regel verandert nooit zonder architectuurwijziging; de waarde erachter kan wél worden bijgesteld | Confirmed | Primary source: Build Spec ("Defaults are marked [DEFAULT — CONFIGURABLE]"). Uitwerking: Configuration Registry |
| Human-first, Automation-second | Automatisering ondersteunt menselijke samenwerking, maar vervangt geen menselijke beoordeling waar context en vertrouwen nodig zijn | Proposed | Geen directe bronpassage — sluit aan bij het "altijd een ingehuurde, onafhankelijke mediator, nooit geautomatiseerde peer-beoordeling"-patroon (Codex Identity/Audit clausule 5), maar is zelf niet letterlijk zo vastgelegd |
| Smart Contracts Enforce Agreements, Not Replace Judgement | Smart contracts bewaken afspraken en voeren ze uit, maar vervangen geen menselijke besluitvorming bij geschillen | Proposed | **Teruggezet naar Proposed — eerder abusievelijk als Confirmed voorgesteld zonder bronvondst. Geen citaat gevonden dat dit letterlijk zo stelt; wel consistent met het bestaande principe dat de mediator, niet een smart contract, geschillen beslecht (Build Spec §8.2)** |
| Modular Architecture over Platform Lock-in | Componenten zijn losstaand vervangbaar zonder de kernarchitectuur te herbouwen | Proposed | Geen directe bronpassage — impliciet zichtbaar in de Codex/Configuration/Implementation-scheiding zelf, niet expliciet als principe uitgesproken in build spec of whitepaper |

## 4. Economic Principles — waardestromen en incentives

| Principe | Betekenis | Status | Bron |
|---|---|---|---|
| Community Capital Should Circulate, Not Accumulate | Het economische model is gericht op circulatie van waarde binnen de gemeenschap (leningen, herinvestering), niet op ophoping | Confirmed (Derived) | Whitepaper §4.3 ("cooperative contribution that members benefit from directly"); formulering is een samenvatting, geen letterlijk citaat — inhoudelijk goed gedekt door het reserve-/uitleenmechanisme |
| Platform Fee Funds Shared Infrastructure, Not Profit Extraction | De 2%-fee financiert de Community Bank, mediation, en een minimale organisatiereserve — geen aandeelhoudersrendement | Confirmed | Build Spec §6.1, Appendix A |
| Currency is an Implementation Choice, Not a Fundamental Constraint | GoodCompany ondersteunt in visie lokale economieën én internationale samenwerking; welke valuta wordt afgehandeld is een configuratie-/implementatiekeuze, geen architectuurbeperking | Decision Confirmed (dit gesprek) | Geen bestaande bronpassage — nieuw principe, direct gekoppeld aan "Technology Serves Guarantees, Not the Reverse" (Foundational) en "Modular Architecture over Platform Lock-in" (Proposed, Architectural). MVP1's EUR-only-keuze is een releasebeperking onder dit principe, geen permanente ontwerpkeuze — zie Configuration Registry (`currency_scope`) en Implementation Registry (Settlement Currency-tabel) voor de concrete uitwerking. |

## 5. Trust Principles — identiteit, reviews, escrow, reputatie

| Principe | Betekenis | Status | Bron |
|---|---|---|---|
| Reputation Reflects Verified Work, Not Engagement | Reputatie komt voort uit voltooide, geverifieerde transacties — geen likes, volgers, of zichtbaarheidsmetrieken | Confirmed | Whitepaper §4.4 |
| Domain-Separated Trust | Economische reputatie (GoodCompany) staat los van eventuele governance- of reviewreputatie elders in het ecosysteem | Confirmed | Whitepaper §4.4, Codex Final Evaluation/Reviews clausule 6 |
| Disputes are Resolved by Independent Professionals, Never Peers | De mediatorrol is uitsluitend een ingehuurde, onafhankelijke professional — nooit een community- of peer-rol, om vooringenomenheid te voorkomen | Confirmed | Build Spec §8.2 |
| Progressive Trust Through Verifiable Actions | Vertrouwen wordt niet vooraf aangenomen, maar opgebouwd door aantoonbaar gedrag binnen het systeem (voltooide contracten, escrow, reviews) | Confirmed (Derived) — het verbindende principe achter escrow, reviews, SSI en het reputatiemodel samen; verklaart waarom het platform draait op echte transacties, niet op profielen/beoordelingen alleen | Build Spec §4.4/§4.6, whitepaper §5.2, Reputation Review Addendum — samengevoegd uit meerdere mechanismen, geen enkel citaat |

## 6. Governance Principles — hoe toekomstige wijzigingen beoordeeld worden

| Principe | Betekenis | Status | Bron |
|---|---|---|---|
| Implementation Choices May Evolve While Guarantees Remain Stable | Technologiekeuzes zijn vervangbaar; de onderliggende productgarantie niet | Confirmed | Build Spec §5 ("these boundaries encode product guarantees, not preference") |
| Changes to Economic Rules Require Transparent Governance | Wijzigingen aan waarden die de gedeelde reserves raken (rente, drempels, fee) horen via een navolgbaar, transparant proces te lopen, niet stilzwijgend | Proposed | Geen directe bronpassage — sluit aan bij de bestaande community-stemmechaniek voor leningen, maar is niet expliciet uitgebreid tot een algemeen governance-principe voor álle economische parameters |

## 7. Relationship to Other Documents

```
Core Design Principles   → waarom bestaat het systeem zo?
        ↓
Codex                    → welke regels gelden?
        ↓
Build Specification      → hoe wordt de huidige versie gebouwd?
        ↙                              ↘
Configuration Registry                Implementation Registry
→ actuele instelbare waarden          → actuele technische keuzes
  waar de Build Spec naar verwijst      waar de Build Spec naar verwijst
```

*Herzien t.o.v. de eerdere lineaire weergave: de registries hangen niet "onder" de Build Spec als volgende stap, maar zijn ondersteunende documenten waar de Build Spec zelf naar verwijst — de Build Spec is de plek waar de huidige release wordt gespecificeerd, de registries houden de actuele waarden/keuzes bij die daarbij gebruikt worden.*

Een voorbeeld van hoe dit in de praktijk samenhangt (identiteit/privacy):
- **Core Design Principles** zegt: privacy is standaard beschermd, verifieerbaarheid waar nodig.
- **Codex** zegt: alleen noodzakelijke gegevens worden gedeeld (selective disclosure).
- **Configuration Registry** zegt: geen parameter — dit is geen instelling.
- **Implementation Registry** zegt: Hyperledger Identus ondersteunt selective disclosure.
- **Build Spec** zegt: zo implementeren we het concreet in MVP1.

## Voorgestelde toetsingsvragen bij nieuwe features (architectuur-auditlijst)
Bij elk nieuw voorstel, in deze volgorde:
0. *(Oriënterend, geen pass/fail-toets — zie de aantekening bij de Purpose Statement hierboven)* Sluit dit aan bij de Purpose Statement? Dit is een contextvraag om af te wegen of een voorstel de moeite waard is om verder te toetsen, geen blokkerende eis zoals vraag 1.
1. Schendt dit een Foundational Principle? Zo ja: stop, heroverweeg het voorstel zelf.
2. Moet dit een Codex-regel worden (een regel die nooit automatisch verandert)?
3. Is dit slechts een configureerbare parameter (Configuration Registry)?
4. Is dit alleen een technische implementatiekeuze (Implementation Registry)?

## Openstaand
- Drie principes staan als **Proposed**, niet Confirmed: Human-first/automation-second, Smart contracts enforce-not-replace-judgement, Modular architecture over lock-in. Plus één in Governance: Changes to economic rules require transparent governance. Geen van deze heeft een directe bronpassage — ze zijn ofwel eigen syntheses van waargenomen patronen, ofwel nog te valideren met Sander voordat ze als Foundational/Architectural gelden.
- Vier principes staan als **Confirmed (Derived)**: Verifiable by Design/Private by Default, Technology Serves Guarantees, Community Capital Should Circulate, en Progressive Trust Through Verifiable Actions. Deze zijn inhoudelijk goed gedekt door meerdere bronpassages samen, maar zijn zelf geen letterlijk citaat — expliciet zo gelabeld om te voorkomen dat een goed geformuleerd principe dezelfde bewijskracht krijgt als een direct citaat.
