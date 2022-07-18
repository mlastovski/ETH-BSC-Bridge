// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./BridgeBase.sol";

contract BridgeETH is BridgeBase {
    constructor(address _validator, address _erc20) {
        erc20 = ERC20(_erc20);
        validator = _validator;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}  
    