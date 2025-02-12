// hooks/backgroundTasks.ts

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { StorageUtils } from '../utils/storage';
import APIService from '../services/api';
import { emitter } from '@/hooks/eventEmitter';
import { Payment } from '../types/payment';

export const BACKGROUND_UPLOAD_TASK = 'BACKGROUND_UPLOAD_TASK';

const TASK_RESULT = {
    NO_DATA: 1,
    NEW_DATA: 2,
    FAILED: 3,
};

// Define the background task
TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async () => {
    try {
        console.log('🔄 Background upload task started');

        // Get all pending uploads
        const pendingPayments = await StorageUtils.getPendingUploads();
        if (!pendingPayments.length) {
            console.log('No pending payments to upload');
            return TASK_RESULT.NO_DATA;
        }

        let hasSuccessfulUpload = false;

        for (const payment of pendingPayments) {
            try {
                // Check if this payment is already retried
                const isRetried = await StorageUtils.getRetryStatus(payment.id);
                if (isRetried) {
                    console.log(`Payment ${payment.id} already retried, skipping`);
                    continue;
                }

                console.log(`Attempting to upload payment ${payment.id}`);
                const paymentData = {
                    title: payment.title,
                    whoPaid: payment.whoPaid,
                    amount: payment.amount,
                    amountType: payment.amountType,
                    paymentDatetime: payment.paymentDatetime,
                };

                await APIService.savePayment(paymentData);

                // If successful, remove from pending
                await StorageUtils.removePendingUpload(payment.id);
                await StorageUtils.setRetryStatus(payment.id, false);
                hasSuccessfulUpload = true;

                console.log(`✅ Successfully uploaded payment ${payment.id}`);
                emitter.emit('paymentsUpdated');

            } catch (error) {
                console.error(`❌ Failed to upload payment ${payment.id}:`, error);
                // Mark as retried regardless of success or failure
                await StorageUtils.setRetryStatus(payment.id, true);
            }
        }

        return hasSuccessfulUpload ? TASK_RESULT.NEW_DATA : TASK_RESULT.FAILED;

    } catch (error) {
        console.error('Background task error:', error);
        return TASK_RESULT.FAILED;
    }
});

// Register background fetch
export async function registerBackgroundTasks() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPLOAD_TASK);

        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK, {
                minimumInterval: 60, // 1 minute
                stopOnTerminate: false,
                startOnBoot: true,
            });
            console.log('✅ Background fetch task registered');
        }
    } catch (err) {
        console.error('❌ Background fetch task registration failed:', err);
    }
}

// Test function
export async function testBackgroundUpload() {
    try {
        console.log('Testing background upload...');
        const status = await BackgroundFetch.getStatusAsync();
        console.log('Background fetch status:', status);

        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPLOAD_TASK);
        console.log('Is task registered:', isRegistered);

        if (isRegistered) {
            const pendingPayments = await StorageUtils.getPendingUploads();
            for (const payment of pendingPayments) {
                const isRetriing = await StorageUtils.getRetryStatus(payment.id);
                console.log(' isRetried', isRetriing);
                if (isRetriing) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        await APIService.savePayment({
                            title: payment.title,
                            whoPaid: payment.whoPaid,
                            amount: payment.amount,
                            amountType: payment.amountType,
                            paymentDatetime: payment.paymentDatetime,
                        });
                        await StorageUtils.removePendingUpload(payment.id);
                        await StorageUtils.setRetryStatus(payment.id, false);
                        console.log(`✅ Successfully uploaded payment ${payment.id}`);
                        emitter.emit('paymentsUpdated');
                    } catch (error) {
                        console.error(`Failed to upload payment ${payment.id}:`, error);
                        await StorageUtils.setRetryStatus(payment.id, true);
                    }
                }
            }
        } else {
            console.log('Background task not registered');
            await registerBackgroundTasks();
        }
    } catch (error) {
        console.error('Error testing background upload:', error);
    }
}