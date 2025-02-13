import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { StorageUtils } from '@/utils/storage';
import APIService from '@/services/api';
import { Payment } from '@/types/payment';
import { emitter } from '@/hooks/eventEmitter';

const TASK_NAME = 'background-retry-upload';

TaskManager.defineTask(
  TASK_NAME,
  async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
    try {
      // Retrieve the list of pending payments saved locally
      const pendingPayments: Payment[] = await StorageUtils.getStoredPayments();
      if (!pendingPayments || pendingPayments.length === 0) {
        console.log('No pending payments for background retry.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Loop through each pending payment and try to reupload it
      for (const payment of pendingPayments) {
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
            amount: payment.amount
          });

          await StorageUtils.deletePayment(payment.id);
          await StorageUtils.setRetryStatus(payment.id, false);
          emitter.emit('paymentsUpdated');

        } catch (uploadError) {
          // Add failure entry to history
          await StorageUtils.addUploadHistory({
            paymentId: payment.id,
            timestamp: Date.now(),
            status: 'failed',
            paymentTitle: payment.title,
            amount: payment.amount,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
          });
        }
      }
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background retry upload encountered an error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }
);

export const registerBackgroundRetryTask = async (): Promise<void> => {
  try {
    const options = {
      minimumInterval: 300, // Try every 5 minutes (note: actual run time depends on OS conditions)
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

    // Perform cleanup
    await StorageUtils.cleanupOnTerminate();

    console.log('Background retry upload task unregistered and cleaned up.');
  } catch (error) {
    console.error(
      'Error unregistering background retry upload task:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};