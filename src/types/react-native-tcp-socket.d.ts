declare module 'react-native-tcp-socket' {
  export interface SocketOptions {
    port: number;
    host: string;
    interface?: string;
  }

  export interface ListenOptions {
    port: number;
    host?: string;
  }

  export interface Socket {
    write(data: string, encoding?: string, callback?: (err?: Error) => void): void;
    destroy(): void;
    end(): void;
    on(event: 'data', listener: (chunk: string | Uint8Array) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
  }

  export interface Server {
    listen(options: ListenOptions, callback?: () => void): Server;
    close(callback?: () => void): void;
    once(event: 'error', listener: (error: Error) => void): this;
  }

  const TcpSocket: {
    createServer(callback: (socket: Socket) => void): Server;
    createConnection(options: SocketOptions, callback?: () => void): Socket;
  };

  export default TcpSocket;
}
