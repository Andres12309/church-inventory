import type { SyncProtocolMessage } from '../protocol/SyncProtocolMessages';

export type SyncSocketConnection = {
  send(message: SyncProtocolMessage): Promise<void>;
  receive(): Promise<SyncProtocolMessage>;
  close(): void;
};

export interface ISyncSocketService {
  iniciarServidor(
    onConnection: (connection: SyncSocketConnection) => void,
  ): Promise<void>;
  detenerServidor(): Promise<void>;
  conectar(host: string, port: number): Promise<SyncSocketConnection>;
}
