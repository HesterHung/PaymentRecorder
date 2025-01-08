import { StorageUtils } from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';

export const UploadService = {
  async uploadPendingPayments() {
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      return;
    }

    const payments = await StorageUtils.getStoredPayments();
    const pendingPayments = payments.filter(payment => !payment.isUploaded);

    for (const payment of pendingPayments) {
      try {
        // Implement your server upload logic here
        // const response = await uploadToServer(receipt.uri);
        
        // Mark as uploaded after successful upload
        await StorageUtils.markAsUploaded(payment.id);
      } catch (error) {
        console.error('Upload failed for receipt:', payment.id, error);
      }
    }
  }
};