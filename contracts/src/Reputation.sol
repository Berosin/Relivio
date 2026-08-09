// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Reputation
/// @notice Tracks non-sensitive, purely financial-behavior reputation for Relivio members.
///         Score (0-100) is derived from contributions, repayments, on-time rate, and
///         governance participation. No personal/identifying data is ever stored.
contract Reputation is Ownable {
    struct Profile {
        uint256 totalContributed;
        uint256 requestsMade;
        uint256 requestsRepaid;
        uint256 requestsDefaulted;
        uint256 onTimeRepayments;
        uint256 votesCast;
    }

    mapping(address => Profile) public profiles;
    mapping(address => bool) public authorizedReporters; // CommunityFund / Campaign contracts
    mapping(address => bool) public authorizedFactories; // FundFactory / CampaignFactory

    event ReporterSet(address indexed reporter, bool allowed);
    event FactorySet(address indexed factory, bool allowed);
    event ReputationEvent(address indexed user, string kind, uint256 value);

    modifier onlyReporter() {
        require(authorizedReporters[msg.sender], "Reputation: not authorized");
        _;
    }

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner() || authorizedFactories[msg.sender], "Reputation: not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setFactory(address factory, bool allowed) external onlyOwner {
        authorizedFactories[factory] = allowed;
        emit FactorySet(factory, allowed);
    }

    /// @dev Callable by the Reputation owner directly, or by a trusted factory contract
    ///      registering a fund/campaign it just deployed.
    function setReporter(address reporter, bool allowed) external onlyOwnerOrFactory {
        authorizedReporters[reporter] = allowed;
        emit ReporterSet(reporter, allowed);
    }

    function recordContribution(address user, uint256 amount) external onlyReporter {
        profiles[user].totalContributed += amount;
        emit ReputationEvent(user, "CONTRIBUTION", amount);
    }

    function recordRequest(address user) external onlyReporter {
        profiles[user].requestsMade += 1;
        emit ReputationEvent(user, "REQUEST", 1);
    }

    function recordRepayment(address user, bool onTime) external onlyReporter {
        profiles[user].requestsRepaid += 1;
        if (onTime) profiles[user].onTimeRepayments += 1;
        emit ReputationEvent(user, "REPAYMENT", onTime ? 1 : 0);
    }

    function recordDefault(address user) external onlyReporter {
        profiles[user].requestsDefaulted += 1;
        emit ReputationEvent(user, "DEFAULT", 1);
    }

    function recordVote(address user) external onlyReporter {
        profiles[user].votesCast += 1;
        emit ReputationEvent(user, "VOTE", 1);
    }

    /// @notice Transparent, deterministic 0-100 score. Weights are public and auditable.
    function scoreOf(address user) public view returns (uint256) {
        Profile memory p = profiles[user];

        // Base score from having any positive history at all.
        uint256 score = 50;

        // Contribution component (up to +20), saturating around 2,000 RUSD contributed.
        uint256 contribComponent = (p.totalContributed * 20) / 2000e6;
        if (contribComponent > 20) contribComponent = 20;
        score += contribComponent;

        // Repayment reliability component (up to +25).
        if (p.requestsRepaid > 0) {
            uint256 onTimeRateBps = (p.onTimeRepayments * 10_000) / p.requestsRepaid;
            score += (onTimeRateBps * 25) / 10_000;
        }

        // Governance participation component (up to +10), saturating at 10 votes.
        uint256 voteComponent = p.votesCast >= 10 ? 10 : p.votesCast;
        score += voteComponent;

        // Defaults penalize heavily.
        uint256 penalty = p.requestsDefaulted * 15;
        if (penalty >= score) return 0;
        score -= penalty;

        return score > 100 ? 100 : score;
    }

    /// @notice Reputation-tiered maximum emergency-request amount (section 20).
    function maxRequestAmount(address user) external view returns (uint256) {
        uint256 score = scoreOf(user);
        if (score >= 90) return 1_000e6;
        if (score >= 75) return 700e6;
        if (score >= 50) return 400e6;
        return 100e6;
    }
}
