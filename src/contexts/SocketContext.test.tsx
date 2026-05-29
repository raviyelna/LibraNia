import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from './SocketContext';
import type { Socket } from 'socket.io-client';

// Mock socket.io-client - must be hoisted before imports
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn(),
    emit: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('SocketContext', () => {
  let mockIo: ReturnType<typeof vi.fn>;
  let mockSocket: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked io function
    const socketIoClient = await import('socket.io-client');
    mockIo = socketIoClient.io as ReturnType<typeof vi.fn>;
    // Get the mock socket instance
    mockSocket = mockIo();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: SocketProvider creates socket instance on mount', async () => {
    render(
      <SocketProvider>
        <div>Test Child</div>
      </SocketProvider>
    );

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        })
      );
    });
  });

  it('Test 2: useSocket returns socket instance and connected status', async () => {
    let socketValue: Socket | null = null;
    let connectedValue = false;

    function TestComponent() {
      const { socket, connected } = useSocket();
      socketValue = socket;
      connectedValue = connected;
      return <div>Test</div>;
    }

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(socketValue).toBeTruthy();
      expect(typeof connectedValue).toBe('boolean');
    });
  });

  it('Test 3: useSocket throws error when used outside SocketProvider', () => {
    function TestComponent() {
      useSocket();
      return <div>Test</div>;
    }

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useSocket must be used within SocketProvider'
    );

    consoleError.mockRestore();
  });

  it('Test 4: Socket disconnects and cleans up on unmount', async () => {
    const { unmount } = render(
      <SocketProvider>
        <div>Test Child</div>
      </SocketProvider>
    );

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
