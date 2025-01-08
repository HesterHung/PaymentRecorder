import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Payment, CONSTANTS } from '../types/payment';

export const StorageUtils = {
  async savePayment(payment: Omit<Payment, 'id' | 'isUploaded'>): Promise<Payment> {
    const timestamp = Date.now();
    const id = `payment_${timestamp}`;
    
    const newPayment: Payment = {
      ...payment,
      id,
      isUploaded: false,
    };

    const payments = await this.getStoredPayments();
    payments.push(newPayment);
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    return newPayment;
  },

  async savePaymentWithImage(
    paymentData: Omit<Payment, 'id' | 'isUploaded' | 'uri' | 'localPath'>,
    imageUri: string
  ): Promise<Payment> {
    const timestamp = Date.now();
    const filename = `receipt_${timestamp}.jpg`;
    const localPath = `${FileSystem.documentDirectory}receipts/${filename}`;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}receipts/`,
      { intermediates: true }
    );

    // Copy image to local storage
    await FileSystem.copyAsync({
      from: imageUri,
      to: localPath
    });

    const newPayment: Payment = {
      ...paymentData,
      id: `payment_${timestamp}`,
      uri: imageUri,
      localPath,
      isUploaded: false,
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
      payment.id === id ? { ...payment, isUploaded: true } : payment
    );
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  async deletePayment(id: string): Promise<void> {
    const payments = await this.getStoredPayments();
    const payment = payments.find(p => p.id === id);

    // Delete image file if exists
    if (payment?.localPath) {
      try {
        await FileSystem.deleteAsync(payment.localPath);
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
    }

    // Remove from storage
    const updatedPayments = payments.filter(payment => payment.id !== id);
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  async updatePayment(updatedPayment: Payment): Promise<void> {
    const payments = await this.getStoredPayments();
    const updatedPayments = payments.map(payment => 
      payment.id === updatedPayment.id ? updatedPayment : payment
    );
    await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
  },

  // Helper method to clean up orphaned image files
  async cleanupOrphanedImages(): Promise<void> {
    try {
      const payments = await this.getStoredPayments();
      const receiptsDir = `${FileSystem.documentDirectory}receipts/`;
      const files = await FileSystem.readDirectoryAsync(receiptsDir);
      
      for (const file of files) {
        const filePath = `${receiptsDir}${file}`;
        const isUsed = payments.some(payment => payment.localPath === filePath);
        
        if (!isUsed) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned images:', error);
    }
  }
};