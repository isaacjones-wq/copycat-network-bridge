/**
 * Virtual modem peripheral for Copy Cat.
 * Integrates with the network bridge to simulate inter-computer communication.
 * 
 * This wraps the network bridge and exposes a Lua-compatible modem interface.
 */

import { getNetworkBridge, disposeNetworkBridge, type ModemMessage } from "./network-bridge";

export interface ModemPeripheralOptions {
  computerId: number;
  onMessage?: (event: ModemMessage) => void;
}

export class VirtualModemPeripheral {
  private computerId: number;
  private networkBridge = null as any;
  private unsubscribe: (() => void) | null = null;
  private messageCallback: ((event: ModemMessage) => void) | null = null;

  constructor(options: ModemPeripheralOptions) {
    this.computerId = options.computerId;
    this.messageCallback = options.onMessage || null;
    this.networkBridge = getNetworkBridge(computerId);

    // Register listener for incoming messages
    if (this.messageCallback) {
      this.unsubscribe = this.networkBridge.on(this.messageCallback);
    }
  }

  /**
   * Send a modem message (equivalent to modem.transmit in Lua)
   */
  public transmit(
    toId: number,
    protocol: string | undefined,
    message: unknown,
    distance?: number,
  ): void {
    this.networkBridge.send(toId, protocol, message, distance ?? 256);
  }

  /**
   * Broadcast a message to all computers (to = 0)
   */
  public broadcast(
    protocol: string | undefined,
    message: unknown,
    distance?: number,
  ): void {
    this.networkBridge.broadcast(protocol, message, distance ?? 256);
  }

  /**
   * Get the computer ID of this modem.
   */
  public getComputerId(): number {
    return this.computerId;
  }

  /**
   * Set a new message handler.
   */
  public setMessageHandler(handler: ((event: ModemMessage) => void) | null): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.messageCallback = handler;
    if (handler) {
      this.unsubscribe = this.networkBridge.on(handler);
    }
  }

  /**
   * Dispose of this modem peripheral.
   */
  public dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.messageCallback = null;
  }
}

/**
 * Create a virtual modem peripheral for a computer.
 */
export function createModemPeripheral(
  computerId: number,
  onMessage?: (event: ModemMessage) => void,
): VirtualModemPeripheral {
  return new VirtualModemPeripheral({ computerId, onMessage });
}
