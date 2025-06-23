// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PermohonanKependudukan {

    enum StatusPermohonan {
        Diajukan,
        DitolakKalurahan,
        DisetujuiKalurahan,
        DitolakDukcapil,
        DisetujuiDukcapil,
        DokumenDiterbitkan
    }

    struct PermohonanKelahiran {
        uint NIKayah;
        uint NIKibu;
        uint NIKsaksi1;
        uint NIKsaksi2;
        string namaAnak;
        string tempatLahir;
        uint tanggalLahir;
        string ipfsHas;
        StatusPermohonan status;
        uint timestamp;
    }

    
    
}