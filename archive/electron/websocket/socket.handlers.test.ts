import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer, Server as HTTPServer } from 'http';
import { setupSocketHandlers } from './socket.handlers';

// Mock dependencies
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../store/env.store', () => ({
  loadProviderFromEnv: vi.fn((providerId: string) => {
    if (providerId === 'deepseek') {
      return {
        id: 'deepseek',
        apiKey: 'test-api-key',
        model: 'deepseek-chat',
      };
    }
    return null;
  }),
}));

vi.mock('../ipc/ai.handlers', () => ({
  callDeepSeek: vi.fn(async (messages, apiKey, model, tools, onProgress) => {
    // Simulate streaming tokens
    if (onProgress) {
      onProgress('Token 1');
      onProgress('Token 2');
      onProgress('Token 3');
    }
    return 'Test response from DeepSeek';
  }),
  callClaude: vi.fn(async (messages, apiKey, model, baseURL, tools, onProgress) => {
    if (onProgress) {
      onProgress('Claude token');
    }
    return 'Test response from Claude';
  }),
  callOpenAI: vi.fn(async (messages, apiKey, model, baseURL, tools, onProgress) => {
    if (onProgress) {
      onProgress('OpenAI token');
    }
    return 'Test response from OpenAI';
  }),
}));

describe('Socket.IO Handlers', () => {
  let httpServer: HTTPServer;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new SocketIOServer(httpServer);

    // Setup handlers
    setupSocketHandlers(io);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const address = httpServer.address();
        port = typeof address === 'object' && address ? address.port : 3000;
        resolve();
      });
    });

    // Create client connection and wait for it to connect
    await new Promise<void>((resolve) => {
      clientSocket = ioClient(`http://localhost:${port}`);
      clientSocket.on('connect', () => {
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
    vi.clearAllMocks();
  });

  it('Test 1: ai:chat event with valid data streams tokens via ai:token events', (done) => {
    const tokens: string[] = [];

    clientSocket.on('ai:token', (data) => {
      tokens.push(data.token);
    });

    clientSocket.on('ai:complete', (data) => {
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens).toContain('Token 1');
      expect(data.conversationId).toBe('test-conv-1');
      expect(data.content).toBe('Test response from DeepSeek');
      done();
    });

    clientSocket.emit('ai:chat', {
      conversationId: 'test-conv-1',
      messages: [{ role: 'user', content: 'Hello' }],
      providerId: 'deepseek',
    });
  });

  it('Test 2: ai:chat event emits ai:complete when streaming finishes', (done) => {
    clientSocket.on('ai:complete', (data) => {
      expect(data.conversationId).toBe('test-conv-2');
      expect(data.content).toBeTruthy();
      expect(typeof data.content).toBe('string');
      done();
    });

    clientSocket.emit('ai:chat', {
      conversationId: 'test-conv-2',
      messages: [{ role: 'user', content: 'Test message' }],
      providerId: 'deepseek',
    });
  });

  it('Test 3: ai:chat event emits ai:error if provider not configured', (done) => {
    clientSocket.on('ai:error', (data) => {
      expect(data.conversationId).toBe('test-conv-3');
      expect(data.error).toContain('not configured');
      done();
    });

    clientSocket.emit('ai:chat', {
      conversationId: 'test-conv-3',
      messages: [{ role: 'user', content: 'Hello' }],
      providerId: 'invalid-provider',
    });
  });

  it('Test 4: ai:chat event emits ai:error if AI call fails', async () => {
    // Mock AI handler to throw error
    const aiHandlers = await import('../ipc/ai.handlers');
    vi.mocked(aiHandlers.callDeepSeek).mockRejectedValueOnce(new Error('API call failed'));

    return new Promise<void>((resolve) => {
      clientSocket.on('ai:error', (data) => {
        expect(data.conversationId).toBe('test-conv-4');
        expect(data.error).toContain('API call failed');
        resolve();
      });

      clientSocket.emit('ai:chat', {
        conversationId: 'test-conv-4',
        messages: [{ role: 'user', content: 'Hello' }],
        providerId: 'deepseek',
      });
    });
  });

  it('Test 5: graph:subscribe event joins client to graph room', (done) => {
    // Emit subscribe event
    clientSocket.emit('graph:subscribe', { graphId: 'graph-123' });

    // Wait a bit for the join to complete
    setTimeout(() => {
      // Check if client is in the room by emitting to the room
      clientSocket.on('graph:updated', (data) => {
        expect(data.test).toBe('update');
        done();
      });

      // Emit to the room from server side
      io.to('graph:graph-123').emit('graph:updated', { test: 'update' });
    }, 100);
  });

  it('Test 6: disconnect event logs client disconnection', (done) => {
    // Listen for disconnect on server side
    io.on('connection', (socket) => {
      socket.on('disconnect', () => {
        // Disconnect was handled
        done();
      });
    });

    // Disconnect client
    clientSocket.disconnect();
  });
});
