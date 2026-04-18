// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC20 interface for vault swaps.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title SimpleSwapVault
/// @dev Pulls `tokenIn` via transferFrom, sends `tokenOut` from vault liquidity.
///      Exchange rate is configured per directed pair (tokenIn -> tokenOut) as amountOut = amountIn * rateNum / rateDen.
contract SimpleSwapVault {
    address public owner;

    struct Pair {
        uint256 rateNum;
        uint256 rateDen;
        bool active;
    }

    mapping(bytes32 => Pair) public pairs;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PairSet(
        address indexed tokenIn, address indexed tokenOut, uint256 rateNum, uint256 rateDen, bool active
    );
    event Deposited(address indexed token, uint256 amount, address indexed from);
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    error NotOwner();
    error ZeroAddress();
    error BadRate();
    error PairInactive();
    error ZeroAmount();
    error Slippage();
    error InsufficientLiquidity();
    error TransferInFailed();
    error TransferOutFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _pairKey(address tokenIn, address tokenOut) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenIn, tokenOut));
    }

    /// @notice Configure exchange rate for tokenIn -> tokenOut (directed).
    function setPair(address tokenIn, address tokenOut, uint256 rateNum, uint256 rateDen, bool active)
        external
        onlyOwner
    {
        if (tokenIn == address(0) || tokenOut == address(0)) revert ZeroAddress();
        if (rateDen == 0) revert BadRate();
        pairs[_pairKey(tokenIn, tokenOut)] = Pair({rateNum: rateNum, rateDen: rateDen, active: active});
        emit PairSet(tokenIn, tokenOut, rateNum, rateDen, active);
    }

    function getPair(address tokenIn, address tokenOut) external view returns (uint256 rateNum, uint256 rateDen, bool active)
    {
        Pair memory p = pairs[_pairKey(tokenIn, tokenOut)];
        return (p.rateNum, p.rateDen, p.active);
    }

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        Pair memory p = pairs[_pairKey(tokenIn, tokenOut)];
        if (!p.active) revert PairInactive();
        amountOut = amountIn * p.rateNum / p.rateDen;
    }

    /// @notice Anyone can seed vault liquidity (e.g. testnet faucet wallet).
    function deposit(address token, uint256 amount) external {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) revert TransferInFailed();
        emit Deposited(token, amount, msg.sender);
    }

    /// @param minAmountOut Slippage protection: revert if output is below this.
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external {
        if (tokenIn == address(0) || tokenOut == address(0)) revert ZeroAddress();
        if (amountIn == 0) revert ZeroAmount();

        uint256 amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        if (amountOut < minAmountOut) revert Slippage();
        if (IERC20(tokenOut).balanceOf(address(this)) < amountOut) revert InsufficientLiquidity();

        if (!IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn)) revert TransferInFailed();
        if (!IERC20(tokenOut).transfer(msg.sender, amountOut)) revert TransferOutFailed();

        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
