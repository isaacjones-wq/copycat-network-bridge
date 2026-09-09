/**
 * Peer-to-peer network bridge for Copy Cat computers.
 * Enables inter-computer modem communication using browser APIs.
 * 
 * Uses BroadcastChannel for same-origin communication between tabs.
 * Falls back to LocalStorage for broader compatibility.
 */

export type ModemMessage = {
  from: number;
  to: number;
  distance: number;
  protocol?: string;
  message: unknown;
  timestamp: number;
};

export type NetworkEventCallback = (message: ModemMessage) => void;

class NetworkBridge {
  private computerId: number;
  private listeners: Set<NetworkEventCallback> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private messageQueue: ModemMessage[] = [];

  constructor(computerId: number) {
    this.computerId = computerId;
    this.initializeBroadcastChannel();
    this.initializeStorageListener();
  }

  /**
   * Initialize BroadcastChannel for efficient cross-tab communication.
   * Falls back gracefully if not supported.
   */
  private initializeBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") {
      console.warn("BroadcastChannel not available, using LocalStorage fallback");
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel("copycat-modem");
      this.broadcastChannel.onmessage = (event) => {
        const message = event.data as ModemMessage;
        if (message.to === this.computerId || message.to === 0) {
          this.onMessageReceived(message);
        }
      };
    } catch (e) {
      console.warn("Failed to create BroadcastChannel:", e);
    }
  }

  /**
   * Initialize LocalStorage event listener as fallback.
   * Receives messages posted to LocalStorage by other tabs.
   */
  private initializeStorageListener(): void {
    this.storageListener = (event: StorageEvent) => {
      if (event.key !== "copycat-modem-message" || !event.newValue) return;

      try {
        const message = JSON.parse(event.newValue) as ModemMessage;
        if (message.to === this.computerId || message.to === 0) {
          this.onMessageReceived(message);
        }
      } catch (e) {
        console.warn("Failed to parse modem message from storage:", e);
      }
    };

    window.addEventListener("storage", this.storageListener);
  }

  /**
   * Send a modem message to other computers.
   */
  public send(
    toId: number,
    protocol: string | undefined,
    message: unknown,
    distance: number = 256,
  ): void {
    const modemMessage: ModemMessage = {
      from: this.computerId,
      to: toId,
      distance,
      protocol,
      message,
      timestamp: Date.now(),
    };

    // Send via BroadcastChannel if available
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(modemMessage);
      } catch (e) {
        console.warn("Failed to send via BroadcastChannel:", e);
      }
    }

    // Also post to LocalStorage for fallback
    try {
      localStorage.setItem("copycat-modem-message", JSON.stringify(modemMessage));
    } catch (e) {
      console.warn("Failed to send via LocalStorage:", e);
    }
  }

  /**
   * Broadcast a message to all computers (to = 0).
   */
  public broadcast(
    protocol: string | undefined,
    message: unknown,
    distance: number = 256,
  ): void {
    this.send(0, protocol, message, distance);
  }

  /**
   * Process incoming message and notify listeners.
   */
  private onMessageReceived(message: ModemMessage): void {
    // Don't receive your own messages
    if (message.from === this.computerId) return;

    this.messageQueue.push(message);
    this.notifyListeners(message);
  }

  /**
   * Register a callback to receive modem messages.
   */
  public on(callback: NetworkEventCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of a new message.
   */
  private notifyListeners(message: ModemMessage): void {
    this.listeners.forEach((callback) => {
      try {
        callback(message);
      } catch (e) {
        console.error("Error in modem message listener:", e);
      }
    });
  }

  /**
   * Get queued messages and clear the queue.
   */
  public getQueuedMessages(): ModemMessage[] {
    const messages = this.messageQueue;
    this.messageQueue = [];
    return messages;
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.storageListener) {
      window.removeEventListener("storage", this.storageListener);
      this.storageListener = null;
    }

    this.listeners.clear();
    this.messageQueue = [];
  }
}

// Global registry of active networks by computer ID
const networkInstances = new Map<number, NetworkBridge>();

/**
 * Get or create a network bridge for a computer.
 */
export function getNetworkBridge(computerId: number): NetworkBridge {
  let bridge = networkInstances.get(computerId);
  if (!bridge) {
    bridge = new NetworkBridge(computerId);
    networkInstances.set(computerId, bridge);
  }
  return bridge;
}

/**
 * Clean up a network bridge when a computer is disposed.
 */
export function disposeNetworkBridge(computerId: number): void {
  const bridge = networkInstances.get(computerId);
  if (bridge) {
    bridge.dispose();
    networkInstances.delete(computerId);
  }
}
