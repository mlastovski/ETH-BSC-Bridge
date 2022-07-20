// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import { ERC20 } from "./ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract BridgeBase is AccessControl {
    using ECDSA for bytes32;
    ERC20 erc20;
    address public validator;

    mapping(uint256 => bool) supportedChains;
    mapping(bytes32 => bool) redeemed;

    event SwapInitialized(
        uint256 amount, 
        address from, 
        address to,
        uint256 chainTo, 
        uint256 chainFrom, 
        uint256 nonce
    ); 

    event SwapRedeemed(
        uint256 amount,
        address to,
        uint256 chainFrom,
        bytes32 swapHash
    );

    event ChainAdded(uint256 id, address from);

    event ChainRemoved(uint256 id, address from);

    function swap(
        uint256 amount, 
        address to, 
        uint256 chainTo, 
        uint256 nonce
    ) 
        public 
    {
        require(supportedChains[chainTo], "This chain is not supported");

        erc20.burn(msg.sender, amount);

        emit SwapInitialized(amount, msg.sender, to, chainTo, block.chainid, nonce);
    }

    function redeem(
        address to, 
        uint256 amount, 
        uint8 v, 
        bytes32 r, 
        bytes32 s, 
        uint256 chainFrom, 
        uint256 nonce
    ) 
        public 
    {
        require(msg.sender == validator, "Not a validator");
        require(supportedChains[chainFrom], "This chain is not supported");
        bytes32 swapHash = keccak256(
            abi.encodePacked(amount, to, chainFrom, nonce)
        );
        require(!redeemed[swapHash], "Cannot redeem twice");
        address signer = ECDSA.recover(swapHash.toEthSignedMessageHash(), v, r, s);
        require(signer == validator, "Invalid signature");

        redeemed[swapHash] = true;
        erc20.mint(to, amount);

        emit SwapRedeemed(amount, to, chainFrom, swapHash);
    }

    function addChain(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[id] = true;

        emit ChainAdded(id, msg.sender);
    }

    function removeChain(uint256 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[id] = false;

        emit ChainRemoved(id, msg.sender);
    }
}
