// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PencatatanTypes.sol";

library PencatatanViewUtils {
    function statusToString(
        PencatatanTypes.Status s
    ) internal pure returns (string memory) {
        if (s == PencatatanTypes.Status.Diajukan) return "Diajukan";
        if (s == PencatatanTypes.Status.DisetujuiKalurahan)
            return "Disetujui Kalurahan";
        if (s == PencatatanTypes.Status.DitolakKalurahan)
            return "Ditolak Kalurahan";
        if (s == PencatatanTypes.Status.DisetujuiDukcapil)
            return "Disetujui Dukcapil";
        if (s == PencatatanTypes.Status.DitolakDukcapil)
            return "Ditolak Dukcapil";
        if (s == PencatatanTypes.Status.DisetujuiKalurahanAsal)
            return "Disetujui Kalurahan Asal";
        if (s == PencatatanTypes.Status.DitolakKalurahanAsal)
            return "Ditolak Kalurahan Asal";
        if (s == PencatatanTypes.Status.DisetujuiKalurahanTujuan)
            return "Disetujui Kalurahan Tujuan";
        if (s == PencatatanTypes.Status.DitolakKalurahanTujuan)
            return "Ditolak Kalurahan Tujuan";
        if (s == PencatatanTypes.Status.DibatalkanPemohon)
            return "Dibatalkan oleh Pemohon";
        return "Status Tidak Dikenal";
    }

    function jenisToString(
        PencatatanTypes.JenisPermohonan j
    ) internal pure returns (string memory) {
        if (j == PencatatanTypes.JenisPermohonan.Kelahiran) return "Kelahiran";
        if (j == PencatatanTypes.JenisPermohonan.Kematian) return "Kematian";
        if (j == PencatatanTypes.JenisPermohonan.Kawin) return "Kawin";
        if (j == PencatatanTypes.JenisPermohonan.Cerai) return "Cerai";
        if (j == PencatatanTypes.JenisPermohonan.Pindah) return "Pindah";
        return "Jenis Tidak Dikenal";
    }
}
