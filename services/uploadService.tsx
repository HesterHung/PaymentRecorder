import { StorageUtils } from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';

export const UploadService = {
  async uploadPendingReceipts() {
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      return;
    }

    const receipts = await StorageUtils.getStoredReceipts();
    const pendingReceipts = receipts.filter(receipt => !receipt.isUploaded);

    for (const receipt of pendingReceipts) {
      try {
        // Implement your server upload logic here
        // const response = await uploadToServer(receipt.uri);
        
        // Mark as uploaded after successful upload
        await StorageUtils.markAsUploaded(receipt.id);
      } catch (error) {
        console.error('Upload failed for receipt:', receipt.id, error);
      }
    }
  }
};