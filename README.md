# Copy Cat Network Bridge 🖥️↔️🖥️

Enables **peer-to-peer inter-computer modem networking** for the Copy Cat ComputerCraft emulator.

## ✨ What It Does

Run multiple Copy Cat computers in different browser tabs and let them communicate via the modem API—**with no server required**.

```lua
-- Computer 1
modem = peripheral.find("modem")
modem.transmit(2, "hello", "Hi computer 2!")

-- Computer 2
modem = peripheral.find("modem")
sender, protocol, message = os.pullEvent("modem_message")
print(sender, message)  -- Output: 1, Hi computer 2!
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/isaacjones-wq/copycat-network-bridge.git
cd copycat-network-bridge
npm install
npm run build
```

### 2. Include in Your HTML

```html
<script src="./dist/copycat-network-bridge.js"></script>
```

### 3. Create a Network

```typescript
import { createModemPeripheral } from './dist/copycat-network-bridge.js';

const modem = createModemPeripheral(1, (msg) => {
  // Forward message to Copy Cat computer as Lua event
  computer.queueEvent("modem_message", [
    msg.from,
    msg.to,
    msg.distance,
    msg.protocol,
    msg.message,
  ]);
});

// Send from JavaScript
modem.transmit(2, "test", "Hello!");
```

## 📖 Full Documentation

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for:
- Complete API reference
- Integration strategies
- Lua examples
- Troubleshooting

## 💻 Live Example

Open `examples/multi-computer-network.html` in multiple browser tabs to see three networked computers.

## 🏗️ How It Works

**Network Transport:**
- **BroadcastChannel** for fast same-origin cross-tab communication
- **LocalStorage** fallback for broader compatibility

**Message Format:**
```typescript
type ModemMessage = {
  from: number;       // Sender ID
  to: number;         // Recipient ID (0 = broadcast)
  distance: number;   // Simulated distance
  protocol?: string;  // Optional protocol
  message: unknown;   // Payload
  timestamp: number;  // When sent
}
```

## ⚙️ Architecture

```
┌──────────────┐
│ Copy Cat UI  │  ← Browser UI (Preact)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ComputerAccess│  ← Copy Cat Lua runtime
└──────┬───────┘
       │ queueEvent("modem_message", ...)
       ▼
┌──────────────────────────┐
│Virtual Modem Peripheral  │  ← This library
└──────┬───────────────────┘
       │ send/broadcast
       ▼
┌──────────────────────────┐
│  Network Bridge (BroadcastChannel/LocalStorage)
└──────────────────────────┘
       ▲          ▼
       └──────────┘
       (cross-tab messaging)
```

## 🎯 Limitations

- ❌ No server/persistence (all memory cleared on refresh)
- ❌ Messages must be JSON-serializable
- ❌ No actual `modem` peripheral in Lua (use events instead)
- ⚠️ BroadcastChannel limited to same-origin tabs

## 🛣️ Roadmap

- [ ] Proper `modem` peripheral in Copy Cat's Java code
- [ ] Distance-based routing
- [ ] Packet loss simulation
- [ ] Wireless vs wired variants
- [ ] Optional server for persistence

## 📜 License

MIT - Open source and free to use!

## 🤝 Contributing

PRs welcome! Help improve the library with:
- Better Lua integration
- Performance optimizations
- Additional examples
- Bug fixes

---

**Made for Copy Cat enthusiasts who want networked ComputerCraft without a server.** 🎮
