const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Permohonan Pindah Enhanced", function () {
    let kontrak, owner, dukcapil, kalurahan1, kalurahan2, warga1, warga2, warga3;

    beforeEach(async function () {
        [owner, dukcapil, kal1, kal2, w1, w2, w3] = await ethers.getSigners();
        // Deploy contract
        const PencatatanSipil = await ethers.getContractFactory("PencatatanSipil");
        kontrak = await PencatatanSipil.deploy();
        await kontrak.waitForDeployment();

        // Setup Dukcapil & Kalurahan
        await kontrak.tambahKalurahanById(1, kal1.address);
        await kontrak.tambahKalurahanById(2, kal2.address);
        // Register warga
        await kontrak.connect(w1).registerWarga("NIK1");
        await kontrak.connect(w2).registerWarga("NIK2");
        await kontrak.connect(w3).registerWarga("NIK3");
    });

    it("Alur A: Submit pindah seluruh keluarga", async function () {
        const tx = await kontrak.connect(w1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "cidA",
            1,
            2,
            0 // JenisPindah.PindahSeluruhKeluarga
        );
        const receipt = await tx.wait();
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.jenisPindah).to.equal(0);
        expect(permohonan.status).to.equal(0); // Diajukan
    });

    it("Alur B: Submit pindah mandiri (anggota & kepala keluarga baru)", async function () {
        const tx = await kontrak.connect(w1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "cidB",
            1,
            2,
            1 // JenisPindah.PindahMandiri
        );
        const receipt = await tx.wait();
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.jenisPindah).to.equal(1);
        expect(permohonan.status).to.equal(0); // Diajukan
    });

    it("Alur C: Submit pindah gabung KK, hanya KK tujuan bisa konfirmasi", async function () {
        // Submit permohonan pindah gabung KK
        await kontrak.connect(w1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "cidC",
            1,
            2,
            2 // JenisPindah.PindahGabungKK
        );
        let permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.status).to.equal(10); // MenungguKonfirmasiKKTujuan

        // Berhasil konfirmasi oleh KK tujuan
        await kontrak.connect(w2).konfirmasiPindahGabungKK(0, true);
        permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.status).to.equal(11); // DikonfirmasiKKTujuan
        expect(permohonan.konfirmasiKKTujuan).to.equal(true);
    });

    it("Alur C: Konfirmasi ditolak oleh KK tujuan", async function () {
        await kontrak.connect(w1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "cidC2",
            1,
            2,
            2 // JenisPindah.PindahGabungKK
        );
        // Ditolak oleh KK tujuan
        await kontrak.connect(w2).konfirmasiPindahGabungKK(0, false);
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.status).to.equal(12); // DitolakKKTujuan
        expect(permohonan.konfirmasiKKTujuan).to.equal(false);
    });

    it("getJenisPindah bekerja dengan benar", async function () {
        await kontrak.connect(w1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "cidD",
            1,
            2,
            1 // JenisPindah.PindahMandiri
        );
        const jenisPindahStr = await kontrak.getJenisPindah(0);
        expect(jenisPindahStr).to.include("Mandiri");
    });
}); 