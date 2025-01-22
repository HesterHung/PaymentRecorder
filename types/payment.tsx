import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONSTANTS = {
  AMOUNT_TYPES: ['total', 'specific'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments',
    USERS: 'users'
  },
  // Default PAYERS array for immediate use
  PAYERS: ['User 1', 'User 2'] as [string, string],
  // Method to update PAYERS
  async updatePayers() {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      return users.length >= 2 ? [users[0], users[1]] : ['User 1', 'User 2'];
    } catch (error) {
      console.error('Error getting payers:', error);
      return ['User 1', 'User 2'];
    }
  }
} as const;

// Create a service to manage PAYERS state
export const PayersService = {
  currentPayers: CONSTANTS.PAYERS,
  listeners: new Set<(payers: [string, string]) => void>(),

  setPayers(payers: [string, string]) {
    this.currentPayers = payers;
    this.notifyListeners();
  },

  getPayers() {
    return this.currentPayers;
  },

  subscribe(listener: (payers: [string, string]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentPayers));
  },

  async initialize() {
    const payers = await CONSTANTS.updatePayers();
    this.setPayers(payers);
  }
};

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];
export type ImageUploadStatus = 'uploading' | 'uploaded' | 'error' | 'pending';

export interface Payment {
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