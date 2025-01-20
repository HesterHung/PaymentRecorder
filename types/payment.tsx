export const CONSTANTS = {
  PAYERS: ['Person1', 'Person2'] as const,
  AMOUNT_TYPES: ['total', 'specific'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments'
  }
} as const;

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];
export type ImageUploadStatus = 'uploading' | 'uploaded' | 'error' | 'pending';


interface Payment {
  id: string;
  title: string;
  whoPaid: Payer;
  amount: number;
  amountType: string;
  date: number;
  uri: string | null;
  serverUri: string | null;
  isUploaded: boolean;
  uploadError?: string | null;
  uploadStatus: 'uploading' | 'uploaded' | 'error';
  imageUploadStatus: ImageUploadStatus;
}

export interface GroupedPayments {
  title: string;
  data: Payment[];
  totalAmount: number;
}

