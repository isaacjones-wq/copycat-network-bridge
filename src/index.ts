/**
 * Copy Cat Network Bridge - Main Export
 * 
 * Provides peer-to-peer modem networking for Copy Cat ComputerCraft emulator.
 */

export {
  getNetworkBridge,
  disposeNetworkBridge,
  type ModemMessage,
  type NetworkEventCallback,
} from "./network-bridge";

export {
  VirtualModemPeripheral,
  createModemPeripheral,
  type ModemPeripheralOptions,
} from "./modem-peripheral";
