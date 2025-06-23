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

    uint256 public jumlahPermohonan;
    mapping (uint256 => Permohonan) permohonans;

    event PermohonanDiajukan(
        uint256 indexed id,
        address indexed pemohon,
        JenisPermohonan jenis,
        string cidIPFS,
        uint256 waktu
    );

    function SubmitPermohonan(JenisPermohonan _jenis, string calldata _cidIPFS)  external {
        require(bytes(_cidIPFS).length > 0, "CID IPFS tidak boleh kosong.");

        uint256 idBaru = jumlahPermohonan++;
        jumlahPermohonan++;

        permohonans[idBaru] = Permohonan ({
            id: idBaru,
            pemohon: msg.sender,
            jenis: _jenis,
            cidIPFS: _cidIPFS,
            status: Status.Diajukan,
            waktuPengajuan: block.timestamp,
            alasanPenolakanKalurahan: "",
            alasanPenolakanDukcapil: "",
            verifikatorKalurahan: address(0),
            waktuVerifikasiKalurahan: 0,
            verifikatorDukcapil: address(0),
            waktuVerifikasiDukcapil: 0
        });

        emit PermohonanDiajukan(idBaru, msg.sender, _jenis, _cidIPFS, block.timestamp);
    }
}