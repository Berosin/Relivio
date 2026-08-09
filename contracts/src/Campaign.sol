// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldAdapter} from "./interfaces/IYieldAdapter.sol";
import {Reputation} from "./Reputation.sol";

/// @title Campaign
/// @notice CORE USE CASE 2 — Disaster & Community Relief.
///         Public, transparent relief campaign. Donations never carry a repayment
///         obligation (section 8). Funds only leave the treasury via approved,
///         milestone-based distributions (section 23) — the organizer can never
///         withdraw the full treasury at once.
contract Campaign is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CampaignType {
        INDIVIDUAL_EMERGENCY,
        DISASTER_RELIEF,
        COMMUNITY_RELIEF,
        MEDICAL_RELIEF,
        REBUILDING,
        HUMANITARIAN_RELIEF,
        OTHER
    }

    enum CampaignStatus {
        ACTIVE,
        COMPLETED,
        CLOSED
    }

    enum MilestoneStatus {
        LOCKED, // waiting on prior milestone / not yet proposed
        PROPOSED, // organizer proposed release, voting open
        APPROVED,
        RELEASED,
        REJECTED
    }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
        uint256 yesShares;
        uint256 noShares;
        uint256 votingDeadline;
        uint256 releasedAt;
        bytes32 txRef; // set to the releasing tx-adjacent reference for UI display
    }

    IERC20 public immutable stablecoin;
    IYieldAdapter public immutable yieldAdapter;
    Reputation public immutable reputation;

    string public campaignName;
    CampaignType public campaignType;
    string public description;
    address public organizer;
    string public beneficiaryInfo; // free-text / IPFS CID — no sensitive PII on-chain
    uint256 public fundingTarget;
    uint256 public deadline;
    uint256 public emergencyReserveBps;
    uint256 public defiAllocationBps;
    bool public verified; // set by platform governance/verification process
    CampaignStatus public status;
    uint256 public votingThresholdBps;
    uint256 public votingDuration;

    uint256 public totalRaised;
    uint256 public totalDistributed;
    uint256 public reserveBalance;
    uint256 public contributorCount;

    mapping(address => uint256) public donatedBy;
    mapping(address => uint256) public fundSharesOf;
    uint256 public totalFundShares;

    Milestone[] public milestones;
    mapping(uint256 => mapping(address => bool)) public hasVotedMilestone;

    event Donated(address indexed donor, uint256 amount, uint256 toReserve, uint256 toDefi);
    event MilestoneAdded(uint256 indexed milestoneId, string description, uint256 amount);
    event MilestoneProposed(uint256 indexed milestoneId, uint256 votingDeadline);
    event MilestoneVoteCast(uint256 indexed milestoneId, address indexed voter, bool support, uint256 weight);
    event MilestoneFinalized(uint256 indexed milestoneId, MilestoneStatus status);
    event MilestoneReleased(uint256 indexed milestoneId, uint256 amount);
    event VerificationSet(bool verified);
    event YieldHarvested(uint256 amount);
    event StatusChanged(CampaignStatus status);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Campaign: not organizer");
        _;
    }

    struct CampaignParams {
        string name;
        CampaignType campaignType;
        string description;
        string beneficiaryInfo;
        uint256 fundingTarget;
        uint256 deadline;
        uint256 emergencyReserveBps;
        uint256 defiAllocationBps;
        uint256 votingThresholdBps;
        uint256 votingDuration;
    }

    constructor(
        address _stablecoin,
        address _yieldAdapter,
        address _reputation,
        address _organizer,
        CampaignParams memory p
    ) {
        require(p.emergencyReserveBps + p.defiAllocationBps == 10_000, "Campaign: bps must sum to 10000");
        stablecoin = IERC20(_stablecoin);
        yieldAdapter = IYieldAdapter(_yieldAdapter);
        reputation = Reputation(_reputation);
        organizer = _organizer;

        campaignName = p.name;
        campaignType = p.campaignType;
        description = p.description;
        beneficiaryInfo = p.beneficiaryInfo;
        fundingTarget = p.fundingTarget;
        deadline = p.deadline;
        emergencyReserveBps = p.emergencyReserveBps;
        defiAllocationBps = p.defiAllocationBps;
        votingThresholdBps = p.votingThresholdBps;
        votingDuration = p.votingDuration;
        status = CampaignStatus.ACTIVE;
    }

    // ------------------------------------------------------------------
    // DONATIONS (never repayable — section 8)
    // ------------------------------------------------------------------

    function donate(uint256 amount) external nonReentrant {
        require(status == CampaignStatus.ACTIVE, "Campaign: not active");
        require(amount > 0, "Campaign: zero amount");

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        if (fundSharesOf[msg.sender] == 0) {
            contributorCount += 1;
        }
        fundSharesOf[msg.sender] += amount;
        totalFundShares += amount;
        donatedBy[msg.sender] += amount;
        totalRaised += amount;

        uint256 toReserve = (amount * emergencyReserveBps) / 10_000;
        uint256 toDefi = amount - toReserve;
        reserveBalance += toReserve;

        if (toDefi > 0) {
            stablecoin.forceApprove(address(yieldAdapter), toDefi);
            yieldAdapter.deposit(address(this), toDefi);
        }

        reputation.recordContribution(msg.sender, amount);
        emit Donated(msg.sender, amount, toReserve, toDefi);
    }

    function harvestYield() external nonReentrant returns (uint256) {
        uint256 harvested = yieldAdapter.harvest(address(this));
        if (harvested > 0) {
            reserveBalance += harvested;
            emit YieldHarvested(harvested);
        }
        return harvested;
    }

    // ------------------------------------------------------------------
    // VERIFICATION (section 7 / 24) — placeholder for platform governance/verifier role.
    // Kept as organizer-set-by-owner-of-factory in production; simplified here to a
    // single verifier address settable at deploy time via the factory for the prototype.
    // ------------------------------------------------------------------

    address public verifier;

    function _setVerifierOnce(address _verifier) internal {
        if (verifier == address(0)) verifier = _verifier;
    }

    function setVerified(bool _verified) external {
        require(msg.sender == verifier, "Campaign: not verifier");
        verified = _verified;
        emit VerificationSet(_verified);
    }

    function initVerifier(address _verifier) external {
        require(verifier == address(0), "Campaign: verifier already set");
        verifier = _verifier;
    }

    // ------------------------------------------------------------------
    // MILESTONES (section 23) — organizer proposes, community votes, contract releases.
    // ------------------------------------------------------------------

    function addMilestone(string calldata desc, uint256 amount) external onlyOrganizer returns (uint256 id) {
        milestones.push(
            Milestone({
                description: desc,
                amount: amount,
                status: MilestoneStatus.LOCKED,
                yesShares: 0,
                noShares: 0,
                votingDeadline: 0,
                releasedAt: 0,
                txRef: bytes32(0)
            })
        );
        id = milestones.length - 1;
        emit MilestoneAdded(id, desc, amount);
    }

    function proposeMilestoneRelease(uint256 milestoneId) external onlyOrganizer {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.LOCKED, "Campaign: milestone not proposable");
        require(m.amount <= reserveBalance, "Campaign: exceeds available reserve");
        m.status = MilestoneStatus.PROPOSED;
        m.votingDeadline = block.timestamp + votingDuration;
        emit MilestoneProposed(milestoneId, m.votingDeadline);
    }

    function voteMilestone(uint256 milestoneId, bool support) external {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.PROPOSED, "Campaign: not open for voting");
        require(block.timestamp < m.votingDeadline, "Campaign: voting closed");
        require(!hasVotedMilestone[milestoneId][msg.sender], "Campaign: already voted");
        uint256 weight = fundSharesOf[msg.sender];
        require(weight > 0, "Campaign: not a contributing donor");

        hasVotedMilestone[milestoneId][msg.sender] = true;
        if (support) {
            m.yesShares += weight;
        } else {
            m.noShares += weight;
        }
        reputation.recordVote(msg.sender);
        emit MilestoneVoteCast(milestoneId, msg.sender, support, weight);
    }

    function finalizeMilestone(uint256 milestoneId) external nonReentrant {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.PROPOSED, "Campaign: not proposed");
        require(block.timestamp >= m.votingDeadline, "Campaign: voting still open");

        uint256 totalVotes = m.yesShares + m.noShares;
        bool approved = totalVotes > 0 && (m.yesShares * 10_000) / totalVotes >= votingThresholdBps;

        if (approved && m.amount <= reserveBalance) {
            m.status = MilestoneStatus.APPROVED;
            emit MilestoneFinalized(milestoneId, MilestoneStatus.APPROVED);
            _releaseMilestone(milestoneId);
        } else {
            m.status = MilestoneStatus.REJECTED;
            emit MilestoneFinalized(milestoneId, MilestoneStatus.REJECTED);
        }
    }

    function _releaseMilestone(uint256 milestoneId) internal {
        Milestone storage m = milestones[milestoneId];
        reserveBalance -= m.amount;
        totalDistributed += m.amount;
        m.status = MilestoneStatus.RELEASED;
        m.releasedAt = block.timestamp;

        stablecoin.safeTransfer(organizer, m.amount);
        emit MilestoneReleased(milestoneId, m.amount);

        if (totalDistributed >= totalRaised && _allMilestonesReleased()) {
            status = CampaignStatus.COMPLETED;
            emit StatusChanged(status);
        }
    }

    function _allMilestonesReleased() internal view returns (bool) {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.RELEASED && milestones[i].status != MilestoneStatus.REJECTED) {
                return false;
            }
        }
        return milestones.length > 0;
    }

    function closeCampaign() external onlyOrganizer {
        status = CampaignStatus.CLOSED;
        emit StatusChanged(status);
    }

    // ------------------------------------------------------------------
    // VIEWS
    // ------------------------------------------------------------------

    function milestonesCount() external view returns (uint256) {
        return milestones.length;
    }

    function getMilestone(uint256 id) external view returns (Milestone memory) {
        return milestones[id];
    }

    /// @notice Transparency dashboard snapshot (section 24).
    function transparencySnapshot()
        external
        view
        returns (
            uint256 raised,
            uint256 target,
            uint256 progressBps,
            uint256 distributed,
            uint256 remaining,
            uint256 defiPrincipal,
            uint256 pendingYield,
            uint256 contributors
        )
    {
        raised = totalRaised;
        target = fundingTarget;
        progressBps = fundingTarget == 0 ? 0 : (totalRaised * 10_000) / fundingTarget;
        distributed = totalDistributed;
        defiPrincipal = yieldAdapter.principalOf(address(this));
        pendingYield = yieldAdapter.pendingYield(address(this));
        remaining = (reserveBalance + defiPrincipal + pendingYield);
        contributors = contributorCount;
    }
}
