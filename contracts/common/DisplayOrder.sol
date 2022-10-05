//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

/// @notice Order presentation model for clients
/// @param id Id of the order
/// @param price Price per token in ETH
/// @param amount Amount of tokens in the order
struct DisplayOrder {
    uint id;
    uint price;
    uint amount;
}