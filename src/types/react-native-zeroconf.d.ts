declare module 'react-native-zeroconf' {
  export type ZeroconfService = {
    name: string;
    host: string;
    port: number;
    addresses?: string[];
    txt?: Record<string, string>;
  };

  export default class Zeroconf {
    publishService(
      type: string,
      protocol: string,
      domain: string,
      name: string,
      port: number,
      txt?: Record<string, string>,
    ): void;

    unpublishService(name: string): void;
    scan(type: string, protocol: string, domain: string): void;
    stop(): void;
    on(event: 'resolved', listener: (service: ZeroconfService) => void): this;
    removeAllListeners(event?: string): this;
  }
}
