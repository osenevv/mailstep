import type { Complaint, WmsReturn } from '../pack/types.ts';

export function complaintBlocks(orderId: string, complaints: Complaint[]): boolean {
  return complaints.some((complaint) => complaint.orderId === orderId);
}

export function returnBlocks(orderId: string, returns: WmsReturn[]): boolean {
  return returns.some((item) => item.orderId === orderId);
}
