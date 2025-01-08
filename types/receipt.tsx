// types/receipts.ts
export interface Receipt {
  id: string;
  uri: string;
  timestamp: number;
  isUploaded: boolean;
  title?: string;
  whoPaid?: string;
  source?: string;
}

export interface GroupedReceipts {
  title: string;
  data: Receipt[];
}

export interface Payment {
  id: string;
  date: number;
  title: string;
  whoPaid: string;
  amount: number;
  amountType: 'total' | 'specific';
  receipt?: string;
  source?: string;
}

export interface GroupedPayments {
  title: string;
  data: Payment[];
  totalAmount: number;
}

// Common constants
export const CONSTANTS = {
  PAYERS: ['Person1', 'Person2'] as const,
  AMOUNT_TYPES: ['total', 'specific'] as const,
  STORAGE_KEYS: {
      RECEIPTS: 'stored_receipts',
      PAYMENTS: 'stored_payments'
  }
} as const;

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];