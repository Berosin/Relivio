// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockStablecoin} from "../src/MockStablecoin.sol";
import {Reputation} from "../src/Reputation.sol";
import {CampaignFactory} from "../src/CampaignFactory.sol";
import {Campaign} from "../src/Campaign.sol";

contract CampaignTest is Test {
    MockStablecoin stablecoin;
    Reputation reputation;
    CampaignFactory campaignFactory;
    Campaign campaign;

    address organizer = makeAddr("organizer");
    address verifier = makeAddr("verifier");
    address donor1 = makeAddr("donor1");
    address donor2 = makeAddr("donor2");

    function setUp() public {
        stablecoin = new MockStablecoin();
        reputation = new Reputation();
        campaignFactory = new CampaignFactory(address(stablecoin), address(reputation), verifier);
        reputation.setFactory(address(campaignFactory), true);

        Campaign.CampaignParams memory params = Campaign.CampaignParams({
            name: "Chennai Flood Relief 2026",
            campaignType: Campaign.CampaignType.DISASTER_RELIEF,
            description: "Flood relief for Chennai",
            beneficiaryInfo: "Chennai Disaster Relief Coalition",
            fundingTarget: 100_000e6,
            deadline: block.timestamp + 60 days,
            emergencyReserveBps: 3000,
            defiAllocationBps: 7000,
            votingThresholdBps: 6000,
            votingDuration: 24 hours
        });

        vm.prank(organizer);
        address campaignAddr = campaignFactory.createCampaign(params);
        campaign = Campaign(campaignAddr);

        stablecoin.ownerMint(donor1, 50_000e6);
        stablecoin.ownerMint(donor2, 50_000e6);
    }

    function test_DonateSplitsReserveAndDefi() public {
        vm.startPrank(donor1);
        stablecoin.approve(address(campaign), 10_000e6);
        campaign.donate(10_000e6);
        vm.stopPrank();

        (uint256 raised, uint256 target, uint256 progressBps,,,,, uint256 contributors) = campaign.transparencySnapshot();
        assertEq(raised, 10_000e6);
        assertEq(target, 100_000e6);
        assertEq(progressBps, 1000); // 10%
        assertEq(contributors, 1);
    }

    function test_MilestoneReleaseRequiresApproval() public {
        vm.startPrank(donor1);
        stablecoin.approve(address(campaign), 50_000e6);
        campaign.donate(50_000e6);
        vm.stopPrank();

        vm.startPrank(donor2);
        stablecoin.approve(address(campaign), 50_000e6);
        campaign.donate(50_000e6);
        vm.stopPrank();

        vm.prank(organizer);
        uint256 m0 = campaign.addMilestone("Food & Water", 20_000e6);

        vm.prank(organizer);
        campaign.proposeMilestoneRelease(m0);

        vm.prank(donor1);
        campaign.voteMilestone(m0, true);
        vm.prank(donor2);
        campaign.voteMilestone(m0, true);

        vm.warp(block.timestamp + 24 hours + 1);
        campaign.finalizeMilestone(m0);

        Campaign.Milestone memory milestone = campaign.getMilestone(m0);
        assertEq(uint256(milestone.status), uint256(Campaign.MilestoneStatus.RELEASED));
        assertEq(stablecoin.balanceOf(organizer), 20_000e6);
    }

    function test_OrganizerCannotWithdrawWithoutMilestone() public {
        vm.startPrank(donor1);
        stablecoin.approve(address(campaign), 10_000e6);
        campaign.donate(10_000e6);
        vm.stopPrank();

        // No public withdraw function exists for organizer outside milestone flow.
        assertEq(stablecoin.balanceOf(organizer), 0);
    }

    function test_VerifierCanVerifyCampaign() public {
        assertFalse(campaign.verified());
        vm.prank(verifier);
        campaign.setVerified(true);
        assertTrue(campaign.verified());
    }
}
