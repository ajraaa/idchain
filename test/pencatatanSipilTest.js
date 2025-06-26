const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PencatatanSipil", function () {
    let pencatatan, owner, kalurahan, dukcapil, warga;

    beforeEach(async () => {
        [owner, kalurahan, dukcapil, warga] = await ethers.getSigners();

        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy();
        await pencatatan.waitForDeployment();

        // Tambahkan role
        await pencatatan.tambahKalurahan(kalurahan.address);
        await pencatatan.tambahDukcapil(dukcapil.address);
    });

    it("warga dapat mengajukan permohonan", async () => {
        const tx = await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx");
        await tx.wait();

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.pemohon).to.equal(warga.address);
        expect(data.cidIPFS).to.equal("cid_json_xxx");
        expect(data.status).to.equal(0); // Diajukan
    });

    it("kalurahan dapat memverifikasi permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx");
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        const tx = await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");
        await tx.wait();

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(2); // DisetujuiKalurahan
    });

    it("dukcapil dapat menolak permohonan dengan alasan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx");
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        const tx = await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], false, "Data tidak lengkap");
        await tx.wait();

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(6); // DitolakDukcapil
        expect(updated.alasanPenolakanDukcapil).to.equal("Data tidak lengkap");
    });

    it("mengembalikan status permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_test");
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const status = await pencatatan.getStatusPermohonan(ids[0]);
        expect(status).to.equal("Diajukan");
    });

    it("mengembalikan jenis permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(3, "cid_test"); // 3 = Cerai
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const jenis = await pencatatan.getJenisPermohonan(ids[0]);
        expect(jenis).to.equal("Cerai");
    });

    it("mengembalikan array id permohonan yang diajukan oleh pemohon", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_a");
        await pencatatan.connect(warga).submitPermohonan(1, "cid_b");

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(2);
        expect(ids[0]).to.equal(0);
        expect(ids[1]).to.equal(2); // karena jumlahPermohonan diincrement dua kali
    });

    it("gagal jika bukan kalurahan yang memverifikasi", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx");
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas kalurahan yang diizinkan melakukan ini.");
    });

});
