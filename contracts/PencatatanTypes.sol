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
        uint256 id;
        uint256 waktuPengajuan;
        uint256 waktuVerifikasiKalurahan;
        uint256 waktuVerifikasiKalurahanTujuan;
        uint256 waktuVerifikasiDukcapil;
        address pemohon;
        address verifikatorKalurahan;
        address verifikatorKalurahanTujuan;
        address verifikatorDukcapil;
        string cidIPFS;
        string alasanPenolakan;
        JenisPermohonan jenis;
        Status status;
        uint8 idKalurahanAsal;
        uint8 idKalurahanTujuan;
    }

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
}
