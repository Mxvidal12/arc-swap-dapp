// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SimpleSwapVault} from "../src/SimpleSwapVault.sol";

/// @notice Deploy SimpleSwapVault to Arc Testnet (or any EVM chain).
/// @dev Usage (from `contracts/`):
///      forge script script/DeployArc.s.sol:DeployArc --rpc-url $ARC_TESTNET_RPC_URL --broadcast
contract DeployArc is Script {
    function run() external returns (address deployed) {
        vm.startBroadcast();
        SimpleSwapVault vault = new SimpleSwapVault();
        deployed = address(vault);
        vm.stopBroadcast();
        console2.log("SimpleSwapVault deployed at:", deployed);
    }
}
