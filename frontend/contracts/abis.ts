// ABIs extracted directly from `forge build` artifacts (contracts/out/*.json) —
// keep these in sync by re-running the export step in contracts/README after any
// Solidity change: see contracts/README.md "Regenerate frontend ABIs".
import MockStablecoinAbi from "./abis/MockStablecoin.json";
import FundFactoryAbi from "./abis/FundFactory.json";
import CommunityFundAbi from "./abis/CommunityFund.json";
import CampaignFactoryAbi from "./abis/CampaignFactory.json";
import CampaignAbi from "./abis/Campaign.json";
import ReputationAbi from "./abis/Reputation.json";
import type { Abi } from "viem";

export const ABIS = {
  MockStablecoin: MockStablecoinAbi as Abi,
  FundFactory: FundFactoryAbi as Abi,
  CommunityFund: CommunityFundAbi as Abi,
  CampaignFactory: CampaignFactoryAbi as Abi,
  Campaign: CampaignAbi as Abi,
  Reputation: ReputationAbi as Abi,
} as const;
