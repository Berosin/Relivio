// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockStablecoin} from "../src/MockStablecoin.sol";
import {Reputation} from "../src/Reputation.sol";
import {FundFactory} from "../src/FundFactory.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";

/// @notice Deploys the full Relivio testnet stack in dependency order and prints
///         every address so they can be dropped straight into frontend/.env.local.
///         Run with: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        MockStablecoin stablecoin = new MockStablecoin();
        Reputation reputation = new Reputation();

        FundFactory fundFactory = new FundFactory(address(stablecoin), address(reputation));
        CampaignFactory campaignFactory = new CampaignFactory(address(stablecoin), address(reputation), deployer);

        // Allow both factories to register newly-deployed funds/campaigns as reputation reporters.
        reputation.setFactory(address(fundFactory), true);
        reputation.setFactory(address(campaignFactory), true);

        vm.stopBroadcast();

        console.log("MockStablecoin (RUSD): ", address(stablecoin));
        console.log("Reputation:            ", address(reputation));
        console.log("FundFactory:           ", address(fundFactory));
        console.log("CampaignFactory:       ", address(campaignFactory));
        console.log("Deployer / platform verifier:", deployer);
    }
}
