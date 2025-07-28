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
error BelumDisetujuiDukcapil();
error StatusTidakValidUntukUploadDokumen();
error DokumenResmiSudahAda();

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

    // Dokumen resmi mapping
    mapping(uint256 => string) public cidDokumenResmi;

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
        uint8 _idKalurahanTujuan, // Hanya wajib jika jenis == Pindah
        PencatatanTypes.JenisPindah _jenisPindah, // Opsional, hanya untuk jenis Pindah
        string calldata _nikKepalaKeluargaTujuan // Opsional, hanya untuk PindahGabungKK
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

        // Tentukan status awal berdasarkan jenis permohonan
        PencatatanTypes.Status statusAwal;
        if (
            _jenis == PencatatanTypes.JenisPermohonan.Pindah &&
            _jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK
        ) {
            statusAwal = PencatatanTypes.Status.MenungguKonfirmasiKKTujuan;
        } else {
            statusAwal = PencatatanTypes.Status.Diajukan;
        }

        permohonans[idBaru] = PencatatanTypes.Permohonan({
            id: idBaru,
            waktuPengajuan: block.timestamp,
            pemohon: msg.sender,
            jenis: _jenis,
            status: statusAwal,
            idKalurahanAsal: _idKalurahanAsal,
            idKalurahanTujuan: _jenis == PencatatanTypes.JenisPermohonan.Pindah
                ? _idKalurahanTujuan
                : 0,
            cidIPFS: _cidIPFS,
            alasanPenolakan: "",
            verifikatorKalurahan: address(0),
            verifikatorKalurahanTujuan: address(0),
            verifikatorDukcapil: address(0),
            waktuVerifikasiKalurahan: 0,
            waktuVerifikasiKalurahanTujuan: 0,
            waktuVerifikasiDukcapil: 0,
            konfirmatorKKTujuan: address(0),
            waktuKonfirmasiKKTujuan: 0,
            konfirmasiKKTujuan: false,
            jenisPindah: _jenis == PencatatanTypes.JenisPermohonan.Pindah
                ? _jenisPindah
                : PencatatanTypes.JenisPindah.PindahSeluruhKeluarga
        });

        daftarPermohonanPemohon[msg.sender].push(idBaru);
        daftarPermohonanKalurahanAsal[_idKalurahanAsal].push(idBaru);

        // Tambahkan ke mapping status yang sesuai
        daftarPermohonanPerStatus[statusAwal].push(idBaru);

        // Tambahkan ke mapping kalurahan tujuan jika jenisnya Pindah
        if (_jenis == PencatatanTypes.JenisPermohonan.Pindah) {
            daftarPermohonanKalurahanTujuan[_idKalurahanTujuan].push(idBaru);
        }

        // Untuk pindah gabung KK, langsung tambahkan ke mapping menunggu konfirmasi KK
        if (
            _jenis == PencatatanTypes.JenisPermohonan.Pindah &&
            _jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK
        ) {
            // Validasi NIK kepala keluarga tujuan tidak boleh kosong untuk pindah gabung KK
            require(
                bytes(_nikKepalaKeluargaTujuan).length > 0,
                "NIK kepala keluarga tujuan wajib diisi untuk pindah gabung KK"
            );

            // Langsung tambahkan ke mapping
            permohonanMenungguKonfirmasiKK[_nikKepalaKeluargaTujuan].push(
                idBaru
            );
        }

        if (_jenis == PencatatanTypes.JenisPermohonan.Pindah) {
            emit PermohonanPindahDiajukan(
                idBaru,
                msg.sender,
                _jenisPindah,
                _cidIPFS,
                block.timestamp
            );
        } else {
            emit PermohonanDiajukan(
                idBaru,
                msg.sender,
                _jenis,
                _cidIPFS,
                block.timestamp
            );
        }
    }

    function batalkanPermohonan(uint256 _id) external onlyWargaTerdaftar {
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(p.pemohon == msg.sender, BukanPemilikPermohonan());
        require(
            p.status == PencatatanTypes.Status.Diajukan ||
                p.status == PencatatanTypes.Status.MenungguKonfirmasiKKTujuan,
            TidakDapatDibatalkan()
        );

        // Hapus dari mapping status sebelumnya
        if (p.status == PencatatanTypes.Status.Diajukan) {
            _hapusByStatus(_id, PencatatanTypes.Status.Diajukan);
        } else if (
            p.status == PencatatanTypes.Status.MenungguKonfirmasiKKTujuan
        ) {
            _hapusByStatus(
                _id,
                PencatatanTypes.Status.MenungguKonfirmasiKKTujuan
            );

            // Note: Untuk pindah gabung KK, mapping akan dibersihkan saat konfirmasi KK
            // atau saat permohonan diproses lebih lanjut
        }

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
            p.jenis == PencatatanTypes.JenisPermohonan.Pindah,
            BukanPermohonanPindah()
        );

        // Untuk pindah gabung KK, status harus DikonfirmasiKKTujuan
        // Untuk pindah lainnya, status harus Diajukan
        if (p.jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK) {
            require(
                p.status == PencatatanTypes.Status.DikonfirmasiKKTujuan,
                "Permohonan pindah gabung KK harus sudah dikonfirmasi kepala keluarga tujuan"
            );
            _hapusByStatus(_id, PencatatanTypes.Status.DikonfirmasiKKTujuan);
        } else {
            require(
                p.status == PencatatanTypes.Status.Diajukan,
                PermohonanBukanDiajukan()
            );
            _hapusByStatus(_id, PencatatanTypes.Status.Diajukan);
        }

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
        string calldata _alasan,
        string calldata _cidDokumen
    ) external onlyDukcapil {
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        if (p.jenis == PencatatanTypes.JenisPermohonan.Pindah) {
            require(
                p.status == PencatatanTypes.Status.DisetujuiKalurahanTujuan ||
                    p.status == PencatatanTypes.Status.DikonfirmasiKKTujuan,
                PermohonanPindahBelumDisetujuiKalurahanTujuan()
            );
            if (p.status == PencatatanTypes.Status.DisetujuiKalurahanTujuan) {
                _hapusByStatus(
                    _id,
                    PencatatanTypes.Status.DisetujuiKalurahanTujuan
                );
            } else if (
                p.status == PencatatanTypes.Status.DikonfirmasiKKTujuan
            ) {
                _hapusByStatus(
                    _id,
                    PencatatanTypes.Status.DikonfirmasiKKTujuan
                );
            }
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

            // Jika ada CID dokumen, simpan langsung
            if (bytes(_cidDokumen).length > 0) {
                cidDokumenResmi[_id] = _cidDokumen;
                emit DokumenResmiDiunggah(_id, _cidDokumen, block.timestamp);
            }
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

    // Fungsi khusus untuk mendapatkan permohonan yang siap diverifikasi kalurahan asal
    // (termasuk yang sudah dikonfirmasi KK untuk pindah gabung KK)
    function getPermohonanSiapVerifikasiKalurahanAsal()
        external
        view
        onlyKalurahan
        returns (uint256[] memory)
    {
        uint8 idKalurahan = idKalurahanByAddress[msg.sender];
        uint256[] storage semua = daftarPermohonanKalurahanAsal[idKalurahan];

        uint256[] memory temp = new uint256[](semua.length);
        uint256 count = 0;

        for (uint256 i = 0; i < semua.length; i++) {
            PencatatanTypes.Permohonan storage p = permohonans[semua[i]];
            // Untuk pindah gabung KK, status harus DikonfirmasiKKTujuan
            // Untuk pindah lainnya, status harus Diajukan
            if (
                (p.jenis == PencatatanTypes.JenisPermohonan.Pindah &&
                    p.jenisPindah ==
                    PencatatanTypes.JenisPindah.PindahGabungKK &&
                    p.status == PencatatanTypes.Status.DikonfirmasiKKTujuan) ||
                (p.status == PencatatanTypes.Status.Diajukan)
            ) {
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

    // Konfirmasi kepala keluarga tujuan untuk pindah gabung KK
    function konfirmasiPindahGabungKK(
        uint256 _id,
        bool _disetujui,
        string calldata _nikKepalaKeluargaTujuan
    ) external onlyWargaTerdaftar {
        PencatatanTypes.Permohonan storage p = permohonans[_id];

        require(
            p.jenis == PencatatanTypes.JenisPermohonan.Pindah,
            BukanPermohonanPindah()
        );
        require(
            p.jenisPindah == PencatatanTypes.JenisPindah.PindahGabungKK,
            "Bukan permohonan pindah gabung KK"
        );
        require(
            p.status == PencatatanTypes.Status.MenungguKonfirmasiKKTujuan,
            "Status tidak valid untuk konfirmasi"
        );

        // Validasi bahwa msg.sender adalah kepala keluarga tujuan
        // Note: NIK kepala keluarga tujuan sekarang disimpan di IPFS
        // Validasi ini perlu dilakukan di frontend atau dengan fungsi helper

        _hapusByStatus(_id, PencatatanTypes.Status.MenungguKonfirmasiKKTujuan);

        // Hapus dari mapping permohonanMenungguKonfirmasiKK menggunakan parameter NIK
        uint256[] storage arr = permohonanMenungguKonfirmasiKK[
            _nikKepalaKeluargaTujuan
        ];
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == _id) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }

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

        p.konfirmasiKKTujuan = _disetujui;
        p.konfirmatorKKTujuan = msg.sender;
        p.waktuKonfirmasiKKTujuan = block.timestamp;

        emit KonfirmasiKKTujuan(
            _id,
            _nikKepalaKeluargaTujuan, // Menggunakan parameter NIK
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

    // Check apakah ada permohonan menunggu konfirmasi
    function adaPermohonanMenungguKonfirmasi(
        string calldata _nikKepalaKeluarga
    ) external view returns (bool) {
        return permohonanMenungguKonfirmasiKK[_nikKepalaKeluarga].length > 0;
    }

    // Get jenis pindah sebagai string
    function getJenisPindah(uint256 _id) external view returns (string memory) {
        return permohonans[_id].jenisPindah.jenisPindahToString();
    }

    // ===== FUNGSI DOKUMEN RESMI =====

    function _unggahDokumenResmi(
        uint256 _id,
        string calldata _cidDokumen,
        PencatatanTypes.Status statusPermohonan
    ) internal {
        // Izinkan upload dokumen untuk status yang sudah siap diverifikasi dukcapil
        require(
            statusPermohonan == PencatatanTypes.Status.DisetujuiDukcapil ||
                statusPermohonan ==
                PencatatanTypes.Status.DisetujuiKalurahanTujuan ||
                statusPermohonan == PencatatanTypes.Status.DisetujuiKalurahan ||
                statusPermohonan == PencatatanTypes.Status.DikonfirmasiKKTujuan,
            StatusTidakValidUntukUploadDokumen()
        );
        require(bytes(_cidDokumen).length > 0, CidKosong());
        require(
            bytes(cidDokumenResmi[_id]).length == 0,
            DokumenResmiSudahAda()
        );
        cidDokumenResmi[_id] = _cidDokumen;
    }

    function _getDokumenResmi(
        uint256 _id,
        address pemohon,
        bool isDukcapil
    ) internal view returns (string memory) {
        require(bytes(cidDokumenResmi[_id]).length > 0, BelumAdaDokumenResmi());
        require(msg.sender == pemohon || isDukcapil, AksesDitolak());
        return cidDokumenResmi[_id];
    }
}
