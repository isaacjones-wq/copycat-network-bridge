# Copy Cat Network Bridge - Integration Guide

## Overview

The **Copy Cat Network Bridge** enables peer-to-peer inter-computer communication in the Copy Cat ComputerCraft emulator. It allows multiple ComputerCraft computers running in different browser tabs/windows to communicate using the **modem API**.

## Features

✅ **No Server Required** - Uses browser APIs (BroadcastChannel + LocalStorage)
✅ **Cross-Tab Communication** - Works across multiple browser tabs/windows
✅ **Modem API Compatible** - Simulates real ComputerCraft modem behavior
✅ **Fallback Support** - Gracefully degrades to LocalStorage if BroadcastChannel unavailable
✅ **Easy Integration** - Simple API to inject modems into Copy Cat computers

## How It Works

### Architecture

```
┌──────────────┐         BroadcastChannel         ┌──────────────┐
│ Computer 1   │◄────────────────────────────────►│ Computer 2   │
│ (Tab 1)      │                                  │ (Tab 2)      │
└──────────────┘                                  └──────────────┘
       ▲                                                  ▲
       │              LocalStorage Fallback             │
       └──────────────────────────────────────────────────┘
```

### Communication Flow

1. **Computer A** calls `modem.transmit(toId, protocol, message)`
2. Network Bridge encodes message with metadata (sender, receiver, distance, protocol)
3. Message posted to **BroadcastChannel** and/or **LocalStorage**
4. **Computer B** receives message via event listener
5. Copy Cat triggers `modem_message` event in Lua
6. Lua code processes message with `os.pullEvent("modem_message")`

## Installation

### Step 1: Build the Library

```bash
npm install
npm run build
```

This creates `dist/copycat-network-bridge.js` and `dist/copycat-network-bridge.d.ts`.

### Step 2: Include in Your HTML

```html
<script src="./dist/copycat-network-bridge.js"></script>
```

Or import as an ES module:

```typescript
import { createModemPeripheral } from './dist/copycat-network-bridge.js';
```

## Usage

### Creating a Virtual Modem

```typescript
import { createModemPeripheral, type ModemMessage } from './copycat-network-bridge';

// When setting up a Copy Cat computer
const modem = createModemPeripheral(
  computerId,  // Unique ID for this computer
  (event: ModemMessage) => {
    // Handle incoming messages
    console.log(`Message from ${event.from}: ${event.message}`);
  }
);

// Send a message to another computer
modem.transmit(2, "myprotocol", "Hello computer 2!");

// Broadcast to all computers
modem.broadcast("announce", "Hello everyone!");
```

### Integrating with Copy Cat Embed

The challenge: Copy Cat's embed API doesn't directly expose peripheral injection. Here are two approaches:

#### Approach A: Post-Init Injection (Recommended)

After Copy Cat computer is initialized, inject events that set up the modem:

```typescript
import setup from 'copycat/embed';
import { createModemPeripheral } from './copycat-network-bridge';

const computer = await setup(element, {
  persistId: 1,
  label: "Computer 1",
});

const modem = createModemPeripheral(1, (event) => {
  // Queue modem_message event in Lua
  computer.queueEvent("modem_message", [
    event.from,
    event.to,
    event.distance,
    event.protocol,
    event.message,
  ]);
});
```

#### Approach B: Lua Bootstrap Script

Inject a startup script that loads the modem API via `require`:

```typescript
const computer = await setup(element, {
  files: {
    "startup.lua": `
local modem = require("network.modem")
peripheral.register("right", "modem", modem)
`,
    "network/modem.lua": `
-- Modem API bridge that communicates with JavaScript
local modem = {}
function modem.transmit(toId, protocol, message)
  -- Post to global JS object (injected by HTML)
  os.queueEvent("modem_transmit", toId, protocol, message)
end
return modem
`,
  },
});
```

### Lua Example: Send/Receive Messages

In your Lua programs running on Copy Cat computers:

```lua
-- Get the modem peripheral
local modem = peripheral.find("modem")

if not modem then
  error("No modem attached!")
end

-- Send a message to computer 2
modem.transmit(2, "myapp", "Hello from computer 1")

-- Listen for incoming messages
while true do
  local sender, protocol, message = os.pullEvent("modem_message")
  print("Message from " .. sender .. ": " .. message)
end

-- Broadcast to all computers
modem.broadcast("announce", "Server going down for maintenance")
```

## API Reference

### NetworkBridge

```typescript
class NetworkBridge {
  // Send a message to a specific computer
  send(toId: number, protocol?: string, message: unknown, distance?: number): void

  // Broadcast to all computers (toId = 0)
  broadcast(protocol?: string, message: unknown, distance?: number): void

  // Register a listener for incoming messages
  on(callback: (message: ModemMessage) => void): () => void

  // Get queued messages and clear the queue
  getQueuedMessages(): ModemMessage[]

  // Clean up resources
  dispose(): void
}
```

### VirtualModemPeripheral

```typescript
class VirtualModemPeripheral {
  transmit(toId: number, protocol?: string, message: unknown, distance?: number): void
  broadcast(protocol?: string, message: unknown, distance?: number): void
  getComputerId(): number
  setMessageHandler(handler: (event: ModemMessage) => void | null): void
  dispose(): void
}
```

### ModemMessage

```typescript
type ModemMessage = {
  from: number;           // Sender computer ID
  to: number;            // Recipient computer ID (0 = broadcast)
  distance: number;      // Distance (simulated, always 256)
  protocol?: string;     // Optional protocol name
  message: unknown;      // Payload (any JSON-serializable value)
  timestamp: number;     // Message timestamp (ms since epoch)
};
```

## Limitations & Design Choices

### Current Limitations

1. **No actual `modem` peripheral object** in Lua - Messages are injected as events
   - Workaround: Create a Lua modem library that wraps `queueEvent()`

2. **All messages are JSON-serializable** - Lua tables/functions must be serialized
   - This matches the Copy Cat HTTP API behavior

3. **Distance is always 256** - No true spatial simulation
   - Can be extended with distance calculation based on computer IDs

4. **No wireless modem variants** - Always a basic modem simulation
   - Future: Could add `wireless_modem` that varies distance

### Why BroadcastChannel + LocalStorage?

- **BroadcastChannel**: Fast, low-latency, same-origin only
- **LocalStorage**: Universal fallback, works cross-domain (with caveats)
- **No server needed**: Completely peer-to-peer, no backend required
- **Browser-native**: Uses standard web APIs, no special permissions

## Complete Example

See `examples/multi-computer-network.html` for a full working demo with three networked computers.

## Troubleshooting

### Messages not being received?

1. **Check computer IDs** - Ensure `from` and `to` match expectations
2. **Check tab same-origin** - BroadcastChannel only works same-origin
3. **Check console** - Browser console will show warnings if communication fails
4. **Try LocalStorage fallback** - If BroadcastChannel not supported, LocalStorage is used

### Modem API functions not available in Lua?

- Copy Cat doesn't have a default modem peripheral
- You must create a Lua library or inject events from JavaScript
- See "Approach B" in Integration section above

## Future Enhancements

- [ ] Real `modem` peripheral object in Copy Cat's Java code
- [ ] Distance-based message routing
- [ ] Wireless vs wired modem simulation
- [ ] Message queue limits (simulate real ComputerCraft behavior)
- [ ] Packet loss simulation
- [ ] Server mode (optional for persistence)

## License

MIT - Same as Copy Cat

## Contributing

Contributions welcome! Please submit PRs to improve:
- Lua integration
- Performance optimizations
- Better error handling
- Documentation
