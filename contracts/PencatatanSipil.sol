// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./KontrolAkses.sol";

contract PencatatanSipil is KontrolAkses {
    enum JenisPermohonan {
        Kelahiran,
        Kematian,
        Kawin,
        Cerai,
        Pindah
    }

    enum Status {
        Diajukan,
        DiprosesKalurahan,
        DisetujuiKalurahan,
        DitolakKalurahan,
        DiprosesDukcapil,
        DisetujuiDukcapil,
        DitolakDukcapil
    }

    struct Permohonan {
        uint256 id; // ID permohonan
        address pemohon; // alamat pemohon
        JenisPermohonan jenis; // jenis permohonan
        string cidIPFS; // cid ipfs dari dokumen formulir terenkripsi
        uint8 idKalurahanAsal; // ID untuk mapping kalurahan asal
        Status status; // status permohonan terkini
        uint256 waktuPengajuan; // waktu pengajuan permohonan
        string alasanPenolakan; // alasan penolakan
        address verifikatorKalurahan; // alamat verifikator kalurahan
        uint256 waktuVerifikasiKalurahan; // waktu permohonan diverifikasi di kalurahan
        address verifikatorDukcapil; // alamat verifikator dukcapil
        uint256 waktuVerifikasiDukcapil; // waktu permohonan diverifikasi di dukcapil
    }

    uint256 public jumlahPermohonan;
    mapping(uint256 => Permohonan) permohonans;
    mapping(address => uint256[]) public daftarPermohonanPemohon;
    mapping(uint8 => uint256[]) public daftarPermohonanKalurahanAsal;

    event PermohonanDiajukan(
        uint256 indexed id,
        address indexed pemohon,
        JenisPermohonan jenis,
        string cidIPFS,
        uint256 waktu
    );

    event VerifikasiKalurahan(
        uint256 indexed id,
        address indexed verifikator,
        bool disetujui,
        string alasan,
        uint256 waktu
    );

    event VerifikasiDukcapil(
        uint256 indexed id,
        address indexed verifikator,
        bool disetujui,
        string alasan,
        uint256 waktu
    );

    modifier onlyKalurahanAsal(uint256 _id) {
        require(
            idKalurahanByAddress[msg.sender] ==
                permohonans[_id].idKalurahanAsal,
            "Hanya kalurahan asal yang berwenang!"
        );
        _;
    }

    function getStatusPermohonan(
        uint256 _id
    ) external view returns (string memory) {
        Status s = permohonans[_id].status;

        if (s == Status.Diajukan) return "Diajukan";
        if (s == Status.DiprosesKalurahan) return "Diproses Kalurahan";
        if (s == Status.DisetujuiKalurahan) return "Disetujui Kalurahan";
        if (s == Status.DitolakKalurahan) return "Ditolak Kalurahan";
        if (s == Status.DiprosesDukcapil) return "Diproses Dukcapil";
        if (s == Status.DisetujuiDukcapil) return "Disetujui Dukcapil";
        if (s == Status.DitolakDukcapil) return "Ditolak Dukcapil";

        return "Status Tidak Dikenal";
    }

    function getJenisPermohonan(
        uint256 _id
    ) external view returns (string memory) {
        JenisPermohonan j = permohonans[_id].jenis;

        if (j == JenisPermohonan.Kelahiran) return "Kelahiran";
        if (j == JenisPermohonan.Kematian) return "Kematian";
        if (j == JenisPermohonan.Kawin) return "Kawin";
        if (j == JenisPermohonan.Cerai) return "Cerai";
        if (j == JenisPermohonan.Pindah) return "Pindah";

        return "Jenis Tidak Dikenal";
    }

    function submitPermohonan(
        JenisPermohonan _jenis,
        string calldata _cidIPFS,
        uint8 _idKalurahanAsal
    ) external {
        require(bytes(_cidIPFS).length > 0, "CID IPFS tidak boleh kosong.");

        uint256 idBaru = jumlahPermohonan++;

        permohonans[idBaru] = Permohonan({
            id: idBaru,
            pemohon: msg.sender,
            jenis: _jenis,
            cidIPFS: _cidIPFS,
            idKalurahanAsal: _idKalurahanAsal,
            status: Status.Diajukan,
            waktuPengajuan: block.timestamp,
            alasanPenolakan: "",
            verifikatorKalurahan: address(0),
            waktuVerifikasiKalurahan: 0,
            verifikatorDukcapil: address(0),
            waktuVerifikasiDukcapil: 0
        });

        daftarPermohonanPemohon[msg.sender].push(idBaru);
        daftarPermohonanKalurahanAsal[_idKalurahanAsal].push(idBaru);

        emit PermohonanDiajukan(
            idBaru,
            msg.sender,
            _jenis,
            _cidIPFS,
            block.timestamp
        );
    }

    function verifikasiKalurahan(
        uint256 _id,
        bool _disetujui,
        string calldata _alasan
    ) external onlyKalurahan onlyKalurahanAsal(_id) {
        Permohonan storage p = permohonans[_id];

        require(
            p.status == Status.Diajukan,
            "Permohonan bukan dalam status Diajukan."
        );

        if (_disetujui) {
            p.status = Status.DisetujuiKalurahan;
        } else {
            p.status = Status.DitolakKalurahan;
            p.alasanPenolakan = _alasan;
        }

        p.verifikatorKalurahan = msg.sender;
        p.waktuVerifikasiKalurahan = block.timestamp;

        emit VerifikasiKalurahan(
            _id,
            msg.sender,
            _disetujui,
            _alasan,
            block.timestamp
        );
    }

    function verifikasiDukcapil(
        uint256 _id,
        bool _disetujui,
        string calldata _alasan
    ) external onlyDukcapil {
        Permohonan storage p = permohonans[_id];

        require(
            p.status == Status.DisetujuiKalurahan,
            "Permohonan belum disetujui oleh Kalurahan."
        );

        if (_disetujui) {
            p.status = Status.DisetujuiDukcapil;
        } else {
            p.status = Status.DitolakDukcapil;
            p.alasanPenolakan = _alasan;
        }

        p.verifikatorDukcapil = msg.sender;
        p.waktuVerifikasiDukcapil = block.timestamp;

        emit VerifikasiDukcapil(
            _id,
            msg.sender,
            _disetujui,
            _alasan,
            block.timestamp
        );
    }

    function getPermohonanIDsByPemohon(
        address _pemohon
    ) external view returns (uint256[] memory) {
        return daftarPermohonanPemohon[_pemohon];
    }

    function getPermohonan(
        uint256 _id
    )
        external
        view
        returns (
            uint256 id,
            address pemohon,
            JenisPermohonan jenis,
            string memory cidIPFS,
            uint8 idKalurahanAsal,
            Status status,
            uint256 waktuPengajuan,
            string memory alasanPenolakan,
            address verifikatorKalurahan,
            uint256 waktuVerifikasiKalurahan,
            address verifikatorDukcapil,
            uint256 waktuVerifikasiDukcapil
        )
    {
        Permohonan memory p = permohonans[_id];
        return (
            p.id,
            p.pemohon,
            p.jenis,
            p.cidIPFS,
            p.idKalurahanAsal,
            p.status,
            p.waktuPengajuan,
            p.alasanPenolakan,
            p.verifikatorKalurahan,
            p.waktuVerifikasiKalurahan,
            p.verifikatorDukcapil,
            p.waktuVerifikasiDukcapil
        );
    }
}
