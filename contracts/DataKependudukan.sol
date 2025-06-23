// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DataKependudukan {

    enum StatusKawin {
        BelumKawin,
        KawinTercatat,
        KawinBelumTercatat,
        CeraiHidup,
        CeraiMati
    }

    enum JenisKelamin {
        LakiLaki,
        Perempuan
    }

    struct Penduduk {
        uint nik;
        string namaLengkap;
        uint tanggalLahir;
        JenisKelamin jenisKelamin;
        string alamatLengkap;
        StatusKawin statusKawin;
    }
}