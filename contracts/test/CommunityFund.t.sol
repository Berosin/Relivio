// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockStablecoin} from "../src/MockStablecoin.sol";
import {Reputation} from "../src/Reputation.sol";
import {FundFactory} from "../src/FundFactory.sol";
import {CommunityFund} from "../src/CommunityFund.sol";

contract CommunityFundTest is Test {
    MockStablecoin stablecoin;
    Reputation reputation;
    FundFactory fundFactory;
    CommunityFund fund;

    address organizer = makeAddr("organizer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address requester = makeAddr("requester");

    function setUp() public {
        stablecoin = new MockStablecoin();
        reputation = new Reputation();
        fundFactory = new FundFactory(address(stablecoin), address(reputation));
        reputation.setFactory(address(fundFactory), true);

        CommunityFund.FundConfig memory cfg = CommunityFund.FundConfig({
            name: "Relivio Campus Emergency Fund",
            description: "Campus emergency assistance",
            fundType: "CAMPUS_EMERGENCY",
            minContribution: 10e6,
            maxEmergencyRequest: 500e6,
            votingDuration: 24 hours,
            votingThresholdBps: 6000,
            emergencyReserveBps: 2000,
            defiAllocationBps: 8000,
            defaultRepaymentPeriod: 90 days
        });

        vm.prank(organizer);
        address fundAddr = fundFactory.createFund(cfg);
        fund = CommunityFund(fundAddr);

        stablecoin.ownerMint(alice, 1_000e6);
        stablecoin.ownerMint(bob, 1_000e6);
        stablecoin.ownerMint(requester, 1_000e6);
    }

    function test_ContributeSplitsReserveAndDefi() public {
        vm.startPrank(alice);
        stablecoin.approve(address(fund), 100e6);
        fund.contribute(100e6);
        vm.stopPrank();

        (uint256 totalTreasury,,, uint256 reserve, uint256 defiPrincipal,,) = fund.treasurySnapshot();
        assertEq(reserve, 20e6, "20% should go to reserve");
        assertEq(defiPrincipal, 80e6, "80% should go to DeFi");
        assertEq(totalTreasury, 100e6);
    }

    function test_EmergencyRequestApprovedAndPaid() public {
        // Reserve is 20% of contributions; request 350 needs reserve >= 350, so
        // total contributions must be >= 1,750 for the 20% slice to cover it.
        stablecoin.ownerMint(alice, 1_000e6);
        stablecoin.ownerMint(bob, 1_000e6);

        vm.startPrank(alice);
        stablecoin.approve(address(fund), 1_000e6);
        fund.contribute(1_000e6);
        vm.stopPrank();

        vm.startPrank(bob);
        stablecoin.approve(address(fund), 1_000e6);
        fund.contribute(1_000e6);
        vm.stopPrank();

        vm.startPrank(requester);
        stablecoin.approve(address(fund), 10e6);
        fund.contribute(10e6); // requester must be a member to request assistance
        uint256 id = fund.createRequest(350e6, "Medical emergency", 90 days, requester);
        vm.stopPrank();

        vm.prank(alice);
        fund.vote(id, true);
        vm.prank(bob);
        fund.vote(id, true);

        vm.warp(block.timestamp + 24 hours + 1);
        fund.finalizeRequest(id);

        CommunityFund.EmergencyRequest memory r = fund.getRequest(id);
        assertEq(uint256(r.status), uint256(CommunityFund.RequestStatus.REPAYING));
        assertEq(stablecoin.balanceOf(requester), 1_000e6 - 10e6 + 350e6, "requester should receive the approved amount on top of their remaining balance");
    }

    function test_RequestRejectedBelowThreshold() public {
        vm.startPrank(alice);
        stablecoin.approve(address(fund), 500e6);
        fund.contribute(500e6);
        vm.stopPrank();

        vm.startPrank(bob);
        stablecoin.approve(address(fund), 500e6);
        fund.contribute(500e6);
        vm.stopPrank();

        vm.startPrank(requester);
        stablecoin.approve(address(fund), 10e6);
        fund.contribute(10e6);
        uint256 id = fund.createRequest(350e6, "Family emergency", 0, requester);
        vm.stopPrank();

        vm.prank(alice);
        fund.vote(id, false);
        vm.prank(bob);
        fund.vote(id, true);

        vm.warp(block.timestamp + 24 hours + 1);
        fund.finalizeRequest(id);

        CommunityFund.EmergencyRequest memory r = fund.getRequest(id);
        assertEq(uint256(r.status), uint256(CommunityFund.RequestStatus.REJECTED));
        assertEq(stablecoin.balanceOf(requester), 1_000e6 - 10e6, "requester should not receive anything on rejection");
    }

    function test_RepaymentUpdatesReputationOnTime() public {
        vm.startPrank(alice);
        stablecoin.approve(address(fund), 500e6);
        fund.contribute(500e6);
        vm.stopPrank();

        vm.startPrank(requester);
        stablecoin.approve(address(fund), 10e6);
        fund.contribute(10e6);
        uint256 id = fund.createRequest(100e6, "Student emergency", 30 days, requester);
        vm.stopPrank();

        vm.prank(alice);
        fund.vote(id, true);
        vm.warp(block.timestamp + 24 hours + 1);
        fund.finalizeRequest(id);

        stablecoin.ownerMint(requester, 100e6);
        vm.startPrank(requester);
        stablecoin.approve(address(fund), 100e6);
        fund.repay(id, 100e6);
        vm.stopPrank();

        CommunityFund.EmergencyRequest memory r = fund.getRequest(id);
        assertEq(uint256(r.status), uint256(CommunityFund.RequestStatus.REPAID));
        assertGt(reputation.scoreOf(requester), 50);
    }

    function test_NonMemberCannotCreateRequest() public {
        // requester has RUSD (minted in setUp) but has never contributed to this fund.
        vm.prank(requester);
        vm.expectRevert(bytes("CommunityFund: must be a contributing member to request assistance"));
        fund.createRequest(100e6, "Should fail - not a member", 0, requester);
    }

    function test_RequesterCannotVoteOnOwnRequest() public {
        vm.startPrank(alice);
        stablecoin.approve(address(fund), 500e6);
        fund.contribute(500e6);
        vm.stopPrank();

        // Alice both requests and tries to vote on her own request.
        vm.startPrank(alice);
        uint256 id = fund.createRequest(100e6, "Alice's own request", 0, alice);
        vm.expectRevert(bytes("CommunityFund: cannot vote on your own request"));
        fund.vote(id, true);
        vm.stopPrank();
    }

    function test_SecondFundCreationBlockedByCooldown() public {
        CommunityFund.FundConfig memory cfg = CommunityFund.FundConfig({
            name: "Second Fund",
            description: "Should be rate-limited",
            fundType: "GENERAL",
            minContribution: 10e6,
            maxEmergencyRequest: 500e6,
            votingDuration: 24 hours,
            votingThresholdBps: 6000,
            emergencyReserveBps: 2000,
            defiAllocationBps: 8000,
            defaultRepaymentPeriod: 90 days
        });

        // organizer already created one fund in setUp() at this same timestamp.
        vm.prank(organizer);
        vm.expectRevert(bytes("FundFactory: creation cooldown active, please wait before creating another fund"));
        fundFactory.createFund(cfg);
    }

    function test_FundCreationAllowedAfterCooldownExpires() public {
        CommunityFund.FundConfig memory cfg = CommunityFund.FundConfig({
            name: "Second Fund",
            description: "Created after cooldown",
            fundType: "GENERAL",
            minContribution: 10e6,
            maxEmergencyRequest: 500e6,
            votingDuration: 24 hours,
            votingThresholdBps: 6000,
            emergencyReserveBps: 2000,
            defiAllocationBps: 8000,
            defaultRepaymentPeriod: 90 days
        });

        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(organizer);
        address newFund = fundFactory.createFund(cfg);
        assertTrue(newFund != address(0));
    }

    function test_DifferentOrganizersNotAffectedByEachOthersCooldown() public {
        CommunityFund.FundConfig memory cfg = CommunityFund.FundConfig({
            name: "Bob's Fund",
            description: "A different organizer, no cooldown yet",
            fundType: "GENERAL",
            minContribution: 10e6,
            maxEmergencyRequest: 500e6,
            votingDuration: 24 hours,
            votingThresholdBps: 6000,
            emergencyReserveBps: 2000,
            defiAllocationBps: 8000,
            defaultRepaymentPeriod: 90 days
        });

        // bob has never created a fund, so he's unaffected by organizer's cooldown.
        vm.prank(bob);
        address newFund = fundFactory.createFund(cfg);
        assertTrue(newFund != address(0));
    }
}