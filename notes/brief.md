# Case study: AI Automation Engineer (Mailstep) — zadání

> Text extracted from `Case-study-AI-Automation-Engineer.pdf` (3 pages) with pypdf, table layout restored by hand. The PDF is authoritative if anything here differs.

## O co jde
Úloha vychází z automatizace, kterou v Mailstepu letos opravdu stavíme: automatické zakládání reklamací na zásilky, které uvízly u dopravce. Problém je skutečný, data v podkladech jsou smyšlená a zadání jsme o pár integrací zjednodušili.

Počítejte se 4–5 hodinami práce. Kdybyste zjistili, že potřebujete víc, zastavte se a do README napište, co byste dělali dál a proč. Řez, který funguje a je otestovaný, má pro nás větší cenu než kompletní systém, kterému nevěříte ani vy.

Nehledáme nejvíc kódu. Zajímá nás, jak uvažujete o tom, kam jazykový model patří a kam ne, a co uděláte pro to, aby automatizace neškodila víc než ruční práce, kterou nahrazuje.

## Kontext
Mailstep je 3PL fulfillment: skladujeme a expedujeme zboží pro e-shopy ze skladů v Praze a Itálii. Objednávky žijí v Mailshipu, našem systému pro správu objednávek. Fyzický sklad a vratky řeší samostatný WMS. Zásilky předáváme řadě dopravců a stav doručení se k nám vrací přes transportní integraci; Mailship u každé zásilky drží normalizovaný stav dopravce a umí si u dopravce vyžádat nový tracking (retrack).

Když zásilka uvízne, založí reklamační oddělení v Mailshipu reklamaci. Dnes to vypadá takhle: dva reporty se exportují do Excelu a referent prochází řádek po řádku. Jeden z nich se reviduje zhruba jednou měsíčně. Samotné založení reklamace z řádku je mechanické, podmínky jsou pevné a nikdo při něm nic neposuzuje. Než ji referent založí, obvykle si otevře tracking stránku dopravce a podívá se, jestli zásilka nakonec doručená nebyla.

Podmínky, jak je popisuje reklamační oddělení:

| | Definice A — nevyzvednuto | Definice B — ztráta |
|---|---|---|
| Stav objednávky | čeká na dopravce | převzato dopravcem |
| Minimální doba ve stavu | 2 dny | 14 dní |
| Vyloučené způsoby dopravy | interní přeprava | interní přeprava a několik služeb bez skutečného trackingu (seznam v podkladech) |
| Důvod reklamace | nevyzvednuto dopravcem | ztráta |

K tomu tři pravidla, která oddělení dodržuje vždycky. Reklamace se nezakládá podruhé, ani když už existuje jen jako koncept. Nezakládá se, pokud ve WMS existuje k objednávce vratka, i ve stavu Připraveno. A každá reklamace musí mít reportéra: u velkých klientů ho určuje matice kontaktů, u ostatních se bere poslední reportér z historie reklamací daného klienta.

Okna 2 a 14 dní jsou převzatá z dnešní praxe a nejsou k optimalizaci. Všechno, co přijde po založení reklamace (posouzení oprávněnosti, nahlášení dopravci, lhůty, komunikace s klientem), zůstává na člověku a do úlohy nepatří. Objem jsou desítky kandidátů denně.

## Zadání
Úloha má dvě části. Kolik času dáte které, je na vás.

### Část 1 — návrh
Nejvýš dvě strany. Popište, jak byste automatizaci postavili, aby jednou mohla běžet sama každé ráno. Chceme v něm vidět hlavně tyhle věci:
- které části řeší pravidla a které jazykový model, a proč právě takhle,
- jak ověříte, že zásilka opravdu nebyla doručená, a odkud tu informaci vezmete,
- co se stane, když se ověření splete, a co, když nebude k dispozici,
- jak to nasadíte, aby první týdny nikomu neublížily, a podle čeho poznáte, že to funguje.

### Část 2 — implementace jednoho řezu
Postavte dvě věci nad podklady, které dostanete.

**Rozhodovací logiku pro obě definice.** Pro každou objednávku vrátí, jestli reklamaci založit, a pokud ne, proč. S testy. Mailship a WMS nahraďte daty ze souborů; přístupy do našich systémů nedáváme.

**Čtení tracking stránky.** Komponenta z uložené stránky dopravce určí stav zásilky: doručeno, v přepravě, vrací se, nebo nevím. K stránkám dostanete i skutečný výsledek, takže můžete změřit, jak se vaše komponenta trefí. Výsledek měření je součástí odevzdání.

Preferujeme TypeScript na Node.js, protože v něm běží Mailship. Jiný jazyk je v pořádku, když ho zdůvodníte. Pokud použijete jazykový model, uveďte který a kolik stojí jedno vyhodnocení.

## Podklady
Všechna data v balíčku jsou smyšlená, včetně názvů klientů a dopravců. Struktura odpovídá tomu, co v Mailshipu a WMS opravdu máme.

| Soubor | Co obsahuje |
|---|---|
| orders.json | fiktivní objednávky v obou sledovaných stavech, včetně hraničních případů |
| complaints.json | existující reklamace včetně konceptů a historie reportérů |
| returns.json | vratky z WMS s jejich stavy |
| reporters.csv | matice kontaktů pro velké klienty |
| rules.yaml | okna, vyloučené způsoby dopravy, důvody reklamace |
| order-states.md | stavy objednávky a kdy se mění |
| tracking/*.html | uložené tracking stránky několika fiktivních dopravců |
| tracking/labels.csv | skutečný výsledek ke každé stránce |

Když v podkladech narazíte na rozpor nebo díru, nepište nám pro upřesnění. Zvolte rozumný výklad, uveďte ho v README a pokračujte. Jak s nejasnostmi zacházíte, je součástí hodnocení.

## Co odevzdat
Do sedmi dnů od převzetí zadání pošlete odkaz na git repozitář. V něm bychom rádi našli:
- návrh z části 1 (Markdown nebo PDF, nejvýš dvě strany),
- kód s testy a README, podle kterého jde všechno spustit jedním příkazem,
- výsledek měření nad tracking stránkami: kolik případů, kde se komponenta spletla a jakým směrem,
- seznam otázek, které byste položili reklamačnímu oddělení a vývoji Mailshipu, než byste to stavěli naostro,
- krátkou poznámku, co jste nestihli nebo vědomě vynechali.

Pak nás čeká hodina společně. Prvních 15 minut nám řešení ukážete, zbytek je rozhovor nad návrhem a kódem. Připravte se, že se budeme ptát hlavně na rozhodnutí, která jste udělali, a na to, co by se stalo, kdyby některé z nich bylo špatně.

## Jak budeme hodnotit
Všech šest oblastí má pro nás podobnou váhu. Špatná odpověď na otázku, odkud brát stav doručení, ale váží víc než chybějící test.

| Oblast | Co hledáme |
|---|---|
| Pochopení problému | Rozumíte, proč kandidát na reklamaci vůbec vznikl, a z toho odvozujete, kde hledat pravdu o doručení. |
| Model vs. pravidla | Model používáte tam, kde je vstup opravdu nestrukturovaný, a umíte říct, proč jinde ne. |
| Cena chyby | Rozlišujete chyby podle toho, co způsobí, a návrh podle toho chráníte. |
| Měření | Výsledek nad tracking stránkami je poctivý, rozložený podle druhu chyby a opakovatelný. |
| Kód a testy | Logiku jde otestovat bez sítě a databáze, hraniční případy jsou pokryté, kód se čte snadno. |
| Rozsah a komunikace | Děláte, co bylo zadáno. Nápady navíc patří do poznámky, ne do kódu. Nejasnosti pojmenujete. |
