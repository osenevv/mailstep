# Otázky před ostrým během

Každá otázka mění konkrétní rozhodnutí v kódu nebo v nasazení. Dokud není odpověď, platí výklad v README.

## Reklamační oddělení

1. **I-complaint-block.** Blokuje i uzavřená a zamítnutá reklamace, nebo jen koncept a otevřená? Když jen otevřená, `COMPLAINT_EXISTS` se omezí a uzavřený případ půjde založit znovu — levnější odklad zmizí.
2. **I-def-A-signal.** Stačí prázdná historie skenů na známé šabloně k založení nevyzvednutí? Když ne, definice A ve stínu skoro nikdy nepodá `FILE` a skončí v `NEEDS_HUMAN`.
3. **I-return-block.** Blokuje i stornovaná vratka? Když ne, do `RETURN_EXISTS` půjdou jen stavy, které oddělení vyjmenuje; jinak hrozí ztráta na balíku, který se vrací do skladu.
4. **I-last-reporter.** U malého klienta bere se reportér i z konceptu a zamítnuté reklamace, nebo jen z uzavřené/otevřené? Širší historie dnes vybere starší jméno; užší častěji spadne do `NO_REPORTER`.
5. **Stín / pravda pro přesnost.** Když referent založí a job by nezaložil (nebo naopak), čí rozhodnutí se příští týden bere jako pravda? Od toho se počítá práh přechodu naostro a co musí umět deník rozhodnutí (dnes `reconcile` jen čte `complaints.json`).
6. **Cena zmeškání.** Jak dlouho smí ztráta čekat ve frontě člověka při `nevím` / chybějící stránce? Když má vlastní lhůtu, `NEEDS_HUMAN` nestačí jako ranní seznam a potřebuje eskalaci.

## Vývoj Mailshipu

7. **I-tracking-link a retrack.** Je `trackingNumber` klíč k uložené stránce i k retracku, a je HTML v jobu vždy po čerstvém retracku? Jiný klíč mění jen loader. Stará stránka bez retracku by bráně dávala zastaralou „pravdu“.
8. **I-now.** Je „teď“ čas exportu, nebo start jobu? Start jobu posune okno u téhož souboru a dva běhy se rozejdou.
9. **I-window a zóna.** Jsou 2 / 14 dní uplynulý čas (jak teď), nebo pracovní dny? A chodí `stateEnteredAt` vždy s offsetem? Pracovní dny mění `window.ts`. Bez offsetu čteme Europe/Prague; italský sklad bez offsetu posune práh o hodinu.
10. **`stateEnteredAt`.** Mění se jen při přechodu stavu, nebo i při refreshi trackingu? Refresh by okno pořád nuloval a kandidát by nevznikl.
11. **I-large-client.** Je velký klient ten, kdo má řádek v matici, nebo má na kartě vlastní příznak? Příznak znamená, že matice není zdroj pravdy a chybějící řádek se nesmí tiše řešit jako `NO_REPORTER`.
12. **Dvojí běh a šablony.** Jaký je idempotentní klíč reklamace po konci stínu? A kdo schvaluje práh `unrecognized_template` (v README 10 %), po kterém se smí zapnout LLM fallback? Bez klíče druhé ráno založí duplicitu; bez vlastníka prahu se model zapne odhadem.
