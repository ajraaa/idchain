// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./KontrolAkses.sol";
import "./PencatatanTypes.sol";
import "./PermohonanUtils.sol";
import "./PencatatanViewUtils.sol";

error BukanPemilikPermohonan();
error TidakDapatDibatalkan();
error PermohonanBukanDiajukan();
error BukanPermohonanPindah();
error TujuanTidakValid();
error IdKalurahanTujuanTidakDikenal();
error BelumDiverifikasiKalurahanAsal();
error HanyaKalurahanTujuan();
error PermohonanPindahBelumDisetujuiKalurahanTujuan();
error PermohonanBelumDisetujuiKalurahan();
error CidKosong();
error BelumAdaDokumenResmi();
error AksesDitolak();

abstract contract PermohonanManager is KontrolAkses, PencatatanTypes {
    using PermohonanUtils for uint256[];
    using PencatatanViewUtils for PencatatanTypes.Status;
    using PencatatanViewUtils for PencatatanTypes.JenisPermohonan;
    using PencatatanViewUtils for PencatatanTypes.JenisPindah;

    uint256 public jumlahPermohonan;
    mapping(uint256 => PencatatanTypes.Permohonan) permohonans;
    mapping(address => uint256[]) public daftarPermohonanPemohon;
    mapping(uint8 => uint256[]) public daftarPermohonanKalurahanAsal;
    mapping(uint8 => uint256[]) daftarPermohonanKalurahanTujuan;
    mapping(PencatatanTypes.Status => uint256[])
        public daftarPermohonanPerStatus;

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
        return permohonans[_id].status.statusToString();
    }

    function getJenisPermohonan(
        uint256 _id
    ) external view returns (string memory) {
        return permohonans[_id].jenis.jenisToString();
    }

    function _hapusByStatus(
        uint256 _id,
        PencatatanTypes.Status _status
    ) internal {
        daftarPermohonanPerStatus[_status].hapusByStatus(_id);
    }

    function submitPermohonan(
        PencatatanTypes.JenisPermohonan _jenis,
        string calldata _cidIPFS,
        uint8 _idKalurahanAsal,
        uint8 _idKalurahanTujuan // Hanya wajib jika jenis == Pindah
    ) external onlyWargaTerdaftar {
        require(bytes(_cidIPFS).length > 0, CidKosong());
        require(
            addressKalurahanById[_idKalurahanAsal] != address(0),
            IdKalurahanTujuanTidakDikenal()
        );

        // Validasi tambahan jika jenisnya Pindah
        if (_jenis == PencatatanTypes.JenisPermohonan.Pindah) {
            require(_idKalurahanTujuan != 0, TujuanTidakValid());
            require(
                addressKalurahanById[_idKalurahanTujuan] != address(0),
                IdKalurahanTujuanTidakDikenal()
            );
        }

        uint256 idBaru = jumlahPermohonan++;

        // Buat DataPindah kosong untuk permohonan non-pindah
        PencatatanTypes.DataPindah memory dataPindahKosong = PencatatanTypes
            .DataPindah({
                jenisPindah: PencatatanTypes.JenisPindah.PindahSeluruhKeluarga,
                nikAnggotaPindah: new string[](0),
                nikKepalaKeluargaBaru: "",
                nikKepalaKeluargaTujuan: "",
                alamatBaru: "",
                konfirmasiKKTujuan: false,
                konfirmatorKKTujuan: address(0),
                waktuKonfirmasiKKTujuan: 0
            });

        permohonans[idBaru] = PencatatanTypes.Permohonan({
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
            status: PencatatanTypes.Status.Diajukan,
            idKalurahanAsal: _idKalurahanAsal,
            idKalurahanTujuan: _jenis == PencatatanTypes.JenisPermohonan.Pindah
                ? _idKalurahanTujuan
                : 0,
            dataPindah: dataPindahKosong
        });

        daftarPermohonanPemohon[msg.sender].push(idBaru);
        daftarPermohonanKalurahanAsal[_idKalurahanAsal].push(idBaru);
        daftarPermohonanPerStatus[PencatatanTypes.Status.Diajukan].push(idBaru);

        // Tambahkan ke mapping kalurahan tujuan jika jenisnya Pindah
        if (_jenis == PencatatanTypes.JenisPermohonan.Pindah) {
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
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(p.pemohon == msg.sender, BukanPemilikPermohonan());
        require(
            p.status == PencatatanTypes.Status.Diajukan,
            TidakDapatDibatalkan()
        );

        _hapusByStatus(_id, PencatatanTypes.Status.Diajukan); // Hapus dari mapping status sebelumnya

        p.status = PencatatanTypes.Status.DibatalkanPemohon;
        p.waktuVerifikasiKalurahan = block.timestamp; // Waktu pembatalan
        p.alasanPenolakan = "Permohonan dibatalkan oleh pemohon.";

        emit PermohonanDibatalkan(p.id, msg.sender, block.timestamp);
    }

    function verifikasiKalurahan(
        uint256 _id,
        bool _disetujui,
        string calldata _alasan
    ) external onlyKalurahan onlyKalurahanAsal(_id) {
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(
            p.status == PencatatanTypes.Status.Diajukan,
            PermohonanBukanDiajukan()
        );

        _hapusByStatus(_id, PencatatanTypes.Status.Diajukan);

        if (_disetujui) {
            p.status = PencatatanTypes.Status.DisetujuiKalurahan;
            daftarPermohonanPerStatus[PencatatanTypes.Status.DisetujuiKalurahan]
                .push(_id);
        } else {
            p.status = PencatatanTypes.Status.DitolakKalurahan;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[PencatatanTypes.Status.DitolakKalurahan]
                .push(_id);
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
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(
            p.status == PencatatanTypes.Status.Diajukan,
            PermohonanBukanDiajukan()
        );
        require(
            p.jenis == PencatatanTypes.JenisPermohonan.Pindah,
            BukanPermohonanPindah()
        );

        _hapusByStatus(_id, PencatatanTypes.Status.Diajukan);

        if (_disetujui) {
            require(_idKalurahanTujuan != 0, TujuanTidakValid());
            require(
                addressKalurahanById[_idKalurahanTujuan] != address(0),
                IdKalurahanTujuanTidakDikenal()
            );

            p.idKalurahanTujuan = _idKalurahanTujuan;
            p.status = PencatatanTypes.Status.DisetujuiKalurahanAsal;
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.DisetujuiKalurahanAsal
            ].push(_id);
        } else {
            p.status = PencatatanTypes.Status.DitolakKalurahanAsal;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.DitolakKalurahanAsal
            ].push(_id);
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
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(
            p.jenis == PencatatanTypes.JenisPermohonan.Pindah,
            BukanPermohonanPindah()
        );

        require(
            p.status == PencatatanTypes.Status.DisetujuiKalurahanAsal,
            BelumDiverifikasiKalurahanAsal()
        );

        require(
            idKalurahanByAddress[msg.sender] == p.idKalurahanTujuan,
            HanyaKalurahanTujuan()
        );

        _hapusByStatus(_id, PencatatanTypes.Status.DisetujuiKalurahanAsal);

        if (_disetujui) {
            p.status = PencatatanTypes.Status.DisetujuiKalurahanTujuan;
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.DisetujuiKalurahanTujuan
            ].push(_id);
        } else {
            p.status = PencatatanTypes.Status.DitolakKalurahanTujuan;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.DitolakKalurahanTujuan
            ].push(_id);
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
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        if (p.jenis == PencatatanTypes.JenisPermohonan.Pindah) {
            require(
                p.status == PencatatanTypes.Status.DisetujuiKalurahanTujuan,
                PermohonanPindahBelumDisetujuiKalurahanTujuan()
            );
            _hapusByStatus(
                _id,
                PencatatanTypes.Status.DisetujuiKalurahanTujuan
            );
        } else {
            require(
                p.status == PencatatanTypes.Status.DisetujuiKalurahan,
                PermohonanBelumDisetujuiKalurahan()
            );
            _hapusByStatus(_id, PencatatanTypes.Status.DisetujuiKalurahan);
        }

        if (_disetujui) {
            p.status = PencatatanTypes.Status.DisetujuiDukcapil;
            daftarPermohonanPerStatus[PencatatanTypes.Status.DisetujuiDukcapil]
                .push(_id);
        } else {
            p.status = PencatatanTypes.Status.DitolakDukcapil;
            p.alasanPenolakan = _alasan;
            daftarPermohonanPerStatus[PencatatanTypes.Status.DitolakDukcapil]
                .push(_id);
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
    ) external view returns (PencatatanTypes.Permohonan memory) {
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
        PencatatanTypes.Status _status
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
        PencatatanTypes.Status _status
    ) external view onlyDukcapil returns (uint256[] memory) {
        return daftarPermohonanPerStatus[_status];
    }

    // ===== FUNGSI BARU UNTUK FITUR PINDAH ENHANCED =====

    // Mapping untuk tracking permohonan per kepala keluarga
    mapping(string => uint256[]) public permohonanMenungguKonfirmasiKK;

    // Submit permohonan pindah dengan data lengkap
    function submitPermohonanPindah(
        string calldata _cidIPFS,
        uint8 _idKalurahanAsal,
        uint8 _idKalurahanTujuan,
        PencatatanTypes.JenisPindah _jenisPindah,
        string[] calldata _nikAnggotaPindah,
        string calldata _nikKepalaKeluargaBaru,
        string calldata _nikKepalaKeluargaTujuan,
        string calldata _alamatBaru
    ) external onlyWargaTerdaftar {
        require(bytes(_cidIPFS).length > 0, CidKosong());
        require(
            addressKalurahanById[_idKalurahanAsal] != address(0),
            IdKalurahanTujuanTidakDikenal()
        );
        require(_idKalurahanTujuan != 0, TujuanTidakValid());
        require(
            addressKalurahanById[_idKalurahanTujuan] != address(0),
            IdKalurahanTujuanTidakDikenal()
        );

        uint256 idBaru = jumlahPermohonan++;

        // Buat struct DataPindah
        PencatatanTypes.DataPindah memory dataPindah = PencatatanTypes
            .DataPindah({
                jenisPindah: _jenisPindah,
                nikAnggotaPindah: _nikAnggotaPindah,
                nikKepalaKeluargaBaru: _nikKepalaKeluargaBaru,
                nikKepalaKeluargaTujuan: _nikKepalaKeluargaTujuan,
                alamatBaru: _alamatBaru,
                konfirmasiKKTujuan: false,
                konfirmatorKKTujuan: address(0),
                waktuKonfirmasiKKTujuan: 0
            });

        permohonans[idBaru] = PencatatanTypes.Permohonan({
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
            jenis: PencatatanTypes.JenisPermohonan.Pindah,
            status: _jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK
                ? PencatatanTypes.Status.MenungguKonfirmasiKKTujuan
                : PencatatanTypes.Status.Diajukan,
            idKalurahanAsal: _idKalurahanAsal,
            idKalurahanTujuan: _idKalurahanTujuan,
            dataPindah: dataPindah
        });

        daftarPermohonanPemohon[msg.sender].push(idBaru);
        daftarPermohonanKalurahanAsal[_idKalurahanAsal].push(idBaru);
        daftarPermohonanKalurahanTujuan[_idKalurahanTujuan].push(idBaru);

        // Tambahkan ke mapping status yang sesuai
        if (_jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK) {
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.MenungguKonfirmasiKKTujuan
            ].push(idBaru);
            // Tambahkan ke mapping menunggu konfirmasi KK
            permohonanMenungguKonfirmasiKK[_nikKepalaKeluargaTujuan].push(
                idBaru
            );
        } else {
            daftarPermohonanPerStatus[PencatatanTypes.Status.Diajukan].push(
                idBaru
            );
        }

        emit PermohonanPindahDiajukan(
            idBaru,
            msg.sender,
            _jenisPindah,
            _cidIPFS,
            block.timestamp
        );
    }

    // Konfirmasi kepala keluarga tujuan untuk pindah gabung KK
    function konfirmasiPindahGabungKK(
        uint256 _id,
        bool _disetujui
    ) external onlyWargaTerdaftar {
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(
            p.jenis == PencatatanTypes.JenisPermohonan.Pindah,
            BukanPermohonanPindah()
        );
        require(
            p.dataPindah.jenisPindah ==
                PencatatanTypes.JenisPindah.PindahGabungKK,
            "Bukan permohonan pindah gabung KK"
        );
        require(
            p.status == PencatatanTypes.Status.MenungguKonfirmasiKKTujuan,
            "Status tidak valid untuk konfirmasi"
        );

        // Validasi bahwa msg.sender adalah kepala keluarga tujuan
        string memory nikPemohon = nikByWallet[msg.sender];
        require(
            keccak256(bytes(nikPemohon)) ==
                keccak256(bytes(p.dataPindah.nikKepalaKeluargaTujuan)),
            "Hanya kepala keluarga tujuan yang dapat mengkonfirmasi"
        );

        _hapusByStatus(_id, PencatatanTypes.Status.MenungguKonfirmasiKKTujuan);

        if (_disetujui) {
            p.status = PencatatanTypes.Status.DikonfirmasiKKTujuan;
            daftarPermohonanPerStatus[
                PencatatanTypes.Status.DikonfirmasiKKTujuan
            ].push(_id);
        } else {
            p.status = PencatatanTypes.Status.DitolakKKTujuan;
            p.alasanPenolakan = "Ditolak oleh kepala keluarga tujuan";
            daftarPermohonanPerStatus[PencatatanTypes.Status.DitolakKKTujuan]
                .push(_id);
        }

        p.dataPindah.konfirmasiKKTujuan = _disetujui;
        p.dataPindah.konfirmatorKKTujuan = msg.sender;
        p.dataPindah.waktuKonfirmasiKKTujuan = block.timestamp;

        emit KonfirmasiKKTujuan(
            _id,
            p.dataPindah.nikKepalaKeluargaTujuan,
            _disetujui,
            block.timestamp
        );
    }

    // Get permohonan yang menunggu konfirmasi KK
    function getPermohonanMenungguKonfirmasiKK(
        string calldata _nikKepalaKeluarga
    ) external view returns (uint256[] memory) {
        return permohonanMenungguKonfirmasiKK[_nikKepalaKeluarga];
    }

    // Get data pindah dari permohonan
    function getDataPindah(
        uint256 _id
    ) external view returns (PencatatanTypes.DataPindah memory) {
        return permohonans[_id].dataPindah;
    }

    // Check apakah ada permohonan menunggu konfirmasi
    function adaPermohonanMenungguKonfirmasi(
        string calldata _nikKepalaKeluarga
    ) external view returns (bool) {
        return permohonanMenungguKonfirmasiKK[_nikKepalaKeluarga].length > 0;
    }

    // Get jenis pindah sebagai string
    function getJenisPindah(uint256 _id) external view returns (string memory) {
        return permohonans[_id].dataPindah.jenisPindah.jenisPindahToString();
    }
}
