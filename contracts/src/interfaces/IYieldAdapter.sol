// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IYieldAdapter
/// @notice Abstraction so CommunityFund / Campaign treasuries never depend on a specific
///         DeFi protocol. Swap the underlying implementation (real testnet protocol vs.
///         MockYieldProtocol) without touching treasury logic.
interface IYieldAdapter {
    /// @notice Deposit `amount` of the underlying asset on behalf of `depositor` (a fund/campaign).
    function deposit(address depositor, uint256 amount) external;

    /// @notice Withdraw `amount` of principal back to the calling depositor.
    function withdraw(address depositor, uint256 amount) external;

    /// @notice Harvest accrued yield for `depositor` and transfer it back to them.
    /// @return yieldAmount The amount of yield harvested.
    function harvest(address depositor) external returns (uint256 yieldAmount);

    /// @notice Current principal deposited by `depositor`.
    function principalOf(address depositor) external view returns (uint256);

    /// @notice Current unrealized/accrued yield for `depositor`.
    function pendingYield(address depositor) external view returns (uint256);

    /// @notice Whether this adapter is backed by a real protocol or a labeled simulation.
    function isSimulated() external view returns (bool);
}
