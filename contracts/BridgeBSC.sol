// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./BridgeBase.sol";

contract BridgeBSC is BridgeBase {
    constructor(address _validator, address _erc20) {
        validator = _validator;
        erc20 = ERC20(_erc20);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}  
    