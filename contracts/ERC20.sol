// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ERC20 is AccessControl {
    string private _tokenName;
    string private _tokenSymbol;
    uint8 private _tokenDecimals;
    uint256 private _tokenTotalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowed;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        _tokenName = _name;
        _tokenSymbol = _symbol;
        _tokenDecimals = _decimals;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    function name() public view returns (string memory) {
        return _tokenName;
    }

    function symbol() public view returns (string memory) {
        return _tokenSymbol;
    }

    function decimals() public view returns (uint8) {
        return _tokenDecimals;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenTotalSupply;
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return _balances[_owner];
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_value <= _balances[msg.sender], "Insufficient balance");
        _balances[msg.sender] -= _value;
        _balances[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= _balances[_from], "Insufficient balance");
        uint256 allowed = allowance(_from, msg.sender);
        require(_value <= allowed, "Insufficient allowance");
        _allowed[_from][msg.sender] -= _value;
        _balances[_from] -= _value;
        _balances[_to] += _value;

        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        _allowed[msg.sender][_spender] = _value;
        
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return _allowed[_owner][_spender];
    }

    function mint(address _to, uint256 _value) public onlyRole(DEFAULT_ADMIN_ROLE) returns (bool success) {
        _tokenTotalSupply += _value;
        _balances[_to] += _value;

        emit Transfer(address(0), _to, _value);
        return true;
    }

    function burn(address _from, uint256 _value) public onlyRole(DEFAULT_ADMIN_ROLE) returns (bool success) {
        require(_balances[_from] >= _value, "Insufficient balance");
        _balances[_from] -= _value;
        _tokenTotalSupply -= _value;

        emit Transfer(_from, address(0), _value);
        return true;
    }
}
