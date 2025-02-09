import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONSTANTS = {
  AMOUNT_TYPES: ['total', 'specify'] as const,
  STORAGE_KEYS: {
    PAYMENTS: 'stored_payments',
    USERS: 'users'
  },
  // Default PAYERS array for immediate use
  PAYERS: ['Hester', 'Lok'] as [string, string],
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
    this.setPayers(payers[0]);
  }
};

export type Payer = typeof CONSTANTS.PAYERS[number];
export type AmountType = typeof CONSTANTS.AMOUNT_TYPES[number];

export interface Payment {
  id: string;
  title: string;
  whoPaid: Payer;
  amount: number;
  amountType: 'total' | 'specify'; // Updated type definition
  paymentDatetime: number;
}

export interface GroupedPayments {
  title: string;
  data: Payment[];
  totalAmount: number;
}