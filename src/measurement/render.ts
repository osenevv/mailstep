import type { TrackingStatus } from '../tracking/types.ts';
import { STATUSES } from './measure.ts';
import type { Bucket, Report, Tally } from './types.ts';

export function renderReport(report: Report, provenance: string): string {
  const lines: string[] = [];
  lines.push('# Měření čtení tracking stránek', '');
  lines.push('## Původ', '', provenance.trim(), '');
  lines.push('## Dev a holdout', '');
  lines.push('| Split | Stránek | Shoda | Nebezpečné | Potlačující | Zdrženlivé | Přehnané | Ostatní omyl |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  lines.push(splitRow('dev', report.bySplit.dev));
  lines.push(splitRow('holdout', report.bySplit.holdout));
  lines.push('');
  lines.push('## Dopravci', '');
  lines.push('| Dopravce | Stránek | Shoda | Nebezpečné | Potlačující | Zdrženlivé | Přehnané | Ostatní omyl |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const carrier of Object.keys(report.byCarrier).sort((a, b) => a.localeCompare(b, 'cs'))) {
    const tally = report.byCarrier[carrier];
    if (tally) lines.push(splitRow(carrier, tally));
  }
  lines.push('');
  lines.push('## Matice záměn', '');
  lines.push(`Řádek je štítek, sloupec je predikce. Pořadí: ${STATUSES.join(', ')}.`, '');
  lines.push(`| štítek \\ predikce | ${STATUSES.join(' | ')} |`);
  lines.push(`|---|${STATUSES.map(() => '---:').join('|')}|`);
  for (const label of STATUSES) {
    const row = STATUSES.map((predicted) => String(report.confusion[label]?.[predicted] ?? 0));
    lines.push(`| ${label} | ${row.join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Co který koš znamená', '');
  lines.push('- **Nebezpečné.** Predikce `v přepravě`, štítek je `doručeno` nebo `vrací se`. Brána by mohla založit falešnou reklamaci.');
  lines.push('- **Potlačující.** Predikce `doručeno` nebo `vrací se`, štítek je `v přepravě`. Skutečná ztráta by se nedostala do fronty.');
  lines.push('- **Zdrženlivé.** Predikce `nevím`, štítek je známý. Práce pro člověka, žádné založení.');
  lines.push('- **Přehnané.** Určitá predikce, štítek je `nevím`. Čtečka tvrdí víc, než stránka unese.');
  lines.push('- **Ostatní omyl.** Dva určité stavy, které nejsou ani nebezpečné, ani potlačující. Například `doručeno` a `vrací se` prohozené.');
  lines.push('');
  lines.push('## Omyly', '');
  if (report.misses.length === 0) {
    lines.push('Žádné.', '');
  } else {
    lines.push('| Koš | Soubor | Dopravce | Split | Štítek | Predikce | Pravidlo | Evidence |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const miss of report.misses) {
      const evidence = miss.reading.evidence ?? '';
      lines.push(
        `| ${bucketLabel(miss.bucket)} | ${miss.file} | ${miss.carrier} | ${miss.split} | ${miss.label} | ${miss.reading.status} | ${miss.reading.ruleId} | ${escapeCell(evidence)} |`,
      );
    }
    lines.push('');
  }
  lines.push(`Celkem stránek: ${report.total}.`, '');
  return lines.join('\n');
}

function splitRow(name: string, tally: Tally): string {
  return `| ${name} | ${tally.pages} | ${percent(tally.agree, tally.pages)} | ${tally.buckets.dangerous} | ${tally.buckets.suppressing} | ${tally.buckets.abstention} | ${tally.buckets.overconfident} | ${tally.buckets.other_miss} |`;
}

function percent(agree: number, pages: number): string {
  if (pages === 0) return '0.0 %';
  return `${((agree / pages) * 100).toFixed(1)} %`;
}

function bucketLabel(bucket: Exclude<Bucket, 'correct'>): string {
  const labels: Record<Exclude<Bucket, 'correct'>, string> = {
    dangerous: 'nebezpečné',
    suppressing: 'potlačující',
    abstention: 'zdrženlivé',
    overconfident: 'přehnané',
    other_miss: 'ostatní omyl',
  };
  return labels[bucket];
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '/').replace(/\n/g, ' ');
}

export function confusionTotal(report: Report): number {
  return STATUSES.reduce((sum, label) => {
    return sum + STATUSES.reduce((inner, predicted) => inner + report.confusion[label][predicted], 0);
  }, 0);
}
