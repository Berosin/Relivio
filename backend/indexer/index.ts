/**
 * Relivio Event Indexer
 * ----------------------------------------------------------------
 * A small, restartable process that watches CommunityFund/Campaign
 * events on-chain and writes rows into Supabase `notifications` +
 * `updates` so the frontend can show a live activity feed without
 * every browser tab needing its own websocket subscription to every
 * fund/campaign.
 *
 * This process is NOT in the trust path for money movement — it only
 * ever reads events and writes advisory rows. If it's down, funds keep
 * working exactly as before; only the notification feed goes stale.
 *
 * Run:
 *   cd backend/indexer
 *   npm install
 *   cp .env.example .env   # fill in RPC_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                           # FUND_FACTORY_ADDRESS, CAMPAIGN_FACTORY_ADDRESS
 *   npm start
 */

import { createClient, type WebSocketLikeConstructor } from "@supabase/supabase-js";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import ws from "ws";
import "dotenv/config";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FUND_FACTORY_ADDRESS = process.env.FUND_FACTORY_ADDRESS as Address | undefined;
const CAMPAIGN_FACTORY_ADDRESS = process.env.CAMPAIGN_FACTORY_ADDRESS as Address | undefined;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/indexer/.env");
}

// This indexer never subscribes to Supabase Realtime (it only does plain
// REST insert/select/update calls) — but createClient() unconditionally
// constructs a RealtimeClient internally regardless, and that constructor
// throws immediately on Node < 22, which lacks a native WebSocket global.
// Passing the `ws` package as the transport sidesteps that entirely; it's
// never actually opened since nothing here calls .channel()/.on().
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws as unknown as WebSocketLikeConstructor },
});
const client = createPublicClient({ transport: http(RPC_URL) });

const fundFactoryAbi = parseAbi(["event FundCreated(address indexed fund, address indexed organizer, address yieldAdapter, string name)"]);
const campaignFactoryAbi = parseAbi(["event CampaignCreated(address indexed campaign, address indexed organizer, string name, uint8 campaignType)"]);

const communityFundAbi = parseAbi([
  "event Contributed(address indexed member, uint256 amount, uint256 sharesIssued, uint256 toReserve, uint256 toDefi)",
  "event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, uint256 repaymentPeriod)",
  "event RequestFinalized(uint256 indexed requestId, uint8 status)",
  "event FundsReleased(uint256 indexed requestId, address indexed recipient, uint256 amount)",
]);

const campaignAbi = parseAbi([
  "event Donated(address indexed donor, uint256 amount, uint256 toReserve, uint256 toDefi)",
  "event MilestoneProposed(uint256 indexed milestoneId, uint256 votingDeadline)",
  "event MilestoneFinalized(uint256 indexed milestoneId, uint8 status)",
  "event MilestoneReleased(uint256 indexed milestoneId, uint256 amount)",
]);

const watchedFunds = new Set<Address>();
const watchedCampaigns = new Set<Address>();

async function pushNotification(targetType: "fund" | "campaign", targetAddress: Address, kind: string, message: string, txHash?: string) {
  const { data: watchers } = await supabase
    .from("watchlist")
    .select("wallet_address")
    .eq("target_type", targetType)
    .eq("target_address", targetAddress.toLowerCase());

  const rows = (watchers ?? []).map((w) => ({
    wallet_address: w.wallet_address,
    kind,
    target_type: targetType,
    target_address: targetAddress.toLowerCase(),
    message,
    tx_hash: txHash,
  }));

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  await supabase.from("updates").insert({
    target_type: targetType,
    target_address: targetAddress.toLowerCase(),
    title: kind,
    body: message,
  });
}

function watchFund(fundAddress: Address) {
  if (watchedFunds.has(fundAddress)) return;
  watchedFunds.add(fundAddress);
  console.log("[indexer] watching fund", fundAddress);

  client.watchContractEvent({
    address: fundAddress,
    abi: communityFundAbi,
    eventName: "RequestCreated",
    onLogs: (logs) =>
      logs.forEach((log) =>
        pushNotification(
          "fund",
          fundAddress,
          "request_created",
          `New emergency request submitted (#${log.args.requestId}).`,
          log.transactionHash ?? undefined
        )
      ),
  });

  client.watchContractEvent({
    address: fundAddress,
    abi: communityFundAbi,
    eventName: "FundsReleased",
    onLogs: (logs) =>
      logs.forEach((log) =>
        pushNotification(
          "fund",
          fundAddress,
          "released",
          `Request #${log.args.requestId} approved and funds released.`,
          log.transactionHash ?? undefined
        )
      ),
  });
}

function watchCampaign(campaignAddress: Address) {
  if (watchedCampaigns.has(campaignAddress)) return;
  watchedCampaigns.add(campaignAddress);
  console.log("[indexer] watching campaign", campaignAddress);

  client.watchContractEvent({
    address: campaignAddress,
    abi: campaignAbi,
    eventName: "MilestoneProposed",
    onLogs: (logs) =>
      logs.forEach((log) =>
        pushNotification(
          "campaign",
          campaignAddress,
          "milestone_proposed",
          `Milestone #${log.args.milestoneId} proposed for release — voting is open.`,
          log.transactionHash ?? undefined
        )
      ),
  });

  client.watchContractEvent({
    address: campaignAddress,
    abi: campaignAbi,
    eventName: "MilestoneReleased",
    onLogs: (logs) =>
      logs.forEach((log) =>
        pushNotification(
          "campaign",
          campaignAddress,
          "milestone_released",
          `Milestone #${log.args.milestoneId} approved and funds released.`,
          log.transactionHash ?? undefined
        )
      ),
  });
}

async function main() {
  console.log("[indexer] starting, RPC:", RPC_URL);

  if (FUND_FACTORY_ADDRESS) {
    client.watchContractEvent({
      address: FUND_FACTORY_ADDRESS,
      abi: fundFactoryAbi,
      eventName: "FundCreated",
      onLogs: (logs) => logs.forEach((log) => log.args.fund && watchFund(log.args.fund)),
    });
  }

  if (CAMPAIGN_FACTORY_ADDRESS) {
    client.watchContractEvent({
      address: CAMPAIGN_FACTORY_ADDRESS,
      abi: campaignFactoryAbi,
      eventName: "CampaignCreated",
      onLogs: (logs) => logs.forEach((log) => log.args.campaign && watchCampaign(log.args.campaign)),
    });
  }

  console.log("[indexer] running. Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("[indexer] fatal error", err);
  process.exit(1);
});