// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract KontrolAkses {
    address public owner;

    mapping(address => bool) public kalurahan;
    mapping(address => bool) public dukcapil;

    mapping(uint8 => address) public addressKalurahanById; // Mapping id kalurahan ke wallet kalurahan
    mapping(address => uint8) public idKalurahanByAddress; // Mapping wallet kalurahan ke id kalurahan

    constructor() {
        owner = msg.sender;
    }

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

    function tambahKalurahanById(uint8 _id, address _akun) external onlyOwner {
        require(_akun != address(0), "Alamat tidak boleh kosong!"); // Cek apakah address yang diinput kosong atau tidak
        require(addressKalurahanById[_id] == address(0), "ID sudah dipakai!"); // Cek apakah ID nya sudah dipakai atau belum
        require(
            idKalurahanByAddress[_akun] == 0 && _id != 0,
            "Address sudah dipakai!"
        ); // Cek apakah address sudah dipakai atau belum

        addressKalurahanById[_id] = _akun;
        idKalurahanByAddress[_akun] = _id;
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
