import * as FileSystem from 'expo-file-system';
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

  savePaymentWithImage: async (payment: Omit<Payment, 'id'>, localUri: string) => {
    const id = Date.now().toString();
    const newPayment: Payment = {
      ...payment,
      id,
      uri: localUri,    // Local file path
      serverUri: null, // Will be updated after upload
      isUploaded: false,
      uploadStatus: 'uploading',
      uploadError: null
    };

    try {
      const existingPayments = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEYS.PAYMENTS);
      const payments: Payment[] = existingPayments
        ? JSON.parse(existingPayments)
        : [];

      payments.unshift(newPayment);
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

      return newPayment;
    } catch (error) {
      console.error('Error saving payment:', error);
      throw error;
    }
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
    const payment = payments.find(p => p.id === id);

    // Delete image file if exists
    if (payment?.uri) {
      try {
        await FileSystem.deleteAsync(payment.uri);
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
    }

    // Remove from storage
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


  retryUpload: async function (id: string) {  // Changed to regular function
    try {
      const payments = await this.getStoredPayments();
      const payment = payments.find(p => p.id === id);

      if (payment) {
        await this.updatePayment(id, {
          uploadStatus: 'uploading',
          uploadError: null
        });
        return payment.uri; // Return the local URI for re-upload
      }
      throw new Error('Payment not found');
    } catch (error) {
      console.error('Error preparing retry upload:', error);
      throw error;
    }
  },

  // Helper method to clean up orphaned images
  async cleanupOrphanedImages(): Promise<void> {
    try {
      const payments = await this.getStoredPayments();
      const receiptsDir = `${FileSystem.documentDirectory}receipts/`;
      const files = await FileSystem.readDirectoryAsync(receiptsDir);

      for (const file of files) {
        const filePath = `${receiptsDir}${file}`;
        const isUsed = payments.some(payment => payment.uri === filePath);

        if (!isUsed) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned images:', error);
    }
  }
};