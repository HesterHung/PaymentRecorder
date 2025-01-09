export type ImageUploadStatus = 'uploading' | 'uploaded' | 'error' | 'pending';

export interface Payment {
  id: string;
  title: string;
  whoPaid: string;
  amount: number;
  amountType: string;
  date: number;
  uri: string | null;      // Local file path
  serverUri: string | null; // Server URL after upload
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

export const CONSTANTS = {
  PAYERS: ['Person1', 'Person2'] as const,
  AMOUNT_TYPES: ['total', 'specific'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments'
  }
} as const;

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];