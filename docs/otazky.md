# Otázky před ostrým během

Každá otázka mění konkrétní rozhodnutí. Dokud na ni není odpověď, platí výklad v README.

## Reklamační oddělení

1. **I-complaint-block.** Blokuje i uzavřená a zamítnutá reklamace, nebo jen koncept a otevřená? Když blokuje jen otevřená, `COMPLAINT_EXISTS` se omezí na tyto stavy a uzavřený případ půjde založit znovu.
2. **I-def-A-signal.** Stačí prázdná historie skenů na známé šabloně k založení nevyzvednutí? Když nestačí, definice A se ve stínu nikdy nezaloží a padne do `NEEDS_HUMAN`.
3. **I-return-block.** Blokuje i stornovaná vratka? Když ne, do `RETURN_EXISTS` půjdou jen stavy, které oddělení vyjmenuje.
4. **Stín.** Když referent reklamaci založí a job by ji nezaložil, čí rozhodnutí se příští týden bere jako pravda pro přesnost? Od toho se odvíjí, jestli se práh pro přechod naostro počítá z akcí člověka, nebo z dodatečně opravených případů.
5. **I-window.** Je 14 dní uplynulý čas, nebo pracovní dny? Pracovní dny znamenají jiný výpočet v `window.ts` a jiné hraniční testy. Okno se neoptimalizuje, jen se správně přečte.
6. **Cena zmeškání.** Jak dlouho smí ztráta čekat ve frontě člověka, když je stránka `nevím`? Od toho se odvíjí, jestli `NEEDS_HUMAN` stačí jako ranní seznam, nebo má mít vlastní lhůtu.

## Vývoj Mailshipu

7. **I-tracking-link.** Je `trackingNumber` klíč k uložené stránce i k retracku? Když je klíč jiný, mění se jen loader, ne brána.
8. **I-now.** Je „teď“ čas exportu, nebo start jobu? Start jobu by posunul okno u téhož souboru a dva běhy by se rozešly.
9. **Dvojí běh.** Jaký je idempotentní klíč reklamace, až stín skončí a job začne zapisovat? Bez něj druhé ranní spuštění založí duplicitu, kterou dnešní kontrola souboru už neuvidí.
10. **I-large-client.** Je velký klient ten, kdo má řádek v matici, nebo má na kartě klienta vlastní příznak? Příznak znamená, že matice není zdroj pravdy a chybějící řádek se musí řešit jinak než `NO_REPORTER`.
11. **Čas vstupu do stavu.** Mění se `stateEnteredAt` jen při přechodu stavu, nebo i při každém refreshi trackingu? Refresh by okno pořád nuloval a kandidát by nevznikl.
12. **Offset.** Chodí časové značky vždy s offsetem? Bez offsetu je čteme jako Europe/Prague. Jiná zóna skladu v Itálii by posunula práh o hodinu.
