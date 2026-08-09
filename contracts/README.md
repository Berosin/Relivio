# Relivio Smart Contracts

Foundry project. All contracts are testnet-only — `MockStablecoin` and
`MockYieldProtocol` have zero real-world value and must never be described as
usable on mainnet.

## Contracts

| Contract | Purpose |
|---|---|
| `MockStablecoin.sol` | Testnet RUSD token with public faucet |
| `Reputation.sol` | Transparent 0–100 reputation score + reputation-tiered request limits |
| `CommunityFund.sol` | Core Use Case 1 — emergency assistance treasury, DAO voting, auto-payout, repayment |
| `FundFactory.sol` | Deploys `CommunityFund` + dedicated `YieldAdapter`, wires permissions |
| `Campaign.sol` | Core Use Case 2 — disaster/community relief, donations, milestone releases |
| `CampaignFactory.sol` | Deploys `Campaign` + dedicated `YieldAdapter`, wires permissions + verifier |
| `defi/YieldAdapter.sol` | Stable interface treasuries use to deposit/withdraw/harvest yield |
| `defi/MockYieldProtocol.sol` | **SIMULATED TESTNET YIELD** — fixed 4% APY, clearly labeled, not a real protocol |

## Setup

```bash
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts
cp .env.example .env   # fill in PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
```

## Build & test

```bash
forge build
forge test -vv
```

13/13 tests passing as of last run, covering: contribution reserve/DeFi split,
emergency request approval + auto-payout, request rejection below threshold,
on-time repayment reputation update, donation split, milestone approval +
release, organizer cannot bypass milestones, verifier gating, and simulated
yield accrual/harvest/withdraw/authorization.

## Deploy to Sepolia

```bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

This deploys, in order: `MockStablecoin` → `Reputation` → `FundFactory` →
`CampaignFactory`, and registers both factories as trusted reporters on
`Reputation`. Copy the four printed addresses into `frontend/.env.local`.

### Seed a yield reserve (optional but recommended for demos)

`MockYieldProtocol` pays yield out of its own balance, so harvesting yield on
a fresh adapter with no reserve will revert. After creating a fund/campaign,
seed its adapter's protocol:

```bash
forge script script/SeedYieldReserve.s.sol \
  --sig "run(address,address,uint256)" <STABLECOIN> <YIELD_ADAPTER> 1000000000 \
  --rpc-url $SEPOLIA_RPC_URL --broadcast
```

## Regenerate frontend ABIs

After any Solidity change:

```bash
forge build
python3 -c "
import json
for c in ['MockStablecoin','FundFactory','CommunityFund','CampaignFactory','Campaign','Reputation']:
    data = json.load(open(f'out/{c}.sol/{c}.json'))
    json.dump(data['abi'], open(f'../frontend/contracts/abis/{c}.json','w'), indent=2)
"
```
