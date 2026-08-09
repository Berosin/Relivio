// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CommunityFund} from "./CommunityFund.sol";
import {YieldAdapter} from "./defi/YieldAdapter.sol";
import {Reputation} from "./Reputation.sol";

/// @title FundFactory
/// @notice Deploys a new CommunityFund (Core Use Case 1) plus its own dedicated
///         YieldAdapter, and wires up permissions automatically so organizers never
///         have to perform manual admin steps.
contract FundFactory {
    address public immutable stablecoin;
    address public immutable reputation;

    address[] public allFunds;
    mapping(address => address[]) public fundsByOrganizer;

    event FundCreated(address indexed fund, address indexed organizer, address yieldAdapter, string name);

    constructor(address _stablecoin, address _reputation) {
        stablecoin = _stablecoin;
        reputation = _reputation;
    }

    function createFund(CommunityFund.FundConfig memory cfg) external returns (address fund) {
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
}
