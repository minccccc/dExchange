//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

/// @notice Order structure
/// @param id Id of the order
/// @param prev Id of the prevous order
/// @param next Id of the next order
/// @param user Address of the order owner
/// @param price Price per token in ETH
/// @param amount Amount of tokens in the order
struct Order {
    uint id;
    uint prev;
    uint next;
    address user;
    uint price;
    uint amount;
}