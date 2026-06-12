import TcpSocket, { type Server, type Socket } from 'react-native-tcp-socket';

import { SyncError } from '../domain/errors/SyncError';
import type { SyncProtocolMessage } from '../domain/protocol/SyncProtocolMessages';
import type { ISyncSocketService, SyncSocketConnection } from '../domain/services/ISyncSocketService';
import {
  SYNC_MESSAGE_TIMEOUT_MS,
  SYNC_SOCKET_CONNECT_TIMEOUT_MS,
  SYNC_TCP_PORT,
} from '../domain/constants/SyncConstants';

function chunkToString(chunk: string | Uint8Array): string {
  if (typeof chunk === 'string') {
    return chunk;
  }

  const maybeBuffer = chunk as Uint8Array & { toString?: (encoding: string) => string };
  if (typeof maybeBuffer.toString === 'function') {
    return maybeBuffer.toString('utf8');
  }

  return new TextDecoder('utf-8').decode(chunk);
}

function createConnection(socket: Socket): SyncSocketConnection {
  let buffer = '';
  const inbox: SyncProtocolMessage[] = [];
  const waiters: Array<{
    resolve: (message: SyncProtocolMessage) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  const rejectAllWaiters = (error: Error) => {
    while (waiters.length > 0) {
      const waiter = waiters.shift();
      if (!waiter) {
        break;
      }
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  };

  const deliverMessage = (message: SyncProtocolMessage) => {
    const waiter = waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    inbox.push(message);
  };

  const processBuffer = () => {
    while (true) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex < 0) {
        return;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      try {
        const parsed = JSON.parse(line) as SyncProtocolMessage;
        deliverMessage(parsed);
      } catch {
        rejectAllWaiters(new SyncError('Mensaje JSON inválido recibido por socket'));
        return;
      }
    }
  };

  socket.on('data', (chunk: string | Uint8Array) => {
    buffer += chunkToString(chunk);
    processBuffer();
  });

  socket.on('error', (error: Error) => {
    inbox.length = 0;
    rejectAllWaiters(error);
  });

  socket.on('close', () => {
    inbox.length = 0;
    rejectAllWaiters(new SyncError('Conexión TCP cerrada inesperadamente'));
  });

  return {
    send: (message) =>
      new Promise<void>((resolve, reject) => {
        try {
          socket.write(`${JSON.stringify(message)}\n`, 'utf8', (err?: Error) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        } catch (error) {
          reject(error instanceof Error ? error : new SyncError('Error al enviar mensaje'));
        }
      }),
    receive: () =>
      new Promise<SyncProtocolMessage>((resolve, reject) => {
        const pending = inbox.shift();
        if (pending) {
          resolve(pending);
          return;
        }

        const timer = setTimeout(() => {
          const index = waiters.findIndex((waiter) => waiter.reject === reject);
          if (index >= 0) {
            waiters.splice(index, 1);
          }
          reject(new SyncError('Timeout esperando mensaje del peer'));
        }, SYNC_MESSAGE_TIMEOUT_MS);

        waiters.push({ resolve, reject, timer });
      }),
    close: () => {
      inbox.length = 0;
      rejectAllWaiters(new SyncError('Conexión TCP cerrada'));
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    },
  };
}

export class TcpSocketService implements ISyncSocketService {
  private server: Server | null = null;
  private activeSocket: Socket | null = null;

  async iniciarServidor(onConnection: (connection: SyncSocketConnection) => void): Promise<void> {
    if (this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server = TcpSocket.createServer((socket) => {
        this.activeSocket = socket;
        onConnection(createConnection(socket));
      });

      this.server.listen({ port: SYNC_TCP_PORT, host: '0.0.0.0' }, () => resolve());
      this.server.once('error', reject);
    });
  }

  async detenerServidor(): Promise<void> {
    if (this.activeSocket) {
      try {
        this.activeSocket.destroy();
      } catch {
        // ignore
      }
      this.activeSocket = null;
    }

    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.server?.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  async conectar(host: string, port: number): Promise<SyncSocketConnection> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new SyncError('Timeout al conectar con el peer'));
      }, SYNC_SOCKET_CONNECT_TIMEOUT_MS);

      try {
        const socket = TcpSocket.createConnection({ host, port }, () => {
          clearTimeout(timer);
          this.activeSocket = socket;
          resolve(createConnection(socket));
        });

        socket.once('error', (error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new SyncError('Error de conexión TCP'));
      }
    });
  }
}
