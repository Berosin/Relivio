import { createPublicClient, http, parseAbi, type Address } from "viem";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

// Both CommunityFund and Campaign expose `address public organizer` with the
// same auto-generated getter shape, so one minimal ABI covers both — no
// need to pull in the full generated ABI JSON just for this one read.
const organizerAbi = parseAbi(["function organizer() view returns (address)"]);

const client = createPublicClient({ transport: http(RPC_URL) });

/// Reads the on-chain organizer of a fund or campaign directly from the
/// contract. Returns null if the read fails (bad address, RPC hiccup, wrong
/// network) — callers must treat null as "not verified", not "allowed",
/// i.e. fail closed.
export async function getOnChainOrganizer(contractAddress: Address): Promise<Address | null> {
  try {
    const organizer = await client.readContract({
      address: contractAddress,
      abi: organizerAbi,
      functionName: "organizer",
    });
    return organizer;
  } catch {
    return null;
  }
}

/// Verifies that `walletAddress` is the actual on-chain organizer of
/// `contractAddress`. This is what actually gates metadata/update writes —
/// a valid wallet signature alone only proves who's asking, not that
/// they're allowed to edit this particular fund/campaign. Fails closed: any
/// lookup failure is treated as "not the organizer".
export async function isOnChainOrganizer(contractAddress: Address, walletAddress: string): Promise<boolean> {
  const organizer = await getOnChainOrganizer(contractAddress);
  return Boolean(organizer) && organizer!.toLowerCase() === walletAddress.toLowerCase();
}