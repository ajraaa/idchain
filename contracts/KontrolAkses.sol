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
    event KalurahanRemoved(
        uint8 indexed id,
        address indexed akun,
        string nama,
        string newMappingCID
    );
    event KalurahanAdded(
        uint8 indexed id,
        address indexed akun,
        string newMappingCID
    );

    // ====== CID Mapping NIK-CID di IPFS ======
    string public nikMappingCID;
    event NikMappingCIDUpdated(string newCID);

    event WargaTerdaftar(address indexed wallet, string nik); // Event warga terdaftar

    constructor(string memory _initialNikMappingCID) {
        dukcapil = msg.sender; // Deployer adalah dukcapil
        nikMappingCID = _initialNikMappingCID; // Set mapping awal
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
        address _akun,
        string calldata _newMappingCID
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

        // Update mapping CID dalam transaksi yang sama
        kalurahanMappingCID = _newMappingCID;

        emit KalurahanAdded(_id, _akun, _newMappingCID);
        emit KalurahanMappingCIDUpdated(_newMappingCID);
    }

    function hapusKalurahan(
        address _akun,
        string calldata _newMappingCID
    ) external onlyDukcapil {
        kalurahan[_akun] = false;
        uint8 id = idKalurahanByAddress[_akun];
        if (id != 0) {
            delete addressKalurahanById[id];
            delete idKalurahanByAddress[_akun];
        }

        // Update mapping CID dalam transaksi yang sama
        kalurahanMappingCID = _newMappingCID;

        emit KalurahanRemoved(id, _akun, "", _newMappingCID); // Nama bisa diisi dari off-chain mapping
        emit KalurahanMappingCIDUpdated(_newMappingCID);
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

    function registerWargaAndUpdateMapping(
        string memory _nik,
        string calldata _mappingCID
    ) external {
        require(walletByNik[_nik] == address(0), NikSudahDiklaim());
        require(
            bytes(nikByWallet[msg.sender]).length == 0,
            WalletSudahDigunakan()
        );

        // Register warga
        walletByNik[_nik] = msg.sender;
        nikByWallet[msg.sender] = _nik;

        // Update mapping CID
        nikMappingCID = _mappingCID;

        emit WargaTerdaftar(msg.sender, _nik);
        emit NikMappingCIDUpdated(_mappingCID);
    }

    function getKalurahanMappingCID() external view returns (string memory) {
        return kalurahanMappingCID;
    }

    function getNikMappingCID() external view returns (string memory) {
        return nikMappingCID;
    }
}
