import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import APIService from '@/services/api';
import { Payment } from '@/types/payment';

const TASK_NAME = 'background-pre-fetch';

// Define the task result type
type BackgroundFetchResult = typeof BackgroundFetch.BackgroundFetchResult[keyof typeof BackgroundFetch.BackgroundFetchResult];

// Define the background task
TaskManager.defineTask(TASK_NAME, async (): Promise<BackgroundFetchResult> => {
  try {
    // Fetch payments from the API
    console.log('trying to fetch payment');

    const payments: Payment[] = await APIService.getPayments();

    // Log success for debugging
    console.log('Background fetch completed successfully:', payments.length, 'payments retrieved');

    // Return success status to the system
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    // Log any errors that occur
    console.error('Background fetch failed:', error instanceof Error ? error.message : 'Unknown error');

    // Return failure status to the system
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define the options type for background fetch
interface BackgroundFetchOptions {
  minimumInterval: number;
  stopOnTerminate: boolean;
  startOnBoot: boolean;
}

// Register the background fetch task
export const registerBackgroundPrefetchTask = async (): Promise<void> => {
  try {
    const options: BackgroundFetchOptions = {
      minimumInterval: 300, // Run task every 5 minutes (minimum)
      stopOnTerminate: false, // Continue running when app is terminated
      startOnBoot: true, // Start task on device boot
    };

    await BackgroundFetch.registerTaskAsync(TASK_NAME, options);
    console.log('Background prefetch task registered.');
  } catch (error) {
    console.error('Error registering background prefetch task:',
      error instanceof Error ? error.message : 'Unknown error');
  }
};

// Optional: Function to unregister the task if needed
export const unregisterBackgroundPrefetchTask = async (): Promise<void> => {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    console.log('Background prefetch task unregistered.');
  } catch (error) {
    console.error('Error unregistering background prefetch task:',
      error instanceof Error ? error.message : 'Unknown error');
  }
};
