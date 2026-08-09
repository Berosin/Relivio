// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IYieldAdapter} from "../interfaces/IYieldAdapter.sol";
import {MockYieldProtocol} from "./MockYieldProtocol.sol";

/// @title YieldAdapter
/// @notice The single point of contact treasuries (CommunityFund / Campaign) use to put idle
///         capital to work. Internally forwards to MockYieldProtocol today; a real testnet
///         DeFi protocol integration can be swapped in later without changing treasury code.
/// @dev isSimulated() MUST be surfaced by the frontend as "SIMULATED TESTNET YIELD".
contract YieldAdapter is IYieldAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    MockYieldProtocol public immutable protocol;
    bool public constant SIMULATED = true;

    mapping(address => bool) public authorizedCallers; // funds/campaigns allowed to use this adapter

    event AuthorizedCallerSet(address indexed caller, bool allowed);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender], "YieldAdapter: not authorized");
        _;
    }

    constructor(address _asset) Ownable(msg.sender) {
        asset = IERC20(_asset);
        protocol = new MockYieldProtocol(_asset);
    }

    function setAuthorizedCaller(address caller, bool allowed) external onlyOwner {
        authorizedCallers[caller] = allowed;
        emit AuthorizedCallerSet(caller, allowed);
    }

    function deposit(address depositor, uint256 amount) external onlyAuthorized {
        require(depositor == msg.sender, "YieldAdapter: depositor mismatch");
        asset.safeTransferFrom(msg.sender, address(this), amount);
        asset.forceApprove(address(protocol), amount);
        protocol.deposit(amount);
        // NOTE: MockYieldProtocol tracks positions by msg.sender (this adapter),
        // so per-depositor accounting is mirrored below for transparency queries.
        _principal[depositor] += amount;
    }

    function withdraw(address depositor, uint256 amount) external onlyAuthorized {
        require(depositor == msg.sender, "YieldAdapter: depositor mismatch");
        require(_principal[depositor] >= amount, "YieldAdapter: insufficient principal");
        _principal[depositor] -= amount;
        protocol.withdraw(amount);
        asset.safeTransfer(depositor, amount);
    }

    function harvest(address depositor) external onlyAuthorized returns (uint256) {
        require(depositor == msg.sender, "YieldAdapter: depositor mismatch");
        // Yield accrues at protocol level pooled across all depositors of this adapter;
        // for the prototype each fund/campaign gets its own YieldAdapter instance
        // (deployed by FundFactory/CampaignFactory) so pooled == per-depositor.
        uint256 harvested = protocol.harvest();
        if (harvested > 0) {
            asset.safeTransfer(depositor, harvested);
        }
        return harvested;
    }

    function principalOf(address depositor) external view returns (uint256) {
        return _principal[depositor];
    }

    function pendingYield(address /*depositor*/ ) external view returns (uint256) {
        return protocol.pendingYield(address(this));
    }

    function isSimulated() external pure returns (bool) {
        return SIMULATED;
    }

    mapping(address => uint256) private _principal;
}
