import type { Complaint, ReporterRow } from '../pack/types.ts';
import { parseTimestamp } from './window.ts';

export function isLargeClient(clientId: string, reporters: ReporterRow[]): boolean {
  const normClient = clientId.trim();
  return reporters.some((row) => row.clientId.trim() === normClient);
}

export function resolveReporter(
  clientId: string,
  carrier: string,
  reporters: ReporterRow[],
  complaints: Complaint[],
): string | null {
  const normClient = clientId.trim();
  const normCarrier = carrier.trim().toLowerCase();
  if (isLargeClient(normClient, reporters)) {
    const exact = reporters.find(
      (row) => row.clientId.trim() === normClient && row.carrier.trim().toLowerCase() === normCarrier,
    );
    if (exact) return exact.reporter;
    const wildcard = reporters.find((row) => row.clientId.trim() === normClient && row.carrier.trim() === '*');
    return wildcard?.reporter ?? null;
  }
  const history = complaints
    .filter((complaint) => complaint.clientId.trim() === normClient && complaint.reporter)
    .map((complaint) => ({ complaint, at: parseTimestamp(complaint.createdAt) }))
    .filter((item): item is { complaint: Complaint; at: Date } => item.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.complaint.id.localeCompare(a.complaint.id));
  return history[0]?.complaint.reporter ?? null;
}
