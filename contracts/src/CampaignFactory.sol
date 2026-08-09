// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Campaign} from "./Campaign.sol";
import {YieldAdapter} from "./defi/YieldAdapter.sol";
import {Reputation} from "./Reputation.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CampaignFactory
/// @notice Deploys Campaign contracts (Core Use Case 2 — Disaster & Community Relief),
///         each with its own YieldAdapter. Only verifier-approved organizers (or, for the
///         hackathon prototype, anyone — verification is then a governance step performed
///         by the platform verifier address) can mark a campaign as verified.
contract CampaignFactory is Ownable {
    address public immutable stablecoin;
    address public immutable reputation;
    address public platformVerifier;

    address[] public allCampaigns;
    mapping(address => address[]) public campaignsByOrganizer;
    mapping(Campaign.CampaignType => address[]) private _campaignsByType;

    event CampaignCreated(address indexed campaign, address indexed organizer, string name, Campaign.CampaignType campaignType);
    event PlatformVerifierUpdated(address verifier);

    constructor(address _stablecoin, address _reputation, address _platformVerifier) Ownable(msg.sender) {
        stablecoin = _stablecoin;
        reputation = _reputation;
        platformVerifier = _platformVerifier;
    }

    function setPlatformVerifier(address _verifier) external onlyOwner {
        platformVerifier = _verifier;
        emit PlatformVerifierUpdated(_verifier);
    }

    function createCampaign(Campaign.CampaignParams memory params) external returns (address campaign) {
        YieldAdapter adapter = new YieldAdapter(stablecoin);

        Campaign c = new Campaign(stablecoin, address(adapter), reputation, msg.sender, params);
        campaign = address(c);

        adapter.setAuthorizedCaller(campaign, true);
        Reputation(reputation).setReporter(campaign, true);
        c.initVerifier(platformVerifier);

        allCampaigns.push(campaign);
        campaignsByOrganizer[msg.sender].push(campaign);
        _campaignsByType[params.campaignType].push(campaign);

        emit CampaignCreated(campaign, msg.sender, params.name, params.campaignType);
    }

    function allCampaignsCount() external view returns (uint256) {
        return allCampaigns.length;
    }

    function campaignsOf(address organizer) external view returns (address[] memory) {
        return campaignsByOrganizer[organizer];
    }

    function campaignsByType(Campaign.CampaignType t) external view returns (address[] memory) {
        return _campaignsByType[t];
    }
}
