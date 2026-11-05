import type { Complaint, ReporterRow } from '../pack/types.ts';
import { parseTimestamp } from './window.ts';

export function isLargeClient(clientId: string, reporters: ReporterRow[]): boolean {
  return reporters.some((row) => row.clientId === clientId);
}

export function resolveReporter(
  clientId: string,
  carrier: string,
  reporters: ReporterRow[],
  complaints: Complaint[],
): string | null {
  if (isLargeClient(clientId, reporters)) {
    const exact = reporters.find((row) => row.clientId === clientId && row.carrier === carrier);
    if (exact) return exact.reporter;
    const wildcard = reporters.find((row) => row.clientId === clientId && row.carrier === '*');
    return wildcard?.reporter ?? null;
  }
  const history = complaints
    .filter((complaint) => complaint.clientId === clientId && complaint.reporter)
    .map((complaint) => ({ complaint, at: parseTimestamp(complaint.createdAt) }))
    .filter((item): item is { complaint: Complaint; at: Date } => item.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.complaint.id.localeCompare(a.complaint.id));
  return history[0]?.complaint.reporter ?? null;
}
