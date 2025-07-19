// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PermohonanManager.sol";
import "./PencatatanTypes.sol";

error BelumDisetujuiDukcapil();
error StatusTidakValidUntukUploadDokumen();

abstract contract DokumenResmiManager {
    mapping(uint256 => string) public cidDokumenResmi;

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
