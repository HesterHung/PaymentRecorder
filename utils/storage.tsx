import AsyncStorage from '@react-native-async-storage/async-storage';
import { Payment, CONSTANTS } from '../types/payment';

export const StorageUtils = {
  async savePayment(payment: Omit<Payment, 'id' | 'isUploaded' | 'uploadStatus'>): Promise<Payment> {
    const timestamp = Date.now();
    const id = `payment_${timestamp}`;

    const newPayment: Payment = {
      ...payment,
      id,
      isUploaded: false,
      uploadStatus: 'uploading',
    };

    const payments = await this.getStoredPayments();
    payments.push(newPayment);
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    return newPayment;
  },

  async getStoredPayments(): Promise<Payment[]> {
    const payments = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEYS.PAYMENTS);
    return payments ? JSON.parse(payments) : [];
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
      const existingPayments = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEYS.PAYMENTS);
      if (existingPayments) {
        const payments: Payment[] = JSON.parse(existingPayments);
        const updatedPayments = payments.map(payment =>
          payment.id === id
            ? { ...payment, ...updates }
            : payment
        );
        await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
      }
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
          uploadStatus: 'uploading',
          uploadError: null
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