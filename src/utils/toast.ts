/**
 * Toast notification helpers
 */

import toast from 'react-hot-toast';
import { APIError } from '../api/client';

/**
 * Handle API errors with user-friendly toast notifications
 * Categorizes errors by type and shows appropriate messages
 */
export function handleAPIError(error: unknown): void {
  if (error instanceof APIError) {
    if (error.status === 0) {
      // Network error - no response received
      toast.error('Connection failed - check your network');
    } else if (error.status >= 400 && error.status < 500) {
      // Client error - validation, not found, etc.
      toast.error(error.message);
    } else {
      // Server error - 500+
      toast.error('Server error - please try again');
    }
  } else {
    // Unknown error type
    toast.error('An unexpected error occurred');
  }

  // Always log full error for debugging
  console.error('API Error:', error);
}
