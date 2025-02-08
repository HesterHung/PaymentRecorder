// services/api.ts

export interface PaymentPayload {
    title: string;
    whoPaid: string;
    amount: number;
    amountType: 'total' | 'specific';
    paymentDatetime: number;
}

export class APIService {
    private static BASE_URL = 'https://tr-cl4p.onrender.com/api';

    static async savePayment(payment: PaymentPayload): Promise<Response> {
        const endpoint = `${this.BASE_URL}/records`;
        console.log('Attempting to save to:', endpoint);

        // Test GET request first
        try {
            console.log('Testing GET request...');
            const getResponse = await fetch(endpoint);
            console.log('GET response status:', getResponse.status);
            console.log('GET response headers:', [...getResponse.headers.entries()]);
            const getData = await getResponse.json();
            console.log('GET response data:', getData);
        } catch (getError) {
            console.error('GET test failed:', getError);
        }

        // Original POST request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
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

            clearTimeout(timeoutId);

            console.log('POST response status:', response.status);
            console.log('POST response headers:', [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            return await response.json();
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                console.error('Full error details:', error);
                throw error;
            }
            throw new Error('Unknown error occurred');
        }
    }
}

export default APIService;