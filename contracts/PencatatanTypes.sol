// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract PencatatanTypes {
    enum JenisPermohonan {
        Kelahiran,
        Kematian,
        Kawin,
        Cerai,
        Pindah
    }

    enum JenisPindah {
        PindahSeluruhKeluarga, // Alur A: Pindah satu keluarga
        PindahMandiri, // Alur B: Pindah mandiri/membuat KK baru
        PindahGabungKK // Alur C: Pindah gabung KK
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
        DibatalkanPemohon,
        MenungguKonfirmasiKKTujuan, // Untuk alur C
        DikonfirmasiKKTujuan, // Untuk alur C
        DitolakKKTujuan // Untuk alur C
    }

    struct Permohonan {
        uint256 id;
        uint256 waktuPengajuan;
        address pemohon;
        JenisPermohonan jenis;
        Status status;
        uint8 idKalurahanAsal;
        uint8 idKalurahanTujuan;
        string cidIPFS; // JSON berisi data permohonan
        string alasanPenolakan;
        address verifikatorKalurahan;
        address verifikatorKalurahanTujuan;
        address verifikatorDukcapil;
        uint256 waktuVerifikasiKalurahan;
        uint256 waktuVerifikasiKalurahanTujuan;
        uint256 waktuVerifikasiDukcapil;
        address konfirmatorKKTujuan; // jika alur C
        uint256 waktuKonfirmasiKKTujuan;
        bool konfirmasiKKTujuan;
        JenisPindah jenisPindah;
    }

    event PermohonanDiajukan(
        uint256 indexed id,
        address indexed pemohon,
        JenisPermohonan jenis,
        string cidIPFS,
        uint256 waktu
    );

    event PermohonanPindahDiajukan(
        uint256 indexed id,
        address indexed pemohon,
        JenisPindah jenisPindah,
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

    event KonfirmasiKKTujuan(
        uint256 indexed idPermohonan,
        bytes32 indexed nikKepalaKeluargaTujuanHash,
        bool disetujui,
        uint256 waktu
    );

    event DokumenResmiDiunggah(
        uint256 indexed idPermohonan,
        string cidDokumen,
        uint256 waktu
    );
}
