import toast from 'react-hot-toast';
import { APIError } from '../api/client.js';
export function handleAPIError(error) {
    if (error instanceof APIError) {
        if (error.status === 0) {
            toast.error('Connection failed - check your network');
        }
        else if (error.status >= 400 && error.status < 500) {
            toast.error(error.message);
        }
        else {
            toast.error('Server error - please try again');
        }
    }
    else {
        toast.error('An unexpected error occurred');
    }
    console.error('API Error:', error);
}
