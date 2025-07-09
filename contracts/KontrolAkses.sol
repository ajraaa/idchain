// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error OnlyDukcapil();
error OnlyKalurahan();
error OnlyWargaTerdaftar();
error AddressZero();
error IdSudahDipakai();
error AddressSudahDipakai();
error NikSudahDiklaim();
error WalletSudahDigunakan();

contract KontrolAkses {
    address public dukcapil;
    mapping(address => bool) public kalurahan;

    mapping(address => string) public nikByWallet; // Mapping wallet ke nik
    mapping(string => address) public walletByNik; // Mapping nik ke wallet

    mapping(uint8 => address) public addressKalurahanById; // Mapping id kalurahan ke wallet kalurahan
    mapping(address => uint8) public idKalurahanByAddress; // Mapping wallet kalurahan ke id kalurahan

    // ====== CID Mapping Kalurahan di IPFS ======
    string public kalurahanMappingCID;
    event KalurahanMappingCIDUpdated(string newCID);

    event WargaTerdaftar(address indexed wallet, string nik); // Event warga terdaftar

    constructor() {
        dukcapil = msg.sender; // Deployer adalah dukcapil
    }

    modifier onlyDukcapil() {
        require(msg.sender == dukcapil, OnlyDukcapil());
        _;
    }

    modifier onlyKalurahan() {
        require(kalurahan[msg.sender], OnlyKalurahan());
        _;
    }

    modifier onlyWargaTerdaftar() {
        require(
            bytes(nikByWallet[msg.sender]).length > 0,
            OnlyWargaTerdaftar()
        );
        _;
    }

    function tambahKalurahanById(
        uint8 _id,
        address _akun
    ) external onlyDukcapil {
        require(_akun != address(0), AddressZero());
        require(addressKalurahanById[_id] == address(0), IdSudahDipakai());
        require(
            idKalurahanByAddress[_akun] == 0 && _id != 0,
            AddressSudahDipakai()
        );

        addressKalurahanById[_id] = _akun;
        idKalurahanByAddress[_akun] = _id;
        kalurahan[_akun] = true;
    }

    function hapusKalurahan(address _akun) external onlyDukcapil {
        kalurahan[_akun] = false;
        uint8 id = idKalurahanByAddress[_akun];
        if (id != 0) {
            delete addressKalurahanById[id];
            delete idKalurahanByAddress[_akun];
        }
    }

    function registerWarga(string memory _nik) external {
        require(walletByNik[_nik] == address(0), NikSudahDiklaim());
        require(
            bytes(nikByWallet[msg.sender]).length == 0,
            WalletSudahDigunakan()
        );

        walletByNik[_nik] = msg.sender;
        nikByWallet[msg.sender] = _nik;

        emit WargaTerdaftar(msg.sender, _nik);
    }

    function setKalurahanMappingCID(
        string calldata _cid
    ) external onlyDukcapil {
        kalurahanMappingCID = _cid;
        emit KalurahanMappingCIDUpdated(_cid);
    }

    function getKalurahanMappingCID() external view returns (string memory) {
        return kalurahanMappingCID;
    }
}
