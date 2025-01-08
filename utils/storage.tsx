import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReceiptImage {
  id: string;
  uri: string;
  timestamp: number;
  isUploaded: boolean;
  localPath: string;
}

export const StorageUtils = {
  async saveImage(imageUri: string): Promise<ReceiptImage> {
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

    const receipt: ReceiptImage = {
      id: filename,
      uri: localPath,
      timestamp,
      isUploaded: false,
      localPath
    };

    // Save metadata
    const receipts = await this.getStoredReceipts();
    receipts.push(receipt);
    await AsyncStorage.setItem('receipts', JSON.stringify(receipts));

    return receipt;
  },

  async getStoredReceipts(): Promise<ReceiptImage[]> {
    const receipts = await AsyncStorage.getItem('receipts');
    return receipts ? JSON.parse(receipts) : [];
  },

  async markAsUploaded(id: string): Promise<void> {
    const receipts = await this.getStoredReceipts();
    const updatedReceipts = receipts.map(receipt => 
      receipt.id === id ? { ...receipt, isUploaded: true } : receipt
    );
    await AsyncStorage.setItem('receipts', JSON.stringify(updatedReceipts));
  }
};