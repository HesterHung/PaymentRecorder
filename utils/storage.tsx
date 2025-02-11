// utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSTANTS, Payment } from '../types/payment';

const STORAGE_KEYS = {
  PAYMENTS: 'payments',
  PENDING_UPLOADS: 'pending_uploads',
};

export class StorageUtils {

  static async clearAllPayments(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CONSTANTS.STORAGE_KEYS.PAYMENTS),
        AsyncStorage.removeItem(CONSTANTS.STORAGE_KEYS.PENDING_UPLOADS)
      ]);
    } catch (error) {
      console.error('Error clearing all payments:', error);
      throw error;
    }
  }

  static async savePayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    try {
      const localId = `local_${generateUniqueId()}`; // Generate the ID first
      const newPayment: Payment = {
        ...payment,
        id: localId,
      };

      const payments = await this.getStoredPayments();
      payments.push(newPayment);
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

      return newPayment; // Return the complete payment object with ID
    } catch (error) {
      console.error('Error storing payment:', error);
      throw error;
    }
  }

  static async updatePayment(id: string, payment: Omit<Payment, 'id'>): Promise<void> {
    try {
      const payments = await this.getStoredPayments();
      const index = payments.findIndex(p => p.id === id);
      if (index !== -1) {
        payments[index] = {
          ...payment,
          id,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  static async storePayment(payment: Payment): Promise<void> {
    try {
      const existingPayments = await this.getStoredPayments();
      const updatedPayments = [...existingPayments, payment];
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
    } catch (error) {
      console.error('Error storing payment:', error);
      throw error;
    }
  }

  static async getStoredPayments(): Promise<Payment[]> {
    try {
      const paymentsJson = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return paymentsJson ? JSON.parse(paymentsJson) : [];
    } catch (error) {
      console.error('Error getting stored payments:', error);
      return [];
    }
  }

  static async addPendingUpload(payment: Payment): Promise<void> {
    try {
      const pendingUploads = await this.getPendingUploads();
      pendingUploads.push(payment);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(pendingUploads)
      );
    } catch (error) {
      console.error('Error adding pending upload:', error);
      throw error;
    }
  }

  static async getPendingUploads(): Promise<Payment[]> {
    try {
      const pendingUploadsJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS);
      return pendingUploadsJson ? JSON.parse(pendingUploadsJson) : [];
    } catch (error) {
      console.error('Error getting pending uploads:', error);
      return [];
    }
  }

  static async removePendingUpload(paymentId: string): Promise<void> {
    try {
      const pendingUploads = await this.getPendingUploads();
      const filteredUploads = pendingUploads.filter(p => p.id !== paymentId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPLOADS,
        JSON.stringify(filteredUploads)
      );
    } catch (error) {
      console.error('Error removing pending upload:', error);
      throw error;
    }
  }
  static async deletePayment(paymentId: string): Promise<void> {
    try {
      // Remove from main storage
      const payments = await this.getStoredPayments();
      const updatedPayments = payments.filter(p => p.id !== paymentId);
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));

      // Also remove from pending uploads if it exists there
      await this.removePendingUpload(paymentId);
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }
}

function generateUniqueId(): string {
  // Get current timestamp
  const timestamp = Date.now();

  // Generate a random number between 0 and 999999
  const random = Math.floor(Math.random() * 1000000);

  // Convert to base 36 (uses letters and numbers) and remove the '0.' at the start
  const randomStr = random.toString(36);

  // Combine timestamp and random string
  const uniqueId = `${timestamp}-${randomStr}`;

  return uniqueId;
}