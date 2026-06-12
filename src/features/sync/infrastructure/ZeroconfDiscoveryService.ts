import { Platform } from 'react-native';
import Zeroconf from 'react-native-zeroconf';

import { SyncError } from '../domain/errors/SyncError';
import type { DiscoveredPeer } from '../domain/entities/DiscoveredPeer';
import type { ISyncDiscoveryService } from '../domain/services/ISyncDiscoveryService';
import {
  SYNC_SERVICE_DOMAIN,
  SYNC_SERVICE_PROTOCOL,
  SYNC_SERVICE_TYPE,
  SYNC_TCP_PORT,
} from '../domain/constants/SyncConstants';

type ResolvedService = {
  name: string;
  host: string;
  port: number;
  addresses?: string[];
  txt?: Record<string, string>;
};

function resolveHost(service: ResolvedService): string {
  const address = service.addresses?.find((entry) => entry.includes('.'));
  if (address) {
    return address;
  }

  return service.host;
}

export class ZeroconfDiscoveryService implements ISyncDiscoveryService {
  private readonly zeroconf = new Zeroconf();
  private broadcastName: string | null = null;
  private scanHandler: ((peer: DiscoveredPeer) => void) | null = null;
  private localDeviceId: string | null = null;

  async iniciarBroadcast(deviceId: string, deviceName: string, port = SYNC_TCP_PORT): Promise<void> {
    if (Platform.OS === 'web') {
      throw new SyncError('mDNS no disponible en web');
    }

    this.broadcastName = deviceName;
    this.zeroconf.publishService(
      SYNC_SERVICE_TYPE,
      SYNC_SERVICE_PROTOCOL,
      SYNC_SERVICE_DOMAIN,
      deviceName,
      port,
      { device_id: deviceId, device_name: deviceName },
    );
  }

  async detenerBroadcast(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    if (this.broadcastName) {
      this.zeroconf.unpublishService(this.broadcastName);
      this.broadcastName = null;
    }
  }

  async iniciarEscaneo(
    onPeerFound: (peer: DiscoveredPeer) => void,
    localDeviceId?: string,
  ): Promise<void> {
    if (Platform.OS === 'web') {
      throw new SyncError('mDNS no disponible en web');
    }

    this.scanHandler = onPeerFound;
    this.localDeviceId = localDeviceId ?? null;

    this.zeroconf.on('resolved', (service: ResolvedService) => {
      const deviceId = service.txt?.device_id;
      if (!deviceId) {
        return;
      }

      if (this.localDeviceId && deviceId === this.localDeviceId) {
        return;
      }

      this.scanHandler?.({
        name: service.name,
        host: resolveHost(service),
        port: service.port,
        deviceId,
        deviceName: service.txt?.device_name ?? service.name,
      });
    });

    this.zeroconf.scan(SYNC_SERVICE_TYPE, SYNC_SERVICE_PROTOCOL, SYNC_SERVICE_DOMAIN);
  }

  async detenerEscaneo(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    this.zeroconf.removeAllListeners('resolved');
    this.zeroconf.stop();
    this.scanHandler = null;
    this.localDeviceId = null;
  }
}
