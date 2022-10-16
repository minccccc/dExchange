// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { DiamondLib } from "../libraries/DiamondLib.sol";
import { IERC173 } from "../interfaces/IERC173.sol";

contract OwnershipFacet is IERC173 {
    function transferOwnership(address _newOwner) external override {
        DiamondLib.enforceIsContractOwner();
        DiamondLib.setContractOwner(_newOwner);
    }

    function owner() external override view returns (address owner_) {
        owner_ = DiamondLib.contractOwner();
    }
}
