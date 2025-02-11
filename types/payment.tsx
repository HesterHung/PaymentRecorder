import AsyncStorage from '@react-native-async-storage/async-storage';

// Define PayerTuple type
type PayerTuple = [string, string];

export const CONSTANTS = {
  AMOUNT_TYPES: ['total', 'specify'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments',
    USERS: 'users',
    PENDING_UPLOADS: 'pending_uploads'  // Add this line
  },
  // Default PAYERS array for immediate use
  PAYERS: ['Hester', 'Lok'] as PayerTuple,
  // Method to update PAYERS
  async updatePayers(): Promise<PayerTuple> {
    try {
      const storedUsers = await AsyncStorage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      return users.length >= 2
        ? [users[0], users[1]] as PayerTuple
        : CONSTANTS.PAYERS;
    } catch (error) {
      console.error('Error getting payers:', error);
      return CONSTANTS.PAYERS;
    }
  }
} as const;

// Create a service to manage PAYERS state
export const PayersService = {
  currentPayers: CONSTANTS.PAYERS,
  listeners: new Set<(payers: PayerTuple) => void>(),

  setPayers(payers: PayerTuple) {
    this.currentPayers = payers;
    this.notifyListeners();
  },

  getPayers() {
    return this.currentPayers;
  },

  subscribe(listener: (payers: PayerTuple) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentPayers));
  },

  async initialize() {
    const payers = await CONSTANTS.updatePayers();
    this.setPayers(payers); // Pass the entire payers tuple
  }
};

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];

export interface Payment {
  id: string;
  title: string;
  whoPaid: Payer;
  amount: number;
  amountType: 'total' | 'specify';
  paymentDatetime: number;
}

export interface GroupedPayments {
  title: string;
  data: Payment[];
  totalAmount: number;
}