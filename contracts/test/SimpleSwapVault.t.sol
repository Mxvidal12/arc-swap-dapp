// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SimpleSwapVault} from "../src/SimpleSwapVault.sol";

contract MockERC20 {
    string public name = "Mock";
    string public symbol = "MCK";
    uint8 public immutable decimals;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(uint8 _decimals) {
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return transferFrom(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 bal = balanceOf[from];
        if (bal < amount) return false;
        if (from != msg.sender) {
            uint256 a = allowance[from][msg.sender];
            if (a < amount) return false;
            allowance[from][msg.sender] = a - amount;
        }
        balanceOf[from] = bal - amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract SimpleSwapVaultTest is Test {
    SimpleSwapVault internal vault;
    MockERC20 internal usdc;
    MockERC20 internal weth;

    address internal alice = address(0xA11CE);
    address internal lp = address(0xLP);

    function setUp() public {
        vault = new SimpleSwapVault();
        usdc = new MockERC20(6);
        weth = new MockERC20(18);

        // 1 USDC (1e6) -> 0.0003 WETH = 3e14 wei
        vault.setPair(address(usdc), address(weth), 300_000_000, 1, true);

        usdc.mint(alice, 10_000e6);
        weth.mint(lp, 100e18);

        vm.startPrank(lp);
        weth.approve(address(vault), type(uint256).max);
        vault.deposit(address(weth), 50e18);
        vm.stopPrank();
    }

    function test_swap_success_transfersExpectedOut() public {
        uint256 amountIn = 100e6; // 100 USDC
        uint256 expectedOut = vault.getAmountOut(address(usdc), address(weth), amountIn);

        vm.startPrank(alice);
        usdc.approve(address(vault), amountIn);
        uint256 wethBefore = weth.balanceOf(alice);
        vault.swap(address(usdc), address(weth), amountIn, expectedOut);
        vm.stopPrank();

        assertEq(weth.balanceOf(alice) - wethBefore, expectedOut);
    }

    function test_swap_revertsWhenUserTokenInBalanceTooLow() public {
        address poor = address(0xB0B);
        usdc.mint(poor, 5e6);

        vm.startPrank(poor);
        usdc.approve(address(vault), type(uint256).max);
        vm.expectRevert(SimpleSwapVault.TransferInFailed.selector);
        vault.swap(address(usdc), address(weth), 10e6, 0);
        vm.stopPrank();
    }
}
