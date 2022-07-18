// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import { ERC20 } from "./ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BridgeBase is AccessControl {
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
        address from, 
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
            abi.encodePacked(amount, from, chainFrom, nonce)
        );
        require(!redeemed[swapHash], "Cannot redeem twice");
        require(checkSign(from, amount, v, r, s) == true, "Invalid signature");

        redeemed[swapHash] = true;
        erc20.mint(msg.sender, amount);

        emit SwapRedeemed(amount, msg.sender, chainFrom, swapHash);
    }

    function checkSign(
        address _addr, 
        uint256 _amount, 
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s
    ) 
        private 
        view 
        returns (bool) 
    {
        bytes32 message = keccak256(abi.encodePacked(_addr, _amount));
        address signer = ecrecover(hashMessage(message), _v, _r, _s);

        if (signer == validator) {
            return true;
        } else {
            return false;
        }
    }

    function hashMessage(bytes32 _message) private pure returns (bytes32) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        return keccak256(abi.encodePacked(prefix, _message));
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
