import type { DiscoveredPeer } from '../entities/DiscoveredPeer';

export interface ISyncDiscoveryService {
  iniciarBroadcast(deviceId: string, deviceName: string, port: number): Promise<void>;
  detenerBroadcast(): Promise<void>;
  iniciarEscaneo(
    onPeerFound: (peer: DiscoveredPeer) => void,
    localDeviceId?: string,
  ): Promise<void>;
  detenerEscaneo(): Promise<void>;
}
