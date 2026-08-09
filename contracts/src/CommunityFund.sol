// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldAdapter} from "./interfaces/IYieldAdapter.sol";
import {Reputation} from "./Reputation.sol";

/// @title CommunityFund
/// @notice CORE USE CASE 1 — Individual Emergency Assistance.
///         A community-owned, smart-contract-controlled treasury. Members contribute a
///         testnet stablecoin, split automatically between an untouchable Emergency Reserve
///         and a DeFi-yield allocation. Members request emergency assistance; the community
///         votes; approved requests are paid out automatically by the contract — never by
///         a backend or admin. Optional repayment updates on-chain reputation.
contract CommunityFund is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        RELEASED,
        REPAYING,
        REPAID,
        DEFAULTED
    }

    struct FundConfig {
        string name;
        string description;
        string fundType; // e.g. "CAMPUS_EMERGENCY", "GENERAL"
        uint256 minContribution;
        uint256 maxEmergencyRequest;
        uint256 votingDuration; // seconds
        uint256 votingThresholdBps; // e.g. 6000 = 60%
        uint256 emergencyReserveBps; // e.g. 2000 = 20%
        uint256 defiAllocationBps; // e.g. 8000 = 80%; reserveBps + defiBps must == 10000
        uint256 defaultRepaymentPeriod; // seconds, 0 = no default repayment required
    }

    struct EmergencyRequest {
        address requester;
        address recipient;
        uint256 amount;
        string reason; // short string or IPFS CID for longer detail
        uint256 repaymentPeriod; // 0 = donation-style, no repayment obligation
        RequestStatus status;
        uint256 yesShares;
        uint256 noShares;
        uint256 votingDeadline;
        uint256 createdAt;
        uint256 releasedAt;
        uint256 amountRepaid;
        uint256 repaymentDeadline;
    }

    IERC20 public immutable stablecoin;
    IYieldAdapter public immutable yieldAdapter;
    Reputation public immutable reputation;
    FundConfig public config;
    address public organizer;

    uint256 public totalDeposited;
    uint256 public totalDonatedViaTreasury; // pure treasury contributions (no repayment expectation)
    uint256 public totalDistributed;
    uint256 public reserveBalance; // held in-contract, never sent to DeFi
    uint256 public activeContributors;

    mapping(address => uint256) public contributionOf;
    mapping(address => uint256) public fundSharesOf;
    uint256 public totalFundShares;

    EmergencyRequest[] public requests;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ConfigCreated(string name, address organizer);
    event Contributed(address indexed member, uint256 amount, uint256 sharesIssued, uint256 toReserve, uint256 toDefi);
    event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, uint256 repaymentPeriod);
    event VoteCast(uint256 indexed requestId, address indexed voter, bool support, uint256 weight);
    event RequestFinalized(uint256 indexed requestId, RequestStatus status);
    event FundsReleased(uint256 indexed requestId, address indexed recipient, uint256 amount);
    event RepaymentMade(uint256 indexed requestId, address indexed payer, uint256 amount, uint256 remaining);
    event YieldHarvested(uint256 amount);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "CommunityFund: not organizer");
        _;
    }

    constructor(
        address _stablecoin,
        address _yieldAdapter,
        address _reputation,
        address _organizer,
        FundConfig memory _config
    ) {
        require(_config.emergencyReserveBps + _config.defiAllocationBps == 10_000, "CommunityFund: bps must sum to 10000");
        stablecoin = IERC20(_stablecoin);
        yieldAdapter = IYieldAdapter(_yieldAdapter);
        reputation = Reputation(_reputation);
        organizer = _organizer;
        config = _config;
        emit ConfigCreated(_config.name, _organizer);
    }

    // ------------------------------------------------------------------
    // CONTRIBUTIONS
    // ------------------------------------------------------------------

    /// @notice Deposit stablecoin into the fund. Splits automatically into reserve + DeFi
    ///         per the fund's configured percentages (section 12 / 22).
    function contribute(uint256 amount) external nonReentrant {
        require(amount >= config.minContribution, "CommunityFund: below minimum contribution");

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Fund shares track proportional participation (section 13). 1 stablecoin unit == 1 share
        // at genesis; kept simple and transparent rather than a marketing token.
        uint256 sharesIssued = amount;
        if (fundSharesOf[msg.sender] == 0) {
            activeContributors += 1;
        }
        fundSharesOf[msg.sender] += sharesIssued;
        totalFundShares += sharesIssued;
        contributionOf[msg.sender] += amount;
        totalDeposited += amount;

        uint256 toReserve = (amount * config.emergencyReserveBps) / 10_000;
        uint256 toDefi = amount - toReserve;

        reserveBalance += toReserve;

        if (toDefi > 0) {
            stablecoin.forceApprove(address(yieldAdapter), toDefi);
            yieldAdapter.deposit(address(this), toDefi);
        }

        reputation.recordContribution(msg.sender, amount);

        emit Contributed(msg.sender, amount, sharesIssued, toReserve, toDefi);
    }

    /// @notice Pull any accrued DeFi yield back into the reserve so it can fund requests.
    ///         Anyone can call this; the harvested amount always flows to the fund treasury,
    ///         never to the caller. Yield is SIMULATED TESTNET YIELD (see YieldAdapter).
    function harvestYield() external nonReentrant returns (uint256) {
        uint256 harvested = yieldAdapter.harvest(address(this));
        if (harvested > 0) {
            reserveBalance += harvested;
            emit YieldHarvested(harvested);
        }
        return harvested;
    }

    // ------------------------------------------------------------------
    // EMERGENCY REQUESTS
    // ------------------------------------------------------------------

    function createRequest(uint256 amount, string calldata reason, uint256 repaymentPeriod, address recipient)
        external
        nonReentrant
        returns (uint256 requestId)
    {
        require(amount > 0 && amount <= config.maxEmergencyRequest, "CommunityFund: amount exceeds fund max");
        uint256 repLimit = reputation.maxRequestAmount(msg.sender);
        require(amount <= repLimit, "CommunityFund: amount exceeds reputation-based limit");
        require(fundSharesOf[msg.sender] > 0, "CommunityFund: must be a contributing member to request assistance");
        require(recipient != address(0), "CommunityFund: invalid recipient");

        requests.push(
            EmergencyRequest({
                requester: msg.sender,
                recipient: recipient,
                amount: amount,
                reason: reason,
                repaymentPeriod: repaymentPeriod,
                status: RequestStatus.PENDING,
                yesShares: 0,
                noShares: 0,
                votingDeadline: block.timestamp + config.votingDuration,
                createdAt: block.timestamp,
                releasedAt: 0,
                amountRepaid: 0,
                repaymentDeadline: 0
            })
        );
        requestId = requests.length - 1;

        reputation.recordRequest(msg.sender);
        emit RequestCreated(requestId, msg.sender, amount, repaymentPeriod);
    }

    /// @notice Members vote weighted by their fund shares (proportional participation).
    function vote(uint256 requestId, bool support) external {
        EmergencyRequest storage r = requests[requestId];
        require(r.status == RequestStatus.PENDING, "CommunityFund: not open for voting");
        require(block.timestamp < r.votingDeadline, "CommunityFund: voting closed");
        require(!hasVoted[requestId][msg.sender], "CommunityFund: already voted");
        require(msg.sender != r.requester, "CommunityFund: cannot vote on your own request");
        uint256 weight = fundSharesOf[msg.sender];
        require(weight > 0, "CommunityFund: not a contributing member");

        hasVoted[requestId][msg.sender] = true;
        if (support) {
            r.yesShares += weight;
        } else {
            r.noShares += weight;
        }
        reputation.recordVote(msg.sender);
        emit VoteCast(requestId, msg.sender, support, weight);
    }

    /// @notice Anyone can finalize once the voting window closes. If approved, funds release
    ///         automatically in the same transaction — no admin step in between (section 17).
    function finalizeRequest(uint256 requestId) external nonReentrant {
        EmergencyRequest storage r = requests[requestId];
        require(r.status == RequestStatus.PENDING, "CommunityFund: already finalized");
        require(block.timestamp >= r.votingDeadline, "CommunityFund: voting still open");

        uint256 totalVotes = r.yesShares + r.noShares;
        bool approved = totalVotes > 0 && (r.yesShares * 10_000) / totalVotes >= config.votingThresholdBps;

        if (approved && r.amount <= reserveBalance) {
            r.status = RequestStatus.APPROVED;
            emit RequestFinalized(requestId, RequestStatus.APPROVED);
            _release(requestId);
        } else {
            r.status = RequestStatus.REJECTED;
            emit RequestFinalized(requestId, RequestStatus.REJECTED);
        }
    }

    function _release(uint256 requestId) internal {
        EmergencyRequest storage r = requests[requestId];
        reserveBalance -= r.amount;
        totalDistributed += r.amount;
        r.releasedAt = block.timestamp;

        if (r.repaymentPeriod > 0) {
            r.status = RequestStatus.REPAYING;
            r.repaymentDeadline = block.timestamp + r.repaymentPeriod;
        } else {
            r.status = RequestStatus.RELEASED;
            totalDonatedViaTreasury += r.amount;
        }

        stablecoin.safeTransfer(r.recipient, r.amount);
        emit FundsReleased(requestId, r.recipient, r.amount);
    }

    // ------------------------------------------------------------------
    // REPAYMENT (optional, section 18)
    // ------------------------------------------------------------------

    function repay(uint256 requestId, uint256 amount) external nonReentrant {
        EmergencyRequest storage r = requests[requestId];
        require(r.status == RequestStatus.REPAYING, "CommunityFund: not in repayment");
        require(amount > 0, "CommunityFund: zero amount");

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        r.amountRepaid += amount;
        reserveBalance += amount;

        uint256 remaining = r.amount - r.amountRepaid;
        emit RepaymentMade(requestId, msg.sender, amount, remaining);

        if (r.amountRepaid >= r.amount) {
            bool onTime = block.timestamp <= r.repaymentDeadline;
            r.status = RequestStatus.REPAID;
            reputation.recordRepayment(r.requester, onTime);
        }
    }

    /// @notice Anyone can mark an overdue, unpaid request as defaulted so reputation reflects it.
    function markDefaulted(uint256 requestId) external {
        EmergencyRequest storage r = requests[requestId];
        require(r.status == RequestStatus.REPAYING, "CommunityFund: not in repayment");
        require(block.timestamp > r.repaymentDeadline, "CommunityFund: not yet overdue");
        r.status = RequestStatus.DEFAULTED;
        reputation.recordDefault(r.requester);
    }

    // ------------------------------------------------------------------
    // VIEWS
    // ------------------------------------------------------------------

    function requestsCount() external view returns (uint256) {
        return requests.length;
    }

    function getRequest(uint256 requestId) external view returns (EmergencyRequest memory) {
        return requests[requestId];
    }

    /// @notice Full dashboard snapshot for the frontend (section 11).
    function treasurySnapshot()
        external
        view
        returns (
            uint256 totalTreasury,
            uint256 deposited,
            uint256 distributed,
            uint256 reserve,
            uint256 defiPrincipal,
            uint256 pendingYield,
            uint256 contributors
        )
    {
        defiPrincipal = yieldAdapter.principalOf(address(this));
        pendingYield = yieldAdapter.pendingYield(address(this));
        totalTreasury = reserveBalance + defiPrincipal + pendingYield;
        deposited = totalDeposited;
        distributed = totalDistributed;
        reserve = reserveBalance;
        contributors = activeContributors;
    }
}
