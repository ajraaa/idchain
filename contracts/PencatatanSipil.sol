// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PencatatanSipil {
    enum JenisPermohonan {
        Kelahiran,
        Kematian,
        Kawin,
        Cerai,
        Pindah,
        Datang
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
        uint id;
        address pemohon;
        JenisPermohonan jenis;
        string cidIPFS;
        Status status;
        uint waktuPengajuan;
        address verifikator;
        uint waktuVerifikasi;
    }

    

    
    
}