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
        const nikAnggota = [];
        const tx = await kontrak.connect(w1).submitPermohonanPindah(
            "cidA",
            1,
            2,
            0, // JenisPindah.PindahSeluruhKeluarga
            nikAnggota,
            "",
            "",
            "AlamatBaruA"
        );
        const receipt = await tx.wait();
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.dataPindah.alamatBaru).to.equal("AlamatBaruA");
        expect(permohonan.dataPindah.jenisPindah).to.equal(0);
        expect(permohonan.status).to.equal(0); // Diajukan
    });

    it("Alur B: Submit pindah mandiri (anggota & kepala keluarga baru)", async function () {
        const nikAnggota = ["NIK2", "NIK3"];
        const tx = await kontrak.connect(w1).submitPermohonanPindah(
            "cidB",
            1,
            2,
            1, // JenisPindah.PindahMandiri
            nikAnggota,
            "NIK2",
            "",
            "AlamatBaruB"
        );
        const receipt = await tx.wait();
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.dataPindah.nikAnggotaPindah[0]).to.equal("NIK2");
        expect(permohonan.dataPindah.nikKepalaKeluargaBaru).to.equal("NIK2");
        expect(permohonan.dataPindah.jenisPindah).to.equal(1);
        expect(permohonan.status).to.equal(0); // Diajukan
    });

    it("Alur C: Submit pindah gabung KK, hanya KK tujuan bisa konfirmasi", async function () {
        const nikAnggota = ["NIK3"];
        // Submit permohonan pindah gabung KK
        await kontrak.connect(w1).submitPermohonanPindah(
            "cidC",
            1,
            2,
            2, // JenisPindah.PindahGabungKK
            nikAnggota,
            "",
            "NIK2",
            ""
        );
        let permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.dataPindah.nikKepalaKeluargaTujuan).to.equal("NIK2");
        expect(permohonan.status).to.equal(10); // MenungguKonfirmasiKKTujuan

        // Gagal konfirmasi jika bukan KK tujuan
        await expect(
            kontrak.connect(w1).konfirmasiPindahGabungKK(0, true)
        ).to.be.revertedWith("Hanya kepala keluarga tujuan yang dapat mengkonfirmasi");

        // Berhasil konfirmasi oleh KK tujuan
        await kontrak.connect(w2).konfirmasiPindahGabungKK(0, true);
        permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.status).to.equal(11); // DikonfirmasiKKTujuan
        expect(permohonan.dataPindah.konfirmasiKKTujuan).to.equal(true);
    });

    it("Alur C: Konfirmasi ditolak oleh KK tujuan", async function () {
        const nikAnggota = ["NIK3"];
        await kontrak.connect(w1).submitPermohonanPindah(
            "cidC2",
            1,
            2,
            2, // JenisPindah.PindahGabungKK
            nikAnggota,
            "",
            "NIK2",
            ""
        );
        // Ditolak oleh KK tujuan
        await kontrak.connect(w2).konfirmasiPindahGabungKK(0, false);
        const permohonan = await kontrak.getPermohonan(0);
        expect(permohonan.status).to.equal(12); // DitolakKKTujuan
        expect(permohonan.dataPindah.konfirmasiKKTujuan).to.equal(false);
    });

    it("getDataPindah dan getJenisPindah bekerja dengan benar", async function () {
        const nikAnggota = ["NIK2"];
        await kontrak.connect(w1).submitPermohonanPindah(
            "cidD",
            1,
            2,
            1, // JenisPindah.PindahMandiri
            nikAnggota,
            "NIK2",
            "",
            "AlamatBaruD"
        );
        const dataPindah = await kontrak.getDataPindah(0);
        expect(dataPindah.nikAnggotaPindah[0]).to.equal("NIK2");
        const jenisPindahStr = await kontrak.getJenisPindah(0);
        expect(jenisPindahStr).to.include("Mandiri");
    });
}); 