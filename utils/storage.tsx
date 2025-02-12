// utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSTANTS, Payment } from '../types/payment';

const STORAGE_KEYS = {
  PAYMENTS: 'payments',
  PENDING_UPLOADS: 'pending_uploads',
  RETRY_COUNT: '@retry_count',
};
const RETRY_STATUS_KEY = '@retry_status';

export class StorageUtils {


  static async setRetryStatus(paymentId: string, status: boolean): Promise<void> {
    try {
      const currentStatus = await this.getAllRetryStatuses();
      const newStatus = {
        ...currentStatus,
        [paymentId]: status
      };
      await AsyncStorage.setItem(
        `${CONSTANTS.STORAGE_KEYS.RETRY_STATUS}`,
        JSON.stringify(newStatus)
      );
    } catch (error) {
      console.error('Error setting retry status:', error);
    }
  }

  static async getRetryStatus(paymentId: string): Promise<boolean> {
    try {
      const retryStatusString = await AsyncStorage.getItem(`${CONSTANTS.STORAGE_KEYS.RETRY_STATUS}`);
      const retryStatus = retryStatusString ? JSON.parse(retryStatusString) : {};
      return !!retryStatus[paymentId];
    } catch (error) {
      console.error('Error getting retry status:', error);
      return false;
    }
  }

  static async getAllRetryStatuses(): Promise<{ [key: string]: boolean }> {
    try {
      const retryStatusString = await AsyncStorage.getItem(`${CONSTANTS.STORAGE_KEYS.RETRY_STATUS}`);
      return retryStatusString ? JSON.parse(retryStatusString) : {};
    } catch (error) {
      console.error('Error getting all retry statuses:', error);
      return {};
    }
  }


  static async clearRetryStatus() {
    try {
      await AsyncStorage.removeItem(RETRY_STATUS_KEY);
    } catch (error) {
      console.error('Error clearing retry status:', error);
    }
  }

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
      const payments = await this.getStoredPayments();
      const newPayment: Payment = {
        ...payment,
        id: generateUniqueId(),
      };
      payments.push(newPayment);
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      return newPayment; // Return the newly created payment
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
      if (!pendingUploads.find(p => p.id === payment.id)) {
        pendingUploads.push(payment);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(pendingUploads));
      }
    } catch (error) {
      console.error('Error adding pending upload:', error);
    }
  }

  static async getPendingUploads(): Promise<Payment[]> {
    try {
      const pendingUploadsString = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS);
      return pendingUploadsString ? JSON.parse(pendingUploadsString) : [];
    } catch (error) {
      console.error('Error getting pending uploads:', error);
      return [];
    }
  }

  static async removePendingUpload(paymentId: string): Promise<void> {
    try {
      const pendingUploads = await this.getPendingUploads();
      const filteredUploads = pendingUploads.filter(p => p.id !== paymentId);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(filteredUploads));
    } catch (error) {
      console.error('Error removing pending upload:', error);
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

  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item:', error);
    }
  }

  // Add these methods for retry count management
  static async getRetryCount(paymentId: string): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(`retry-count-${paymentId}`);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Error getting retry count:', error);
      return 0;
    }
  }

  static async resetRetryCount(paymentId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`retry-count-${paymentId}`);
    } catch (error) {
      console.error('Error resetting retry count:', error);
    }
  }

  static async incrementRetryCount(paymentId: string): Promise<void> {
    try {
      const currentCount = await this.getRetryCount(paymentId);
      await AsyncStorage.setItem(
        `retry-count-${paymentId}`,
        (currentCount + 1).toString()
      );
    } catch (error) {
      console.error('Error incrementing retry count:', error);
    }
  }
}

function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const randomStr = random.toString(36);
  return `${timestamp}-${randomStr}`;
}