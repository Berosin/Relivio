// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockStablecoin} from "../src/MockStablecoin.sol";
import {YieldAdapter} from "../src/defi/YieldAdapter.sol";

contract YieldAdapterTest is Test {
    MockStablecoin stablecoin;
    YieldAdapter adapter;
    address depositor = makeAddr("depositor"); // simulates a CommunityFund/Campaign contract

    function setUp() public {
        stablecoin = new MockStablecoin();
        adapter = new YieldAdapter(address(stablecoin));
        adapter.setAuthorizedCaller(depositor, true);
        stablecoin.ownerMint(depositor, 10_000e6);

        // Pre-fund the mock protocol's reserve so simulated yield is payable on harvest,
        // mirroring script/SeedYieldReserve.s.sol in a real deployment.
        stablecoin.ownerMint(address(adapter.protocol()), 1_000e6);
    }

    function test_DepositTracksPrincipal() public {
        vm.startPrank(depositor);
        stablecoin.approve(address(adapter), 1_000e6);
        adapter.deposit(depositor, 1_000e6);
        vm.stopPrank();

        assertEq(adapter.principalOf(depositor), 1_000e6);
        assertTrue(adapter.isSimulated(), "adapter must self-report as simulated yield");
    }

    function test_YieldAccruesOverTime() public {
        vm.startPrank(depositor);
        stablecoin.approve(address(adapter), 1_000e6);
        adapter.deposit(depositor, 1_000e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 pending = adapter.pendingYield(depositor);
        // ~4% simulated APY on 1,000e6 over 1 year ≈ 40e6
        assertApproxEqAbs(pending, 40e6, 1e6);
    }

    function test_HarvestPaysYieldToDepositor() public {
        vm.startPrank(depositor);
        stablecoin.approve(address(adapter), 1_000e6);
        adapter.deposit(depositor, 1_000e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        vm.prank(depositor);
        uint256 harvested = adapter.harvest(depositor);

        assertApproxEqAbs(harvested, 40e6, 1e6);
        // depositor started with 10,000e6, put 1,000e6 to work, so balance = 9,000e6 remaining + harvested yield
        assertApproxEqAbs(stablecoin.balanceOf(depositor), 9_000e6 + 40e6, 1e6);
    }

    function test_WithdrawReturnsExactPrincipal() public {
        vm.startPrank(depositor);
        stablecoin.approve(address(adapter), 1_000e6);
        adapter.deposit(depositor, 1_000e6);
        adapter.withdraw(depositor, 400e6);
        vm.stopPrank();

        assertEq(adapter.principalOf(depositor), 600e6);
        assertEq(stablecoin.balanceOf(depositor), 9_000e6 + 400e6);
    }

    function test_UnauthorizedCallerReverts() public {
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(bytes("YieldAdapter: not authorized"));
        adapter.deposit(stranger, 1e6);
    }
}
