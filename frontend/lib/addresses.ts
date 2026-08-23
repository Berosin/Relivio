/// Central place every component reads deployed contract addresses from.
/// Populate these via frontend/.env.local (see .env.example at repo root).
export const ADDRESSES = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111), // Sepolia by default
  stablecoin: process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS as `0x${string}` | undefined,
  fundFactory: process.env.NEXT_PUBLIC_FUND_FACTORY_ADDRESS as `0x${string}` | undefined,
  campaignFactory: process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS as `0x${string}` | undefined,
  reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}` | undefined,
};

export const STABLECOIN_DECIMALS = 6;
