const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("PencatatanSipil", function () {
    let pencatatan, owner, kalurahan, dukcapil, warga;

    beforeEach(async () => {
        [owner, kalurahan, dukcapil, warga] = await ethers.getSigners();

        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy();
        await pencatatan.waitForDeployment();

        // Tambahkan role dan mapping id kalurahan
        await pencatatan.tambahKalurahan(kalurahan.address);
        await pencatatan.tambahDukcapil(dukcapil.address);
        await pencatatan.tambahKalurahanById(1, kalurahan.address);
    });

    it("warga dapat mengajukan permohonan", async () => {
        const tx = await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1);
        await tx.wait();

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.pemohon).to.equal(warga.address);
        expect(data.cidIPFS).to.equal("cid_json_xxx");
        expect(data.status).to.equal(0); // Diajukan
    });

    it("id permohonan harus bertambah satu per submit", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_a", 1);
        await pencatatan.connect(warga).submitPermohonan(1, "cid_b", 1);

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids[0]).to.equal(0);
        expect(ids[1]).to.equal(1); // bukan 2
    });

    it("kalurahan dapat memverifikasi permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        const tx = await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");
        await tx.wait();

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(2); // DisetujuiKalurahan
    });

    it("dukcapil dapat menolak permohonan dengan alasan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        const tx = await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], false, "Data tidak lengkap");
        await tx.wait();

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(6); // DitolakDukcapil
        expect(updated.alasanPenolakan).to.equal("Data tidak lengkap");
    });

    it("mengembalikan status permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const status = await pencatatan.getStatusPermohonan(ids[0]);
        expect(status).to.equal("Diajukan");
    });

    it("mengembalikan jenis permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(3, "cid_test", 1); // 3 = Cerai
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const jenis = await pencatatan.getJenisPermohonan(ids[0]);
        expect(jenis).to.equal("Cerai");
    });

    it("gagal jika bukan kalurahan yang memverifikasi", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas kalurahan yang diizinkan melakukan ini.");
    });

    it("warga tidak boleh memverifikasi permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas kalurahan yang diizinkan melakukan ini.");
    });

    it("kalurahan tidak boleh memverifikasi jika status bukan Diajukan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        // Ubah status ke DisetujuiKalurahan dulu
        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        // Coba verifikasi ulang
        await expect(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Permohonan bukan dalam status Diajukan.");
    });

    it("emit event saat permohonan diajukan", async () => {
        await expect(pencatatan.connect(warga).submitPermohonan(0, "cid_event", 1))
            .to.emit(pencatatan, "PermohonanDiajukan")
            .withArgs(0, warga.address, 0, "cid_event", anyValue);
    });

    it("dukcapil dapat menyetujui permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "");
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(5); // DisetujuiDukcapil
    });

    it("warga tidak bisa memverifikasi sebagai dukcapil", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        await expect(
            pencatatan.connect(warga).verifikasiDukcapil(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas dukcapil yang diizinkan melakukan ini.");
    });

    it("emit event saat verifikasi kalurahan", async () => {
        await pencatatan.connect(warga).submitPermohonan(1, "cid_kalurahan", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], false, "Data tidak lengkap")
        )
            .to.emit(pencatatan, "VerifikasiKalurahan")
            .withArgs(ids[0], kalurahan.address, false, "Data tidak lengkap", anyValue);
    });

    it("emit event saat verifikasi dukcapil", async () => {
        await pencatatan.connect(warga).submitPermohonan(2, "cid_dukcapil", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        await expect(
            pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "")
        )
            .to.emit(pencatatan, "VerifikasiDukcapil")
            .withArgs(ids[0], dukcapil.address, true, "", anyValue);
    });

    it("warga dapat membatalkan permohonan yang diajukan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_batal", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(warga).batalkanPermohonan(ids[0]);
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(7); // DibatalkanPemohon
        expect(updated.alasanPenolakan).to.equal("Permohonan dibatalkan oleh pemohon.");
    });

    it("tidak bisa membatalkan permohonan yang bukan milik sendiri", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_batal2", 1);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await expect(
            pencatatan.connect(kalurahan).batalkanPermohonan(ids[0])
        ).to.be.revertedWith("Bukan pemilik permohonan.");
    });

    it("kalurahan dapat mengambil daftar permohonan asalnya", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_kalurahanasal", 1);
        const ids = await pencatatan.connect(kalurahan).getPermohonanByKalurahanAsal();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("kalurahan dapat mengambil permohonan yang belum diverifikasi dengan status tertentu", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_belumverif", 1);
        const ids = await pencatatan.connect(kalurahan).getPermohonanBelumVerifikasiKalurahan(0); // 0 = Diajukan
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengambil permohonan dengan status tertentu", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dukcapil", 1);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        const ids = await pencatatan.connect(dukcapil).getPermohonanForDukcapil(2); // 2 = DisetujuiKalurahan
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengunggah dan warga dapat mengambil dokumen resmi", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres", 1);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "");
        await pencatatan.connect(dukcapil).unggahDokumenResmi(0, "cid_dokres");
        const dok = await pencatatan.connect(warga).getDokumenResmi(0);
        expect(dok).to.equal("cid_dokres");
    });

    it("tidak bisa mengambil dokumen resmi jika belum diunggah", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres2", 1);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "");
        await expect(
            pencatatan.connect(warga).getDokumenResmi(0)
        ).to.be.revertedWith("Belum ada dokumen resmi.");
    });

    it("jumlahPermohonan bertambah setiap submit", async () => {
        const awal = await pencatatan.jumlahPermohonan();
        await pencatatan.connect(warga).submitPermohonan(0, "cid_jumlah1", 1);
        await pencatatan.connect(warga).submitPermohonan(1, "cid_jumlah2", 1);
        const akhir = await pencatatan.jumlahPermohonan();
        expect(akhir - awal).to.equal(2);
    });
});
