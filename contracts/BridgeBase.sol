// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import { ERC20 } from "./ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BridgeBase is AccessControl {
    ERC20 erc20;
    address public validator;

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    mapping(uint256 => bool) supportedChains;
    mapping(bytes32 => bool) redeemed;

    event SwapInitialized(
        uint256 _amount, 
        uint256 _chainTo, 
        uint256 _chainFrom, 
        address _from, 
        address _to
    ); 

    event SwapRedeemed(
        bytes32 _hash,
        uint256 _amount,
        uint256 _chainFrom,
        address _to
    );

    event ChainAdded(uint256 _id, address _from);

    event ChainRemoved(uint256 _id, address _from);

    function swap(uint256 _amount, address _to, uint256 _chainTo) public {
        require(supportedChains[_chainTo], "This chain is not supported");

        erc20.burn(msg.sender, _amount);

        emit SwapInitialized(_amount, _chainTo, block.chainid, msg.sender, _to);
    }

    function redeem(bytes32 _hash, Signature memory _signature, uint256 _amount) public {
        require(msg.sender == validator, "Not validator");
        require(!redeemed[_hash], "Can't redeem twice");
        address signer = ecrecover(_hash, _signature.v, _signature.r, _signature.s);
        require(signer == validator, "Invalid signature");

        erc20.mint(msg.sender, _amount);
        redeemed[_hash] = true;

        emit SwapRedeemed(_hash, _amount, block.chainid, msg.sender);
    }

    function addChain(uint256 _id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[_id] = true;

        emit ChainAdded(_id, msg.sender);
    }

    function removeChain(uint256 _id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[_id] = false;

        emit ChainRemoved(_id, msg.sender);
    }
}
