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
        uint256 id; // ID permohonan
        address pemohon; // alamat pemohon
        JenisPermohonan jenis; // jenis permohonan
        string cidIPFS; // cid ipfs dari dokumen terenkripsi
        Status status; // status permohonan terkini
        uint256 waktuPengajuan; // waktu pengajuan permohonan
        string alasanPenolakanKalurahan; // alasan penolakan oleh kalurahan
        string alasanPenolakanDukcapil; // alasan penolakan oleh dukcapil
        address verifikatorKalurahan; // alamat verifikator kalurahan
        uint256 waktuVerifikasiKalurahan; // waktu permohonan diverifikasi di kalurahan
        address verifikatorDukcapil; // alamat verifikator dukcapil
        uint256 waktuVerifikasiDukcapil; // waktu permohonan diverifikasi di dukcapil
    }
}