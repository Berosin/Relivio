import { http, createConfig } from "wagmi";
import { sepolia, foundry } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Relivio is a TESTNET-ONLY prototype. Default chain is Sepolia; a local Anvil
// chain (foundry) is included for local development against `forge script Deploy`.
//
// Only the generic `injected()` connector is used — it auto-detects any
// EIP-1193 wallet extension (MetaMask, Rabby, Brave Wallet, etc.) without
// needing wallet-specific SDKs like `metaMask()` (which pulls in
// `@metamask/sdk` and its own extra dependencies).
//
// foundry's pollingInterval is set low (1s) since Anvil is local and cheap
// to query — combined with LiveBlockWatcher, this makes balances/votes/
// treasury snapshots refresh live across the whole app with no manual
// page refresh needed. Sepolia keeps its default interval to avoid
// hammering a public RPC endpoint.
export const config = createConfig({
  chains: [
    sepolia,
    { ...foundry, id: foundry.id, name: foundry.name, pollingInterval: 1_000 } as typeof foundry,
  ],
  connectors: [injected()],
  // Without this, wagmi also auto-discovers MetaMask (and any other wallet)
  // a second time via EIP-6963 announcements, showing a duplicate
  // "Connect MetaMask" button alongside the generic "Connect Injected" one —
  // both point to the exact same extension. One explicit connector is enough.
  multiInjectedProviderDiscovery: false,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}