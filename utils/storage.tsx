import AsyncStorage from '@react-native-async-storage/async-storage';
import { Payment, CONSTANTS } from '../types/payment';

export const StorageUtils = {
  async savePayment(payment: Omit<Payment, 'id' | 'isUploaded' | 'uploadStatus'>): Promise<Payment> {
    const timestamp = Date.now();
    const id = `payment_${timestamp}`;

    const newPayment: Payment = {
      ...payment,
      id,
      paymentDatetime: Number(payment.paymentDatetime) // Ensure it's a number
    };

    const payments = await this.getStoredPayments();
    payments.push(newPayment);
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    return newPayment;
  },

  async getStoredPayments(): Promise<Payment[]> {
    try {
      const payments = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEYS.PAYMENTS);
      if (!payments) return [];

      const parsedPayments = JSON.parse(payments);
      // Ensure paymentDatetime is always a number
      return parsedPayments.map((payment: Payment) => ({
        ...payment,
        paymentDatetime: Number(payment.paymentDatetime)
      }));
    } catch (error) {
      console.error('Error getting stored payments:', error);
      return [];
    }
  },

  async markAsUploaded(id: string): Promise<void> {
    const payments = await this.getStoredPayments();
    const updatedPayments = payments.map(payment =>
      payment.id === id
        ? { ...payment, isUploaded: true, uploadStatus: 'uploaded' }
        : payment
    );
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  async markUploadFailed(id: string, error?: string): Promise<void> {
    const payments = await this.getStoredPayments();
    const updatedPayments = payments.map(payment =>
      payment.id === id
        ? {
          ...payment,
          isUploaded: false,
          uploadStatus: 'error',
          uploadError: error || 'Upload failed'
        }
        : payment
    );
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  async deletePayment(id: string): Promise<void> {
    const payments = await this.getStoredPayments();
    const updatedPayments = payments.filter(payment => payment.id !== id);
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  updatePayment: async (id: string, updates: Partial<Payment>) => {
    try {
      const payments = await StorageUtils.getStoredPayments(); // Use the fixed getStoredPayments
      const updatedPayments = payments.map(payment =>
        payment.id === id
          ? {
            ...payment,
            ...updates,
            paymentDatetime: Number(updates.paymentDatetime ?? payment.paymentDatetime)
          }
          : payment
      );
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  retryUpload: async function (id: string) {
    try {
      const payments = await this.getStoredPayments();
      const payment = payments.find(p => p.id === id);

      if (payment) {
        await this.updatePayment(id, {
        });
      } else {
        throw new Error('Payment not found');
      }
    } catch (error) {
      console.error('Error preparing retry upload:', error);
      throw error;
    }
  },

  async clearAllPayments(): Promise<void> {
    try {
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
      console.log('Successfully cleared all payments');
    } catch (error) {
      console.error('Error clearing all payments:', error);
      throw error;
    }
  },

};