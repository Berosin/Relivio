// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockStablecoin} from "../src/MockStablecoin.sol";
import {YieldAdapter} from "../src/defi/YieldAdapter.sol";

/// @notice Mints and transfers a testnet-only yield reserve into a YieldAdapter's underlying
///         MockYieldProtocol so simulated yield harvests never revert for lack of balance.
///         Run with: forge script script/SeedYieldReserve.s.sol --sig "run(address,address,uint256)" \
///           <stablecoinAddr> <yieldAdapterAddr> <amount> --rpc-url $SEPOLIA_RPC_URL --broadcast
contract SeedYieldReserve is Script {
    function run(address stablecoinAddr, address yieldAdapterAddr, uint256 amount) external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MockStablecoin stablecoin = MockStablecoin(stablecoinAddr);
        YieldAdapter adapter = YieldAdapter(yieldAdapterAddr);
        address protocol = address(adapter.protocol());

        stablecoin.ownerMint(protocol, amount);

        vm.stopBroadcast();
        console.log("Seeded SIMULATED yield reserve into MockYieldProtocol:", protocol);
        console.log("Amount:", amount);
    }
}
