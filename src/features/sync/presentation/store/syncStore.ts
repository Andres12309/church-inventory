import { create } from 'zustand';

import type { DiscoveredPeer } from '../../domain/entities/DiscoveredPeer';
import type { SyncPhase } from '../../application/SyncOrchestrator';

type SyncState = {
  peers: DiscoveredPeer[];
  isVisible: boolean;
  isScanning: boolean;
  isSyncing: boolean;
  phase: SyncPhase;
  statusMessage: string;
  recordsProcessed: number;
  recordsTotal: number;
  sessionPin: string;
  errorMessage: string | null;
  wifiConnected: boolean;
};

type SyncActions = {
  setPeers: (peers: DiscoveredPeer[]) => void;
  addPeer: (peer: DiscoveredPeer) => void;
  setVisible: (visible: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setProgress: (phase: SyncPhase, message: string, processed?: number, total?: number) => void;
  setSessionPin: (pin: string) => void;
  setWifiConnected: (connected: boolean) => void;
  setError: (message: string | null) => void;
  resetRuntime: () => void;
};

const initialRuntime = {
  peers: [] as DiscoveredPeer[],
  isVisible: false,
  isScanning: false,
  isSyncing: false,
  phase: 'idle' as SyncPhase,
  statusMessage: 'Listo para sincronizar',
  recordsProcessed: 0,
  recordsTotal: 0,
  errorMessage: null as string | null,
};

export const useSyncStore = create<SyncState & SyncActions>((set, get) => ({
  ...initialRuntime,
  sessionPin: '',
  wifiConnected: false,

  setPeers: (peers) => set({ peers }),

  addPeer: (peer) => {
    const { peers } = get();
    if (peers.some((p) => p.deviceId === peer.deviceId)) {
      return;
    }
    set({ peers: [...peers, peer] });
  },

  setVisible: (visible) => set({ isVisible: visible }),

  setScanning: (scanning) => set({ isScanning: scanning }),

  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setProgress: (phase, message, processed = 0, total = 0) =>
    set({ phase, statusMessage: message, recordsProcessed: processed, recordsTotal: total }),

  setSessionPin: (pin) => set({ sessionPin: pin.replace(/\D/g, '').slice(0, 4) }),

  setWifiConnected: (connected) => set({ wifiConnected: connected }),

  setError: (message) => set({ errorMessage: message }),

  resetRuntime: () => set({ ...initialRuntime }),
}));
