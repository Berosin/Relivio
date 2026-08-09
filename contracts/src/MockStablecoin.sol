// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockStablecoin ("RUSD")
/// @notice TESTNET-ONLY mock stablecoin used across Relivio. Has NO real-world value.
/// @dev Includes a public faucet so hackathon judges/demo wallets can self-serve test funds.
contract MockStablecoin is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6; // mirrors USDC-style 6 decimals
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** _DECIMALS;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucetClaim;

    event FaucetClaimed(address indexed to, uint256 amount);

    constructor() ERC20("Relivio Testnet USD", "RUSD") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Self-serve testnet faucet. NOT real money. Rate-limited per address.
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Relivio: faucet cooldown active"
        );
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner-only mint for seeding demo wallets during hackathon setup.
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
