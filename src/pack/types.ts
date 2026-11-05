import type { TrackingStatus } from '../tracking/types.ts';

export type OrderState = 'čeká na dopravce' | 'převzato dopravcem' | (string & {});

export interface Order {
  id: string;
  clientId: string;
  state: OrderState;
  stateEnteredAt: string | null;
  shippingMethod: string;
  carrier: string;
  trackingNumber: string | null;
}

export interface OrdersExport {
  exportedAt: string;
  orders: Order[];
}

export interface Complaint {
  id: string;
  orderId: string;
  clientId: string;
  state: 'koncept' | 'otevřená' | 'uzavřená' | 'zamítnutá' | (string & {});
  reporter: string | null;
  createdAt: string;
}

export interface WmsReturn {
  id: string;
  orderId: string;
  state: string;
}

export interface ReporterRow {
  clientId: string;
  carrier: string | '*';
  reporter: string;
}

export interface DefinitionRule {
  orderState: string;
  minDays: number;
  excludedMethods: string[];
  complaintReason: string;
}

export interface Rules {
  definitions: { A: DefinitionRule; B: DefinitionRule };
}

export interface TrackingLabel {
  file: string;
  carrier: string;
  label: TrackingStatus;
}

export interface Pack {
  exportedAt: Date;
  orders: Order[];
  complaints: Complaint[];
  returns: WmsReturn[];
  reporters: ReporterRow[];
  rules: Rules;
  trackingHtml(trackingNumber: string): string | null;
  trackingLabels: TrackingLabel[];
}
