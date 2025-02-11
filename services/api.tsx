// services/api.ts

import { Payment } from "@/types/payment";

export interface PaymentPayload {
    title: string;
    whoPaid: string;
    amount: number;
    amountType: 'total' | 'specify'; // Updated type definition
    paymentDatetime: number;
}

interface ApiResponse {
    [key: string]: {
        id: string;
        title: string;
        whoPaid: string;
        amount: number;
        amountType: string;
        paymentDatetime: number;
        description?: string;
        serverUri?: string | null;
        isUploaded?: boolean;
        uploadError?: string | null;
        uploadStatus?: string;
        imageUploadStatus?: {
            status: string;
            progress: number;
        };
        createdAt?: any;
    }
}

export class APIService {
    private static BASE_URL = 'https://tr-cl4p.onrender.com/api';
    private static DELAY_MS = 10000;

    private static async simulateDelay(delay: Boolean): Promise<void> {
        if (delay) {
            await new Promise(resolve => setTimeout(resolve, this.DELAY_MS));
        }
    }

    static async savePayment(payment: PaymentPayload, delay: Boolean = false): Promise<Response> {
        const endpoint = `${this.BASE_URL}/records`;
        console.log('Attempting to save to:', endpoint);

        // Use 10 second timeout (10000 milliseconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10); // Changed from 1 to 10000

        try {
            await this.simulateDelay(delay);

            console.log('Sending POST request with payload:', payment);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payment),
                signal: controller.signal
            });

            clearTimeout(timeoutId); // Clear the timeout if request completes

            console.log('POST response status:', response.status);
            console.log('POST response headers:', [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const responseData = await response.json();
            console.log('Success response:', responseData);
            return responseData;

        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.error('Request timed out after 10 seconds');
                    throw new Error('Request timed out after 10 seconds');
                }
                console.error('Full error details:', error);
                throw error;
            }
            throw new Error('Unknown error occurred');
        } finally {
            clearTimeout(timeoutId); // Ensure timeout is cleared in all cases
        }
    }

    static async getPayments(): Promise<Payment[]> {
        try {
            const response = await fetch(`${this.BASE_URL}/records`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Raw API Response:', responseData); // Debug log

            // Check if response has records array
            if (!responseData.records || !Array.isArray(responseData.records)) {
                console.error('No records array in response:', responseData);
                return [];
            }

            // Map the records array to Payment objects
            return responseData.records.map((record: any) => ({
                id: record.id,
                title: record.title || '',
                whoPaid: record.whoPaid || '',
                amount: Number(record.amount) || 0,
                amountType: record.amountType || '',
                paymentDatetime: Number(record.paymentDatetime) || Date.now()
            }));

        } catch (error) {
            console.error('Error fetching payments:', error);
            throw error;
        }
    }
    static async deletePayment(id: string): Promise<void> {
        const endpoint = `${this.BASE_URL}/records/${id}`;
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting payment:', error);
            throw error;
        }
    }

    static async updatePayment(id: string, payment: Omit<Payment, 'id'>): Promise<void> {
        // Fix 1: Use the BASE_URL constant
        const endpoint = `${this.BASE_URL}/records/${id}`;

        try {
            // Fix 2: Send the complete payment data
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    title: payment.title,
                    whoPaid: payment.whoPaid,
                    amount: payment.amount,
                    amountType: payment.amountType,
                    paymentDatetime: payment.paymentDatetime,
                    description: "Changed payment details"
                }),
            });

            // Fix 3: Better error handling
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Update failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Failed to update payment: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error in updatePayment:', error);
            throw error;
        }
    }


}

export default APIService;