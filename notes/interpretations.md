# Výklad nejasností

Každá položka je volba, kterou brief nechává otevřenou. Bezpečnost se posuzuje podle ceny chyby: falešná reklamace je dražší než odklad. Test, který volbu přibíjí, píše až úkol, který tu logiku implementuje.

## I-window

Otázka: od kdy se počítá „doba ve stavu“, a počítá se přesně 2 nebo 14 dní?

Volba: doba ve stavu = `asOf − stateEnteredAt` v uplynulém čase. Práh je `minDays × 24 h`. Přesně práh je už způsobilý (`≥`). Časové značky jsou ISO 8601 s offsetem. Značka bez offsetu se čte jako místní čas Europe/Prague. Neexistující hodina při jarním posunu (02:00–03:00 v den začátku letního času) je `DATA_INCOMPLETE`. Zdvojená hodina při podzimním posunu se čte s offsetem po přechodu (CET, +01:00). Kalendářní dny ani pracovní dny se nepočítají. Přechod 2026-10-25 se proto měří v uplynulých milisekundách, ne rozdílem místních ciferníků.

Proč je to bezpečné: kratší okno by zakládalo reklamace dřív, než oddělení dnes dělá. Přesná hranice je zahrnutá, protože „minimální doba“ je splněná. Špatný směr u DST by buď založil reklamaci o hodinu dřív, nebo ji o hodinu odložil. Odklad je levnější, ale tady je pravidlo jednoznačné: uplynulý čas, ne místní ciferník.

Test: `I-window: exactly 14 d is eligible`, `I-window: 1 ms under is not`, `I-window: DST fall-back uses elapsed time`.

## I-now

Otázka: vůči jakému „teď“ se okno počítá?

Volba: `asOf` je `exportedAt` z exportu objednávek. `--as-of` ho přepíše. Hodiny procesu se nečtou, aby dva běhy nad stejnými soubory daly stejný výsledek.

Proč je to bezpečné: běh v poledne nad ranním exportem by jinak posunul hranici a mohl založit reklamaci, kterou ranní export ještě neviděl.

Test: `I-now: asOf comes from exportedAt`.

## I-complaint-block

Otázka: blokuje i uzavřená nebo zamítnutá reklamace, nebo jen koncept a otevřená?

Volba: jakákoli existující reklamace na tutéž objednávku blokuje, v jakémkoli stavu, koncept v to počítaje. Reklamace jiné objednávky téhož klienta neblokuje.

Proč je to bezpečné: „nezakládá se podruhé“ je levnější chyba než druhá reklamace na dopravce. Kdyby uzavřená reklamace neblokovala, automat by znovu otevřel vyřízený případ.

Test: `I-complaint-block: koncept blocks`, `I-complaint-block: uzavřená blocks`, `I-complaint-block: other order of same client does not block`.

## I-return-block

Otázka: které stavy vratky ve WMS blokují?

Volba: jakákoli vratka na objednávku blokuje, včetně stavu Připraveno.

Proč je to bezpečné: brief to říká výslovně. Založit ztrátu na zásilce, která se vrací na sklad, je falešná reklamace.

Test: `I-return-block: Připraveno blocks`, `I-return-block: any other state blocks`.

## I-large-client

Otázka: kdo je velký klient a co když matice nemá řádek pro jeho dopravce?

Volba: klient je velký, jakmile má v `reporters.csv` aspoň jeden řádek. Pro velkého klienta rozhoduje jen matice. Přesná shoda `carrier` má přednost před řádkem `*`. Když ani jedno nesedí, výsledek je `NO_REPORTER`. Na historii reklamací se nesahá.

Proč je to bezpečné: špatný reportér je reklamace, kterou nikdo nepřevezme, nebo kterou převezme cizí člověk. Raději nezaložit a nechat člověka.

Test: `I-large-client: matrix hit`, `I-large-client: exact carrier beats star`, `I-large-client: no matching row is NO_REPORTER`.

## I-last-reporter

Otázka: jak se bere „poslední reportér“ u malého klienta?

Volba: poslední je reklamace téhož `clientId` s nejvyšším `createdAt`, v jakémkoli stavu včetně konceptu, která má reportéra. Reklamace bez reportéra se přeskakuje. Žádná taková není → `NO_REPORTER`.

Proč je to bezpečné: stejné co u matice. Koncept se počítá, protože brief historii neomezuje na uzavřené případy.

Test: `I-last-reporter: latest wins`, `I-last-reporter: no history is NO_REPORTER`.

## I-exclusions

Otázka: platí seznamy vyloučených způsobů dopravy napříč definicemi?

Volba: každý seznam patří jen své definici a čte se z `rules.yaml`. Způsob, který není v seznamu dané definice, je povolený. Služba bez trackingu tedy blokuje jen B. Interní přeprava blokuje A i B, protože je v obou seznamech v podkladech, ne proto, že by to kód tušil.

Proč je to bezpečné: tvrdé kódování seznamu by se rozešlo s `rules.yaml` v den, kdy oddělení seznam změní.

Test: `I-exclusions: no-tracking service allowed for A and excluded for B`, `I-exclusions: internal transport excluded for both`.

## I-def-A-signal

Otázka: kdy je „nevím“ dost silné na to, aby se založilo nevyzvednuto?

Volba: `nevím` s příčinou `no_carrier_events` je kladný signál „dopravce zásilku eviduje a nemá sken převzetí“. Platí jen pro definici A a vede na `FILE` / `TRACKING_CONFIRMS_NOT_PICKED_UP`. Každá jiná příčina `nevím` u A, a každá příčina `nevím` u B, je `NEEDS_HUMAN` / `TRACKING_UNKNOWN`.

Proč je to bezpečné: u ztráty „nevím“ nedokazuje, že zásilka není doručená. U nevyzvednutí je prázdná historie skenů právě ten důkaz, který referent na stránce hledá, ale jen když stránka patří známé šabloně a zásilku opravdu našla. Nečitelná stránka ten důkaz není.

Test: `I-def-A-signal: no_carrier_events files A`, `I-def-A-signal: other unknown does not file`.

## I-tracking-link

Otázka: jak se objednávka spojí s uloženou stránkou?

Volba: `trackingNumber` → soubor `tracking/<trackingNumber>.html`. Chybějící soubor je `TRACKING_UNAVAILABLE`, ne `nevím`. Chybějící `trackingNumber` u jinak způsobilé objednávky je totéž.

Proč je to bezpečné: chybějící stránka není důkaz o stavu zásilky. Zakládat z ní reklamaci je filing bez evidence.

Test: `I-tracking-link: missing file is TRACKING_UNAVAILABLE`.

## I-data-incomplete

Otázka: co s objednávkou, které chybí údaj nutný k rozhodnutí?

Volba: chybějící nebo nečitelná `stateEnteredAt`, nebo prázdné `clientId`, dává `DATA_INCOMPLETE`. Objednávka se nezahodí. Jinak platná objednávka v nesledovaném stavu je `NOT_WATCHED_STATE`, ne chyba dat.

Proč je to bezpečné: tichá ztráta řádku je zmeškaná reklamace, kterou nikdo neuvidí. `DATA_INCOMPLETE` zůstane ve výpisu.

Test: `I-data-incomplete: missing stateEnteredAt`, `I-data-incomplete: empty clientId`.
