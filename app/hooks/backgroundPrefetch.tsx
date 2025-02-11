// backgroundPrefetch.js
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const TASK_NAME = 'background-pre-fetch';

// Define the background task.
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Replace this URL with an endpoint that responds quickly (or your actual data pre-fetch endpoint)
    const response = await fetch('https://tr-cl4p.onrender.com/api');
    if (response.ok) {
      console.log('Background prefetch: Server is online.');
      // Optionally, you could update a local cache or state here.
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('Background prefetch: Server responded with status', response.status);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('Background prefetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background fetch task.
// You can call this registration function from your main App component (or RootLayout).
export const registerBackgroundPrefetchTask = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 300, // Run task every 5 minutes (this is a minimum; actual timing is determined by OSes)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background prefetch task registered.');
  } catch (error) {
    console.error('Error registering background prefetch task:', error);
  }
};