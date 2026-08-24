import { signMessage } from "wagmi/actions";
import { config } from "./wagmi";
import { buildAuthMessage } from "./walletAuth";

/// Prompts the connected wallet to sign an authorization message for one
/// off-chain action (post a comment, edit a profile, watch/unwatch). This
/// is a plain message signature — MetaMask's free, gas-less "Signature
/// Request" popup, not a transaction — so it's cheap enough to ask for on
/// every write without friction fatigue.
export async function signWalletAction(
  action: string,
  walletAddress: `0x${string}`,
  payload: Record<string, unknown>
): Promise<{ timestamp: number; signature: `0x${string}` }> {
  const timestamp = Date.now();
  const message = buildAuthMessage(action, walletAddress, timestamp, payload);
  const signature = await signMessage(config, { account: walletAddress, message });
  return { timestamp, signature };
}