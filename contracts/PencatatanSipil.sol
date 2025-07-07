// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PermohonanManager.sol";
import "./DokumenResmiManager.sol";

contract PencatatanSipil is PermohonanManager, DokumenResmiManager {
    function unggahDokumenResmi(
        uint256 _id,
        string calldata _cidDokumen
    ) external onlyDukcapil {
        PencatatanTypes.Permohonan storage p = permohonans[_id];
        _unggahDokumenResmi(_id, _cidDokumen, p.status);
        emit DokumenResmiDiunggah(_id, _cidDokumen, block.timestamp);
    }

    function getDokumenResmi(
        uint256 _id
    ) external view returns (string memory) {
        PencatatanTypes.Permohonan storage p = permohonans[_id];
        return _getDokumenResmi(_id, p.pemohon, msg.sender == dukcapil);
    }
}
