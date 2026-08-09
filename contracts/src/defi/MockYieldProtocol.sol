// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockYieldProtocol
/// @notice ============================================================
///         SIMULATED TESTNET YIELD — NOT A REAL DEFI PROTOCOL.
///         ============================================================
///         Used only when no suitable real testnet DeFi protocol is available.
///         Accrues a fixed, transparent, linear APY on deposited principal so the
///         Relivio UI has something real to read on-chain and MUST label it
///         "SIMULATED TESTNET YIELD" everywhere it is displayed.
///         This contract must never be deployed to, or described as usable on, mainnet.
contract MockYieldProtocol {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    uint256 public constant SIMULATED_APY_BPS = 400; // 4.00% simulated APY
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    struct Position {
        uint256 principal;
        uint256 lastAccrualTimestamp;
        uint256 accruedYield;
    }

    mapping(address => Position) public positions;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event YieldHarvested(address indexed account, uint256 amount);

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function _accrue(address account) internal {
        Position storage p = positions[account];
        if (p.principal > 0 && p.lastAccrualTimestamp > 0) {
            uint256 elapsed = block.timestamp - p.lastAccrualTimestamp;
            uint256 newYield = (p.principal * SIMULATED_APY_BPS * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
            p.accruedYield += newYield;
        }
        p.lastAccrualTimestamp = block.timestamp;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "MockYieldProtocol: zero amount");
        _accrue(msg.sender);
        asset.safeTransferFrom(msg.sender, address(this), amount);
        positions[msg.sender].principal += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        _accrue(msg.sender);
        Position storage p = positions[msg.sender];
        require(amount <= p.principal, "MockYieldProtocol: insufficient principal");
        p.principal -= amount;
        asset.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function harvest() external returns (uint256) {
        _accrue(msg.sender);
        Position storage p = positions[msg.sender];
        uint256 amount = p.accruedYield;
        if (amount == 0) return 0;
        p.accruedYield = 0;
        // Simulated yield is minted implicitly by the protocol backing reserve.
        // For the prototype, the deployer must pre-fund this contract with a
        // yield reserve (see script/SeedYieldReserve.s.sol) so harvests are payable.
        require(asset.balanceOf(address(this)) >= p.principal + amount, "MockYieldProtocol: reserve underfunded");
        asset.safeTransfer(msg.sender, amount);
        emit YieldHarvested(msg.sender, amount);
        return amount;
    }

    function pendingYield(address account) external view returns (uint256) {
        Position memory p = positions[account];
        if (p.principal == 0 || p.lastAccrualTimestamp == 0) return p.accruedYield;
        uint256 elapsed = block.timestamp - p.lastAccrualTimestamp;
        uint256 newYield = (p.principal * SIMULATED_APY_BPS * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        return p.accruedYield + newYield;
    }

    function principalOf(address account) external view returns (uint256) {
        return positions[account].principal;
    }
}
