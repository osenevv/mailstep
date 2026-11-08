# Syntetické podklady

Podklady nebyly dodány. Tento balíček je syntetický. Názvy klientů a dopravců jsou vymyšlené. Tvary souborů drží `src/pack/types.ts`.

Balíček vznikl jednorázovým skriptem, který zapsal pevné šablony čtyř dopravců a hraniční objednávky vypsané níže. Skript v repozitáři nezůstal. Čísla níže jsou počty souborů, ne výsledky čtečky.

## Soubory

| Soubor | Tvar |
|---|---|
| `orders.json` | export s `exportedAt` a polem objednávek |
| `complaints.json` | pole reklamací, včetně konceptu |
| `returns.json` | vratky z WMS |
| `reporters.csv` | `clientId,carrier,reporter` |
| `rules.yaml` | definice A a B, okna, vyloučené způsoby, důvod reklamace |
| `order-states.md` | kdy se stav mění |
| `tracking/*.html` | uložené stránky |
| `tracking/labels.csv` | `file,carrier,label` |
| `tracking/split.md` | dev a holdout |

`exportedAt` je `2026-11-03T06:00:00+01:00`. 45 objednávek, 25 reklamací, 10 vratek, 8 řádků matice, 64 stránek (dev 35 / holdout 29 podle `tracking/split.md`).

## Klienti

Velký klient je ten, který má řádek v matici: Lumen obchod (`CL-LUMEN`), Niva studio (`CL-NIVA`), Orta home (`CL-ORTA`). Malí jsou Bor a syn (`CL-BOR`), Míša papír (`CL-MISA`) a Klin keramika (`CL-KLIN`).

## Dopravci

Rychlopost má tabulku událostí, nejnovější řádek první. PaketNet má seznam, nejstarší položka první. VeloCorriere je italsky, nejnovější událost první. NordParcel má anglický štítek stavu a historii. Jedna část stránek Rychlopostu je šablona v2 bez tabulky.

## Hraniční případy v objednávkách

Jsou tu obě okna těsně pod prahem, přesně na prahu a nad prahem, včetně přechodu letního času 2026-10-25 a času bez offsetu. Služba bez trackingu je u definice A i B. Interní přeprava je u obou. Reklamace ve stavu koncept i uzavřená. Reklamace jiné objednávky téhož klienta. Vratka ve stavu Připraveno i v jiném stavu. Velký klient s řádkem matice i bez něj. Malý klient s historií reportérů i bez ní. Chybějící čas vstupu do stavu, prázdný klient, nesledované stavy. Jedna objednávka naráží na víc bloků najednou. Dvě způsobilé objednávky nemají soubor stránky.

## Pasti na stránkách

Starší událost „doručeno na depo“ pod novějším stavem. Texty „nedoručeno“, „doručení se nezdařilo“, „non consegnato“, „not delivered“. Vrácení odesílateli ve třech jazycích. Patička, která slovo doručeno obsahuje, i když tabulka říká něco jiného. Prázdná stránka, odstávka, konflikt štítku a historie, prázdná historie skenů, šablona v2.
