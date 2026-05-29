const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export class APIError extends Error {
    status;
    data;
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = 'APIError';
    }
}
export async function apiRequest(endpoint, options) {
    const url = `${BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new APIError(errorData.error || `HTTP ${response.status}`, response.status, errorData);
        }
        return await response.json();
    }
    catch (error) {
        if (error instanceof APIError)
            throw error;
        throw new APIError('Network error - check connection', 0, { originalError: error });
    }
}
