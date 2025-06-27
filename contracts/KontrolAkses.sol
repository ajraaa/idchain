// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract KontrolAkses {
    address public owner;
    mapping(address => bool) public kalurahan;
    mapping(address => bool) public dukcapil;

    modifier onlyOwner() {
        require(msg.sender == owner, "Hanya owner yang dapat melakukan ini.");
        _;
    }

    modifier onlyKalurahan() {
        require(
            kalurahan[msg.sender],
            "Hanya petugas kalurahan yang diizinkan melakukan ini."
        );
        _;
    }

    modifier onlyDukcapil() {
        require(
            dukcapil[msg.sender],
            "Hanya petugas dukcapil yang diizinkan melakukan ini."
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function tambahKalurahan(address _akun) external onlyOwner {
        kalurahan[_akun] = true;
    }

    function tambahDukcapil(address _akun) external onlyOwner {
        dukcapil[_akun] = true;
    }

    function hapusKalurahan(address _akun) external onlyOwner {
        kalurahan[_akun] = false;
    }

    function hapusDukcapil(address _akun) external onlyOwner {
        dukcapil[_akun] = false;
    }
}
