# Relivio

**Turning Community Liquidity into Crisis Relief.**

Relivio is a testnet/hackathon prototype for transparent, community-governed
emergency assistance and disaster relief, combining a smart-contract treasury,
simulated DeFi yield, and on-chain DAO voting so that funds are released
automatically by code — never by an admin.

Two equal core use cases:

1. **Individual Emergency Assistance** (`CommunityFund.sol`) — members
   contribute to a shared treasury, split into an untouchable emergency
   reserve and a yield-generating allocation. Members request help; the
   community votes; approved requests pay out automatically.
2. **Disaster & Community Relief** (`Campaign.sol`) — public campaigns with
   milestone-gated fund releases, so an organizer can never withdraw a full
   treasury at once.

## Repo layout

```
contracts/   Foundry smart contracts (source of truth for all treasury logic)
frontend/    Next.js + wagmi/viem app
ai/          FastAPI explainable risk-assessment microservice (advisory only)
docs/        Additional documentation
```

## Quickstart

```bash
# 1. Contracts
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts
cp .env.example .env   # fill in PRIVATE_KEY + SEPOLIA_RPC_URL
forge test
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast

# 2. Frontend
cd ../frontend
cp .env.example .env.local   # paste in the 4 addresses Deploy.s.sol printed
npm install
npm run dev

# 3. (Optional) AI risk-assessment service
cd ../ai
pip install -r requirements.txt
uvicorn services.main:app --reload --port 8000
```

## Safety & transparency commitments

- No real funds are ever used — `MockStablecoin` ("RUSD") is a testnet-only
  token with a public faucet.
- All DeFi yield shown in the UI is **SIMULATED TESTNET YIELD**
  (`MockYieldProtocol.sol`, fixed 4% APY) and is labeled as such everywhere
  it appears — never presented as real DeFi returns.
- Funds only ever move via a smart-contract-enforced path: contribution →
  reserve/DeFi split → request or milestone → community vote → automatic
  release. No admin key can unilaterally withdraw treasury funds.
- The AI risk-assessment service is advisory only, fully rules-based (no
  opaque ML on a life-impacting financial decision), and never
  auto-approves or auto-rejects anything.

## Status

- ✅ Smart contracts: compiled, 13/13 tests passing (Foundry)
- ✅ Frontend: builds cleanly, wallet connect, fund/campaign creation,
  contribute/donate, vote, finalize, repay, milestone flows
- ✅ AI risk-assessment service: working FastAPI endpoints
- ⏳ Not yet built: Supabase/off-chain metadata layer, notifications,
  advanced analytics dashboards, mobile support — see spec's "Advanced /
  stretch" tier for the full backlog
