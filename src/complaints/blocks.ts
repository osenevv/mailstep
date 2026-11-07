import type { Complaint, WmsReturn } from '../pack/types.ts';

export function complaintBlocks(orderId: string, complaints: Complaint[]): boolean {
  const normId = orderId.trim();
  return complaints.some((complaint) => complaint.orderId.trim() === normId);
}

export function returnBlocks(orderId: string, returns: WmsReturn[]): boolean {
  const normId = orderId.trim();
  return returns.some((item) => item.orderId.trim() === normId);
}
