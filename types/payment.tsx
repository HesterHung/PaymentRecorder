export interface Payment {
  id: string;
  date: number;
  title: string;
  whoPaid: string;
  amount: number;
  amountType: 'total' | 'specific';
  source?: string;
  uri?: string;          // for receipt image URI
  localPath?: string;    // for local storage path
  isUploaded: boolean;   // track upload status
}

export interface GroupedPayments {
  title: string;
  data: Payment[];
  totalAmount: number;
}

export const CONSTANTS = {
  PAYERS: ['Person1', 'Person2'] as const,
  AMOUNT_TYPES: ['total', 'specific'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments'
  }
} as const;

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];