// utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSTANTS, Payment } from '../types/payment';

const STORAGE_KEYS = {
  PAYMENTS: 'payments',
  PENDING_UPLOADS: 'pending_uploads',
  API_PAYMENTS: 'api_payments', // New key for API-fetched payments
  LAST_API_PAYMENTS: 'last_api_payments', // New key for last fetched API data
  UPLOAD_HISTORY: 'upload_history'
};
const RETRY_STATUS_KEY = '@retry_status';
const UPLOAD_QUEUE_KEY = 'upload_queue';

export interface UploadHistoryEntry {
  paymentId: string;
  timestamp: number;          // When the upload attempt occurred
  paymentDatetime: number;    // When the payment was created
  status: 'success' | 'failed';
  paymentTitle: string;
  amount: number;
  error?: string;
}

export class StorageUtils {

  static LAST_UPDATED_KEY = 'lastUpdated';
  static LAST_API_PAYMENTS_KEY = 'lastApiPayments';

  static async handleAppBackground(): Promise<void> {
    try {
      const retryStatus = await this.getRetryStatus();
      const retryingPaymentIds = Object.keys(retryStatus).filter(id => retryStatus[id]);

      const payments = await this.getStoredPayments();
      for (const paymentId of retryingPaymentIds) {
        await this.setRetryStatus(paymentId, false);
        await this.addToUploadQueue(paymentId);

        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          await this.addUploadHistory({
            paymentId: payment.id,
            timestamp: Date.now(),
            paymentDatetime: payment.paymentDatetime, // Make sure this is included
            status: 'failed',
            paymentTitle: payment.title || 'Untitled',
            amount: payment.amount,
            error: 'Upload paused - App went to background'
          });
        }
      }

      console.log('Background handling completed');
    } catch (error) {
      console.error('Error handling background state:', error);
      throw error;
    }
  }

  static async handleAppForeground(): Promise<string | null> {  // Changed return type
    try {
      // Get the upload queue
      const queue = await this.getUploadQueue();
      if (queue.length > 0) {
        // Process first queued payment
        const firstPaymentId = queue[0];
        await this.removeFromUploadQueue(firstPaymentId);
        return firstPaymentId;
      }
      return null;
    } catch (error) {
      console.error('Error handling foreground state:', error);
      throw error;
    }
  }

  static async addUploadHistory(entry: UploadHistoryEntry): Promise<void> {
    try {
      const history = await this.getUploadHistory();
      history.unshift(entry); // Add new entry at the beginning
      // Keep only last 50 entries
      const trimmedHistory = history.slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.UPLOAD_HISTORY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error adding upload history:', error);
    }
  }

  static async getUploadHistory(): Promise<UploadHistoryEntry[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting upload history:', error);
      return [];
    }
  }

  static async storeApiPayments(payments: Payment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.API_PAYMENTS,
        JSON.stringify(payments)
      );
    } catch (error) {
      console.error('Error storing API payments:', error);
      throw error;
    }
  }

  static async getApiPayments(): Promise<Payment[]> {
    try {
      const paymentsJson = await AsyncStorage.getItem(STORAGE_KEYS.API_PAYMENTS);
      return paymentsJson ? JSON.parse(paymentsJson) : [];
    } catch (error) {
      console.error('Error getting API payments:', error);
      return [];
    }
  }

  static async setLastUpdated(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LAST_UPDATED_KEY, timestamp.toString());
    } catch (error) {
      console.error('Error saving last updated:', error);
    }
  }

  static async getLastUpdated(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.LAST_UPDATED_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting last updated:', error);
      return null;
    }
  }

  static async setLastApiPayments(payments: Payment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.LAST_API_PAYMENTS_KEY,
        JSON.stringify(payments)
      );
    } catch (error) {
      console.error('Error saving last API payments:', error);
    }
  }

  static async storeLastApiPayments(payments: Payment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_API_PAYMENTS,
        JSON.stringify(payments)
      );
    } catch (error) {
      console.error('Error storing last API payments:', error);
      throw error;
    }
  }

  static async getLastApiPayments(): Promise<Payment[]> {
    try {
      const paymentsJson = await AsyncStorage.getItem(STORAGE_KEYS.LAST_API_PAYMENTS);
      return paymentsJson ? JSON.parse(paymentsJson) : [];
    } catch (error) {
      console.error('Error getting last API payments:', error);
      return [];
    }
  }

  static async setRetryStatus(paymentId: string, isRetrying: boolean) {
    try {
      const currentStatus = await AsyncStorage.getItem(RETRY_STATUS_KEY);
      const retryStatus = currentStatus ? JSON.parse(currentStatus) : {};

      if (isRetrying) {
        retryStatus[paymentId] = true;
      } else {
        delete retryStatus[paymentId];
      }

      await AsyncStorage.setItem(RETRY_STATUS_KEY, JSON.stringify(retryStatus));
    } catch (error) {
      console.error('Error setting retry status:', error);
    }
  }

  static async getRetryStatus(): Promise<{ [key: string]: boolean }> {
    try {
      const status = await AsyncStorage.getItem(RETRY_STATUS_KEY);
      return status ? JSON.parse(status) : {};
    } catch (error) {
      console.error('Error getting retry status:', error);
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
        AsyncStorage.removeItem(CONSTANTS.STORAGE_KEYS.PENDING_UPLOADS),
        AsyncStorage.removeItem(RETRY_STATUS_KEY),  // Add this line
        AsyncStorage.removeItem(UPLOAD_QUEUE_KEY),   // Add this line if you have a queue
        AsyncStorage.removeItem(this.LAST_UPDATED_KEY),
        AsyncStorage.removeItem(STORAGE_KEYS.API_PAYMENTS), // Add this line
      ]);
    } catch (error) {
      console.error('Error clearing all payments:', error);
      throw error;
    }
  }

  static async debugPrintAllStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('==== Debug All Storage Keys ====');
      console.log('All keys in AsyncStorage:', allKeys);

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`\nKey: ${key}`);
        console.log('Value:', value);
      }
      console.log('============================');
    } catch (error) {
      console.error('Error printing storage:', error);
    }
  }

  static async forceResetRetryStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RETRY_STATUS_KEY);
      console.log('Retry status forcefully reset');
    } catch (error) {
      console.error('Error resetting retry status:', error);
    }
  }

  static async savePayment(payment: Omit<Payment, 'id'>): Promise<void> {
    try {
      const payments = await this.getStoredPayments();
      const newPayment: Payment = {
        ...payment,
        id: generateUniqueId(), // Implement this function
      };
      payments.push(newPayment);
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
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

  static async addToUploadQueue(paymentId: string): Promise<void> {
    try {
      const queue = await this.getUploadQueue();
      if (!queue.includes(paymentId)) {
        queue.push(paymentId);
        await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error adding to upload queue:', error);
    }
  }

  static async removeFromUploadQueue(paymentId: string): Promise<void> {
    try {
      const queue = await this.getUploadQueue();
      const updatedQueue = queue.filter(id => id !== paymentId);
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Error removing from upload queue:', error);
    }
  }

  static async getUploadQueue(): Promise<string[]> {
    try {
      const queue = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting upload queue:', error);
      return [];
    }
  }

  static async isInUploadQueue(paymentId: string): Promise<boolean> {
    const queue = await this.getUploadQueue();
    return queue.includes(paymentId);
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