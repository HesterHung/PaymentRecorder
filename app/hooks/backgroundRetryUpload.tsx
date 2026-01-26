import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { StorageUtils } from '@/utils/storage';
import APIService from '@/services/api';
import { Payment } from '@/types/payment';
import { AppState } from 'react-native';

const TASK_NAME = 'background-retry-upload';

TaskManager.defineTask(
  TASK_NAME,
  async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
    try {
      // 1. SAFETY CHECK: If the app is currently OPEN and ACTIVE, 
      // skip background processing. Let the foreground UI handle uploads
      // to avoid race conditions (double uploads) and conflicts.
      if (AppState.currentState === 'active') {
        console.log('App is active, skipping background retry task.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Retrieve the list of pending payments saved locally
      const pendingPayments: Payment[] = await StorageUtils.getStoredPayments();
      if (!pendingPayments || pendingPayments.length === 0) {
        console.log('No pending payments for background retry.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // BALANCED STRATEGY: Process only ONE payment per background wake-up.
      // This prevents "unstoppable" loops.
      const payment = pendingPayments[0];
      console.log(`Background task attempting to upload: ${payment.title}`);

      try {
        await APIService.savePayment({
          title: payment.title,
          whoPaid: payment.whoPaid,
          amount: payment.amount,
          amountType: payment.amountType,
          paymentDatetime: payment.paymentDatetime,
        });

        // Add success entry to history
        await StorageUtils.addUploadHistory({
          paymentId: payment.id,
          timestamp: Date.now(),
          status: 'success',
          paymentTitle: payment.title,
          amount: payment.amount,
          paymentDatetime: payment.paymentDatetime,
        });

        await StorageUtils.deletePayment(payment.id);
        await StorageUtils.setRetryStatus(payment.id, false);
        
        // Note: 'paymentsUpdated' is purposefully NOT emitted here to save GET quota.
        
        return BackgroundFetch.BackgroundFetchResult.NewData;

      } catch (uploadError) {
        // Add failure entry to history
        await StorageUtils.addUploadHistory({
          paymentId: payment.id,
          timestamp: Date.now(),
          status: 'failed',
          paymentTitle: payment.title,
          amount: payment.amount,
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          paymentDatetime: payment.paymentDatetime,
        });
        
        // Return Failed so the OS knows to back off
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    } catch (error) {
      console.error('Background retry upload encountered an error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }
);

export const registerBackgroundRetryTask = async (): Promise<void> => {
  try {
    const options = {
      minimumInterval: 60 * 15, // Increase to 15 minutes to save battery/resources
      stopOnTerminate: false,
      startOnBoot: true,
    };
    await BackgroundFetch.registerTaskAsync(TASK_NAME, options);
    console.log('Background retry upload task registered.');
  } catch (error) {
    console.error(
      'Error registering background retry upload task:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

export const unregisterBackgroundRetryTask = async (): Promise<void> => {
  try {
    // Unregister the background task
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);

    console.log('Background retry upload task unregistered and cleaned up.');
  } catch (error) {
    console.error(
      'Error unregistering background retry upload task:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};