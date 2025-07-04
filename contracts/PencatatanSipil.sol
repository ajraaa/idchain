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
        DisetujuiKalurahan,
        DitolakKalurahan,
        DisetujuiDukcapil,
        DitolakDukcapil,
        DisetujuiKalurahanAsal,
        DitolakKalurahanAsal,
        DisetujuiKalurahanTujuan,
        DitolakKalurahanTujuan,
        DibatalkanPemohon
    }

    struct Permohonan {
        uint256 id; // ID permohonan
        uint256 waktuPengajuan; // waktu pengajuan permohonan
        uint256 waktuVerifikasiKalurahan; // waktu permohonan diverifikasi di kalurahan
        uint256 waktuVerifikasiKalurahanTujuan; // waktu permohonan diverifikasi di kalurahan tujuan
        uint256 waktuVerifikasiDukcapil; // waktu permohonan diverifikasi di dukcapil
        address pemohon; // alamat pemohon
        address verifikatorKalurahan; // alamat verifikator kalurahan
        address verifikatorKalurahanTujuan; // alamat verifikator kalurahan tujuan
        address verifikatorDukcapil; // alamat verifikator dukcapil
        string cidIPFS; // cid ipfs dari dokumen formulir terenkripsi
        string alasanPenolakan; // alasan penolakan
        JenisPermohonan jenis; // jenis permohonan
        Status status; // status permohonan terkini
        uint8 idKalurahanAsal; // ID untuk mapping kalurahan asal
        uint8 idKalurahanTujuan; // ID untuk permohonan pindah
    }

    uint256 public jumlahPermohonan;
    mapping(uint256 => Permohonan) permohonans;
    mapping(address => uint256[]) public daftarPermohonanPemohon;
    mapping(uint8 => uint256[]) public daftarPermohonanKalurahanAsal;
    mapping(uint8 => uint256[]) daftarPermohonanKalurahanTujuan;
    mapping(Status => uint256[]) public daftarPermohonanPerStatus;
    mapping(uint256 => string) public cidDokumenResmi;

    event PermohonanDiajukan(
        uint256 indexed id,
        address indexed pemohon,
        JenisPermohonan jenis,
        string cidIPFS,
        uint256 waktu
    );

    event PermohonanDibatalkan(
        uint256 indexed id,
        address indexed pemohon,
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

    event DokumenResmiDiunggah(
        uint256 indexed idPermohonan,
        string cidDokumen,
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
        if (s == Status.DisetujuiKalurahan) return "Disetujui Kalurahan";
        if (s == Status.DitolakKalurahan) return "Ditolak Kalurahan";
        if (s == Status.DisetujuiDukcapil) return "Disetujui Dukcapil";
        if (s == Status.DitolakDukcapil) return "Ditolak Dukcapil";
        if (s == Status.DisetujuiKalurahanAsal)
            return "Disetujui Kalurahan Asal";
        if (s == Status.DitolakKalurahanAsal) return "Ditolak Kalurahan Asal";
        if (s == Status.DisetujuiKalurahanTujuan)
            return "Disetujui Kalurahan Tujuan";
        if (s == Status.DitolakKalurahanTujuan)
            return "Ditolak Kalurahan Tujuan";
        if (s == Status.DibatalkanPemohon) return "Dibatalkan oleh Pemohon";

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

    function _hapusByStatus(uint256 _id, Status _status) internal {
        uint256[] storage daftar = daftarPermohonanPerStatus[_status];
        for (uint256 i = 0; i < daftar.length; i++) {
            if (daftar[i] == _id) {
                daftar[i] = daftar[daftar.length - 1];
                daftar.pop();
                break;
            }
        }
    }

    function submitPermohonan(
        JenisPermohonan _jenis,
        string calldata _cidIPFS,
        uint8 _idKalurahanAsal,
        uint8 _idKalurahanTujuan // Hanya wajib jika jenis == Pindah
    ) external onlyWargaTerdaftar {
        require(bytes(_cidIPFS).length > 0, "CID IPFS tidak boleh kosong.");
        require(
            addressKalurahanById[_idKalurahanAsal] != address(0),
            "ID Kalurahan Asal tidak valid."
        );

        // Validasi tambahan jika jenisnya Pindah
        if (_jenis == JenisPermohonan.Pindah) {
            require(
                _idKalurahanTujuan != 0,
                "ID Kalurahan Tujuan harus diisi."
            );
            require(
                addressKalurahanById[_idKalurahanTujuan] != address(0),
                "ID Kalurahan Tujuan tidak valid."
            );
        }

        uint256 idBaru = jumlahPermohonan++;

        permohonans[idBaru] = Permohonan({
            id: idBaru,
            waktuPengajuan: block.timestamp,
            waktuVerifikasiKalurahan: 0,
            waktuVerifikasiKalurahanTujuan: 0,
            waktuVerifikasiDukcapil: 0,
            pemohon: msg.sender,
            verifikatorKalurahan: address(0),
            verifikatorKalurahanTujuan: address(0),
            verifikatorDukcapil: address(0),
            cidIPFS: _cidIPFS,
            alasanPenolakan: "",
            jenis: _jenis,
            status: Status.Diajukan,
            idKalurahanAsal: _idKalurahanAsal,
            idKalurahanTujuan: _jenis == JenisPermohonan.Pindah
                ? _idKalurahanTujuan
                : 0
        });

        daftarPermohonanPemohon[msg.sender].push(idBaru);
        daftarPermohonanKalurahanAsal[_idKalurahanAsal].push(idBaru);
        daftarPermohonanPerStatus[Status.Diajukan].push(idBaru);

        // Tambahkan ke mapping kalurahan tujuan jika jenisnya Pindah
        if (_jenis == JenisPermohonan.Pindah) {
            daftarPermohonanKalurahanTujuan[_idKalurahanTujuan].push(idBaru);
        }

        emit PermohonanDiajukan(
            idBaru,
            msg.sender,
            _jenis,
            _cidIPFS,
            block.timestamp
        );
    }

    function batalkanPermohonan(uint256 _id) external onlyWargaTerdaftar {
        Permohonan storage p = permohonans[_id];

        require(p.pemohon == msg.sender, "Bukan pemilik permohonan.");
        require(
            p.status == Status.Diajukan,
            "Permohonan tidak dapat dibatalkan."
        );

        _hapusByStatus(_id, Status.Diajukan); // Hapus dari mapping status sebelumnya

        p.status = Status.DibatalkanPemohon;
        p.waktuVerifikasiKalurahan = block.timestamp; // Waktu pembatalan
        p.alasanPenolakan = "Permohonan dibatalkan oleh pemohon.";

        emit PermohonanDibatalkan(p.id, msg.sender, block.timestamp);
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

        _hapusByStatus(_id, Status.Diajukan);

        if (_disetujui) {
            p.status = Status.DisetujuiKalurahan;
            daftarPermohonanPerStatus[Status.DisetujuiKalurahan].push(_id);
        } else {
            p.status = Status.DitolakKalurahan;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[Status.DitolakKalurahan].push(_id);
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

    function verifikasiKalurahanAsalPindah(
        uint256 _id,
        bool _disetujui,
        string calldata _alasan,
        uint8 _idKalurahanTujuan
    ) external onlyKalurahan onlyKalurahanAsal(_id) {
        Permohonan storage p = permohonans[_id];

        require(
            p.status == Status.Diajukan,
            "Permohonan bukan dalam status Diajukan."
        );
        require(p.jenis == JenisPermohonan.Pindah, "Bukan permohonan pindah.");

        _hapusByStatus(_id, Status.Diajukan);

        if (_disetujui) {
            require(_idKalurahanTujuan != 0, "Tujuan tidak valid!");
            require(
                addressKalurahanById[_idKalurahanTujuan] != address(0),
                "ID kalurahan tujuan tidak dikenal!"
            );

            p.idKalurahanTujuan = _idKalurahanTujuan;
            p.status = Status.DisetujuiKalurahanAsal;
            daftarPermohonanPerStatus[Status.DisetujuiKalurahanAsal].push(_id);
        } else {
            p.status = Status.DitolakKalurahanAsal;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[Status.DitolakKalurahanAsal].push(_id);
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

    function verifikasiKalurahanTujuanPindah(
        uint256 _id,
        bool _disetujui,
        string calldata _alasan
    ) external onlyKalurahan {
        Permohonan storage p = permohonans[_id];

        require(p.jenis == JenisPermohonan.Pindah, "Bukan permohonan pindah.");

        require(
            p.status == Status.DisetujuiKalurahanAsal,
            "Belum diverifikasi Kalurahan Asal."
        );

        require(
            idKalurahanByAddress[msg.sender] == p.idKalurahanTujuan,
            "Hanya kalurahan tujuan yang dapat memverifikasi."
        );

        _hapusByStatus(_id, Status.DisetujuiKalurahanAsal);

        if (_disetujui) {
            p.status = Status.DisetujuiKalurahanTujuan;
            daftarPermohonanPerStatus[Status.DisetujuiKalurahanTujuan].push(
                _id
            );
        } else {
            p.status = Status.DitolakKalurahanTujuan;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[Status.DitolakKalurahanTujuan].push(_id);
        }

        p.verifikatorKalurahanTujuan = msg.sender;
        p.waktuVerifikasiKalurahanTujuan = block.timestamp;

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

        if (p.jenis == JenisPermohonan.Pindah) {
            require(
                p.status == Status.DisetujuiKalurahanTujuan,
                "Permohonan pindah belum disetujui Kalurahan Tujuan."
            );
            _hapusByStatus(_id, Status.DisetujuiKalurahanTujuan);
        } else {
            require(
                p.status == Status.DisetujuiKalurahan,
                "Permohonan belum disetujui Kalurahan."
            );
            _hapusByStatus(_id, Status.DisetujuiKalurahan);
        }

        if (_disetujui) {
            p.status = Status.DisetujuiDukcapil;
            daftarPermohonanPerStatus[Status.DisetujuiDukcapil].push(_id);
        } else {
            p.status = Status.DitolakDukcapil;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[Status.DitolakDukcapil].push(_id);
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
    ) external view returns (Permohonan memory) {
        return permohonans[_id];
    }

    function getPermohonanByKalurahanAsal()
        external
        view
        onlyKalurahan
        returns (uint256[] memory)
    {
        uint8 idKalurahan = idKalurahanByAddress[msg.sender];
        return daftarPermohonanKalurahanAsal[idKalurahan];
    }

    function getPermohonanBelumVerifikasiKalurahan(
        Status _status
    ) external view onlyKalurahan returns (uint256[] memory) {
        uint8 idKalurahan = idKalurahanByAddress[msg.sender];
        uint256[] storage semua = daftarPermohonanKalurahanAsal[idKalurahan];

        uint256[] memory temp = new uint256[](semua.length);
        uint256 count = 0;

        for (uint256 i = 0; i < semua.length; i++) {
            if (permohonans[semua[i]].status == _status) {
                temp[count] = semua[i];
                count++;
            }
        }

        uint256[] memory hasil = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            hasil[i] = temp[i];
        }

        return hasil;
    }

    function getPermohonanByKalurahanTujuan()
        external
        view
        onlyKalurahan
        returns (uint256[] memory)
    {
        uint8 idTujuan = idKalurahanByAddress[msg.sender];
        return daftarPermohonanKalurahanTujuan[idTujuan];
    }

    function getPermohonanForDukcapil(
        Status _status
    ) external view onlyDukcapil returns (uint256[] memory) {
        return daftarPermohonanPerStatus[_status];
    }

    function unggahDokumenResmi(
        uint256 _id,
        string calldata _cidDokumen
    ) external onlyDukcapil {
        require(
            permohonans[_id].status == Status.DisetujuiDukcapil,
            "Permohonan belum disetujui Dukcapil."
        );
        require(bytes(_cidDokumen).length > 0, "CID tidak boleh kosong.");

        cidDokumenResmi[_id] = _cidDokumen;

        emit DokumenResmiDiunggah(_id, _cidDokumen, block.timestamp);
    }

    function getDokumenResmi(
        uint256 _id
    ) external view returns (string memory) {
        require(
            bytes(cidDokumenResmi[_id]).length > 0,
            "Belum ada dokumen resmi."
        );
        require(
            msg.sender == permohonans[_id].pemohon || dukcapil[msg.sender],
            "Akses ditolak: bukan pemohon atau petugas Dukcapil."
        );

        return cidDokumenResmi[_id];
    }
}
