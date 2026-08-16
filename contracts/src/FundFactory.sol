// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CommunityFund} from "./CommunityFund.sol";
import {YieldAdapter} from "./defi/YieldAdapter.sol";
import {Reputation} from "./Reputation.sol";

/// @title FundFactory
/// @notice Deploys a new CommunityFund (Core Use Case 1) plus its own
///         dedicated YieldAdapter, and wires up permissions automatically so
///         organizers never have to perform manual admin steps.
contract FundFactory {
    address public immutable stablecoin;
    address public immutable reputation;

    /// @notice Minimum time a single wallet must wait between creating funds.
    ///         Prevents spam/flooding the platform with junk funds — a real
    ///         organizer creating a genuine fund is never blocked by this.
    uint256 public constant CREATION_COOLDOWN = 1 hours;
    mapping(address => uint256) public lastFundCreatedAt;

    address[] public allFunds;
    mapping(address => address[]) public fundsByOrganizer;

    event FundCreated(address indexed fund, address indexed organizer, address yieldAdapter, string name);

    constructor(address _stablecoin, address _reputation) {
        stablecoin = _stablecoin;
        reputation = _reputation;
    }

    function createFund(CommunityFund.FundConfig memory cfg) external returns (address fund) {
        require(
            lastFundCreatedAt[msg.sender] == 0 || block.timestamp >= lastFundCreatedAt[msg.sender] + CREATION_COOLDOWN,
            "FundFactory: creation cooldown active, please wait before creating another fund"
        );
        lastFundCreatedAt[msg.sender] = block.timestamp;

        YieldAdapter adapter = new YieldAdapter(stablecoin);

        fund = address(
            new CommunityFund(stablecoin, address(adapter), reputation, msg.sender, cfg)
        );

        adapter.setAuthorizedCaller(fund, true);
        Reputation(reputation).setReporter(fund, true);

        allFunds.push(fund);
        fundsByOrganizer[msg.sender].push(fund);

        emit FundCreated(fund, msg.sender, address(adapter), cfg.name);
    }

    function allFundsCount() external view returns (uint256) {
        return allFunds.length;
    }

    function fundsOf(address organizer) external view returns (address[] memory) {
        return fundsByOrganizer[organizer];
    }

    /// @notice Seconds remaining before `organizer` can create another fund (0 if none).
    function cooldownRemaining(address organizer) external view returns (uint256) {
        uint256 nextAllowed = lastFundCreatedAt[organizer] + CREATION_COOLDOWN;
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }
}