const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Helper function to measure gas and duration for transactions
async function measureTransaction(txPromise, operationName) {
    const startTime = Date.now();
    const tx = await txPromise;
    const receipt = await tx.wait();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const gasUsed = receipt.gasUsed.toString();

    console.log(`  [GAS & DURATION] ${operationName}:`);
    console.log(`    - Gas Used: ${gasUsed}`);
    console.log(`    - Duration: ${duration}ms`);

    return { tx, receipt, gasUsed, duration };
}

// Helper for expect statements that also measure gas (when transaction succeeds)
async function measureExpectedTransaction(txPromise, operationName) {
    const startTime = Date.now();
    let gasUsed = null;
    let duration = null;

    try {
        const tx = await txPromise;
        const receipt = await tx.wait();
        const endTime = Date.now();
        duration = endTime - startTime;
        gasUsed = receipt.gasUsed.toString();

        console.log(`  [GAS & DURATION] ${operationName}:`);
        console.log(`    - Gas Used: ${gasUsed}`);
        console.log(`    - Duration: ${duration}ms`);
    } catch (error) {
        // For reverted transactions, we can't measure gas easily
        // The duration still matters though
        const endTime = Date.now();
        duration = endTime - startTime;
        console.log(`  [GAS & DURATION] ${operationName} (Reverted):`);
        console.log(`    - Duration: ${duration}ms`);
    }

    return txPromise;
}

describe("PencatatanSipil", function () {
    let pencatatan, owner, kalurahan, dukcapil, warga;

    beforeEach(async () => {
        [owner, kalurahan, dukcapil, warga] = await ethers.getSigners();

        console.log("\n[SETUP] Deploying contract...");
        const startTime = Date.now();
        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.connect(dukcapil).deploy("QmInitialNikMappingCID");
        const deployTx = pencatatan.deploymentTransaction();
        await pencatatan.waitForDeployment();
        const endTime = Date.now();
        if (deployTx) {
            // Get receipt from provider since transaction is already confirmed
            const provider = deployTx.provider;
            const deployReceipt = await provider.getTransactionReceipt(deployTx.hash);
            if (deployReceipt) {
                console.log(`  [GAS & DURATION] Deploy PencatatanSipil:`);
                console.log(`    - Gas Used: ${deployReceipt.gasUsed.toString()}`);
                console.log(`    - Duration: ${endTime - startTime}ms`);
            }
        }

        // Tambahkan role dan mapping id kalurahan
        await measureTransaction(
            pencatatan.tambahKalurahanById(1, kalurahan.address, "QmTestMappingCID"),
            "tambahKalurahanById"
        );
        // Register warga for all tests unless the test is specifically for unregistered
        await measureTransaction(
            pencatatan.connect(warga).registerWarga("NIK123"),
            "registerWarga"
        );
    });

    it("warga dapat mengajukan permohonan", async () => {
        console.log("\n[TEST] warga dapat mengajukan permohonan");
        const { tx } = await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.pemohon).to.equal(warga.address);
        expect(data.cidIPFS).to.equal("cid_json_xxx");
        expect(data.status).to.equal(0); // Diajukan
    });

    it("id permohonan harus bertambah satu per submit", async () => {
        console.log("\n[TEST] id permohonan harus bertambah satu per submit");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_a", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan (first)"
        );
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(1, "cid_b", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan (second)"
        );

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids[0]).to.equal(0);
        expect(ids[1]).to.equal(1); // bukan 2
    });

    it("kalurahan dapat memverifikasi permohonan", async () => {
        console.log("\n[TEST] kalurahan dapat memverifikasi permohonan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan"
        );

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(1); // DisetujuiKalurahan
    });

    it("dukcapil dapat menolak permohonan dengan alasan", async () => {
        console.log("\n[TEST] dukcapil dapat menolak permohonan dengan alasan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan"
        );
        await measureTransaction(
            pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], false, "Data tidak lengkap", "", ""),
            "verifikasiDukcapil (reject)"
        );
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(4); // DitolakDukcapil
        expect(updated.alasanPenolakan).to.equal("Data tidak lengkap");
    });

    it("mengembalikan status permohonan sebagai string", async () => {
        console.log("\n[TEST] mengembalikan status permohonan sebagai string");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const status = await pencatatan.getStatusPermohonan(ids[0]);
        expect(status).to.equal("Diajukan");
    });

    it("mengembalikan jenis permohonan sebagai string", async () => {
        console.log("\n[TEST] mengembalikan jenis permohonan sebagai string");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(3, "cid_test", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan (Cerai)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const jenis = await pencatatan.getJenisPermohonan(ids[0]);
        expect(jenis).to.equal("Cerai");
    });

    it("gagal jika bukan kalurahan yang memverifikasi", async () => {
        console.log("\n[TEST] gagal jika bukan kalurahan yang memverifikasi");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
            ).to.be.revertedWithCustomError(pencatatan, "OnlyKalurahan"),
            "verifikasiKalurahan (should revert)"
        );
    });

    it("warga tidak boleh memverifikasi permohonan", async () => {
        console.log("\n[TEST] warga tidak boleh memverifikasi permohonan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
            ).to.be.revertedWithCustomError(pencatatan, "OnlyKalurahan"),
            "verifikasiKalurahan (should revert)"
        );
    });

    it("kalurahan tidak boleh memverifikasi jika status bukan Diajukan", async () => {
        console.log("\n[TEST] kalurahan tidak boleh memverifikasi jika status bukan Diajukan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        // Ubah status ke DisetujuiKalurahan dulu
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan (first)"
        );

        // Coba verifikasi ulang
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "")
            ).to.be.revertedWithCustomError(pencatatan, "PermohonanBukanDiajukan"),
            "verifikasiKalurahan (should revert - already verified)"
        );
    });

    it("emit event saat permohonan diajukan", async () => {
        console.log("\n[TEST] emit event saat permohonan diajukan");
        const startTime = Date.now();
        await expect(pencatatan.connect(warga).submitPermohonan(0, "cid_event", 1, 0, 0, ethers.ZeroHash))
            .to.emit(pencatatan, "PermohonanDiajukan")
            .withArgs(0, warga.address, 0, "cid_event", anyValue);
        const endTime = Date.now();
        console.log(`  [GAS & DURATION] submitPermohonan (with event check):`);
        console.log(`    - Duration: ${endTime - startTime}ms`);
    });

    it("dukcapil dapat menyetujui permohonan", async () => {
        console.log("\n[TEST] dukcapil dapat menyetujui permohonan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan"
        );
        await measureTransaction(
            pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "", "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"),
            "verifikasiDukcapil (approve)"
        );
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(3); // DisetujuiDukcapil
    });

    it("warga tidak bisa memverifikasi sebagai dukcapil", async () => {
        console.log("\n[TEST] warga tidak bisa memverifikasi sebagai dukcapil");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan"
        );

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).verifikasiDukcapil(ids[0], true, "", "", "")
            ).to.be.revertedWithCustomError(pencatatan, "OnlyDukcapil"),
            "verifikasiDukcapil (should revert)"
        );
    });

    it("emit event saat verifikasi kalurahan", async () => {
        console.log("\n[TEST] emit event saat verifikasi kalurahan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(1, "cid_kalurahan", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        const startTime = Date.now();
        await expect(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], false, "Data tidak lengkap")
        )
            .to.emit(pencatatan, "VerifikasiKalurahan")
            .withArgs(ids[0], kalurahan.address, false, "Data tidak lengkap", anyValue);
        const endTime = Date.now();
        console.log(`  [GAS & DURATION] verifikasiKalurahan (with event check):`);
        console.log(`    - Duration: ${endTime - startTime}ms`);
    });

    it("emit event saat verifikasi dukcapil", async () => {
        console.log("\n[TEST] emit event saat verifikasi dukcapil");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(2, "cid_dukcapil", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, ""),
            "verifikasiKalurahan"
        );

        const startTime = Date.now();
        await expect(
            pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "", "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY")
        )
            .to.emit(pencatatan, "VerifikasiDukcapil")
            .withArgs(ids[0], dukcapil.address, true, "", anyValue);
        const endTime = Date.now();
        console.log(`  [GAS & DURATION] verifikasiDukcapil (with event check):`);
        console.log(`    - Duration: ${endTime - startTime}ms`);
    });

    it("warga dapat membatalkan permohonan yang diajukan", async () => {
        console.log("\n[TEST] warga dapat membatalkan permohonan yang diajukan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_batal", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(warga).batalkanPermohonan(ids[0]),
            "batalkanPermohonan"
        );
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(9); // DibatalkanPemohon
        expect(updated.alasanPenolakan).to.equal("Permohonan dibatalkan oleh pemohon.");
    });

    it("tidak bisa membatalkan permohonan yang bukan milik sendiri", async () => {
        console.log("\n[TEST] tidak bisa membatalkan permohonan yang bukan milik sendiri");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_batal2", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        // Register kalurahan as warga so it passes onlyWargaTerdaftar but fails BukanPemilikPermohonan
        await measureTransaction(
            pencatatan.connect(kalurahan).registerWarga("NIK_KALURAHAN"),
            "registerWarga (kalurahan)"
        );
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahan).batalkanPermohonan(ids[0])
            ).to.be.revertedWithCustomError(pencatatan, "BukanPemilikPermohonan"),
            "batalkanPermohonan (should revert)"
        );
    });

    it("kalurahan dapat mengambil daftar permohonan asalnya", async () => {
        console.log("\n[TEST] kalurahan dapat mengambil daftar permohonan asalnya");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_kalurahanasal", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.connect(kalurahan).getPermohonanByKalurahanAsal();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("kalurahan dapat mengambil permohonan yang belum diverifikasi dengan status tertentu", async () => {
        console.log("\n[TEST] kalurahan dapat mengambil permohonan yang belum diverifikasi dengan status tertentu");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_belumverif", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.connect(kalurahan).getPermohonanBelumVerifikasiKalurahan(0);
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengambil permohonan dengan status tertentu", async () => {
        console.log("\n[TEST] dukcapil dapat mengambil permohonan dengan status tertentu");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_for_dukcapil", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, ""),
            "verifikasiKalurahan"
        );
        const ids = await pencatatan.connect(dukcapil).getPermohonanForDukcapil(1);
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengunggah dan warga dapat mengambil dokumen resmi", async () => {
        console.log("\n[TEST] dukcapil dapat mengunggah dan warga dapat mengambil dokumen resmi");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, ""),
            "verifikasiKalurahan"
        );
        await measureTransaction(
            pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "", "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"),
            "verifikasiDukcapil"
        );
        const dok = await pencatatan.connect(warga).getDokumenResmi(0);
        expect(dok).to.equal("QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    });

    it("dukcapil dapat verifikasi dengan dokumen resmi dalam satu transaksi", async () => {
        console.log("\n[TEST] dukcapil dapat verifikasi dengan dokumen resmi dalam satu transaksi");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres_combined", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, ""),
            "verifikasiKalurahan"
        );

        // Verifikasi dengan dokumen resmi dalam satu transaksi
        const startTime = Date.now();
        await expect(
            pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "", "QmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY")
        )
            .to.emit(pencatatan, "VerifikasiDukcapil")
            .and.to.emit(pencatatan, "DokumenResmiDiunggah");
        const endTime = Date.now();
        console.log(`  [GAS & DURATION] verifikasiDukcapil (with document upload and events):`);
        console.log(`    - Duration: ${endTime - startTime}ms`);

        const updated = await pencatatan.getPermohonan(0);
        expect(updated.status).to.equal(3); // DisetujuiDukcapil

        const dok = await pencatatan.connect(warga).getDokumenResmi(0);
        expect(dok).to.equal("QmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    });

    it("gagal upload dokumen resmi jika sudah ada", async () => {
        console.log("\n[TEST] gagal upload dokumen resmi jika sudah ada");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres_duplicate", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, ""),
            "verifikasiKalurahan"
        );

        // Verifikasi dengan dokumen resmi
        await measureTransaction(
            pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "", "QmBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"),
            "verifikasiDukcapil (with document)"
        );

        // Coba upload dokumen lagi (harus gagal)
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(dukcapil).unggahDokumenResmi(0, "QmCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")
            ).to.be.revertedWithCustomError(pencatatan, "DokumenResmiSudahAda"),
            "unggahDokumenResmi (should revert)"
        );

        // Dokumen pertama tetap ada
        const dok = await pencatatan.connect(warga).getDokumenResmi(0);
        expect(dok).to.equal("QmBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
    });

    it("tidak bisa mengambil dokumen resmi jika belum diunggah", async () => {
        console.log("\n[TEST] tidak bisa mengambil dokumen resmi jika belum diunggah");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres2", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await measureTransaction(
            pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, ""),
            "verifikasiKalurahan"
        );
        await measureTransaction(
            pencatatan.connect(dukcapil).verifikasiDukcapil(0, false, "Tolak tanpa dokumen", "", ""),
            "verifikasiDukcapil (reject)"
        );
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).getDokumenResmi(0)
            ).to.be.revertedWithCustomError(pencatatan, "BelumAdaDokumenResmi"),
            "getDokumenResmi (should revert)"
        );
    });

    it("jumlahPermohonan bertambah setiap submit", async () => {
        console.log("\n[TEST] jumlahPermohonan bertambah setiap submit");
        const awal = await pencatatan.jumlahPermohonan();
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_jumlah1", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan (first)"
        );
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(1, "cid_jumlah2", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan (second)"
        );
        const akhir = await pencatatan.jumlahPermohonan();
        expect(akhir - awal).to.equal(2);
    });
});

describe("Fitur Permohonan Pindah", function () {
    let pencatatan, owner, kalurahanAsal, kalurahanTujuan, dukcapil, warga, lain;

    beforeEach(async () => {
        [owner, kalurahanAsal, kalurahanTujuan, dukcapil, warga, lain] = await ethers.getSigners();
        console.log("\n[SETUP] Deploying contract for Pindah tests...");
        const startTime = Date.now();
        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy("QmInitialNikMappingCID");
        const deployTx = pencatatan.deploymentTransaction();
        await pencatatan.waitForDeployment();
        const endTime = Date.now();
        if (deployTx) {
            // Get receipt from provider since transaction is already confirmed
            const provider = deployTx.provider;
            const deployReceipt = await provider.getTransactionReceipt(deployTx.hash);
            if (deployReceipt) {
                console.log(`  [GAS & DURATION] Deploy PencatatanSipil:`);
                console.log(`    - Gas Used: ${deployReceipt.gasUsed.toString()}`);
                console.log(`    - Duration: ${endTime - startTime}ms`);
            }
        }
        await measureTransaction(
            pencatatan.tambahKalurahanById(1, kalurahanAsal.address, "QmTestMappingCID"),
            "tambahKalurahanById (asal)"
        );
        await measureTransaction(
            pencatatan.tambahKalurahanById(2, kalurahanTujuan.address, "QmTestMappingCID"),
            "tambahKalurahanById (tujuan)"
        );
        // Register warga for all tests unless the test is specifically for unregistered
        await measureTransaction(
            pencatatan.connect(warga).registerWarga("NIK123"),
            "registerWarga"
        );
    });

    // A. Pengujian Pemohon
    it("A1. Submit permohonan pindah berhasil", async () => {
        console.log("\n[TEST] A1. Submit permohonan pindah berhasil");
        const { tx } = await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.jenis).to.equal(4); // Pindah
        expect(data.cidIPFS).to.equal("cid_pindah");
        expect(data.idKalurahanAsal).to.equal(1);
        expect(data.idKalurahanTujuan).to.equal(2);

        // Mapping
        const asal = await pencatatan.connect(kalurahanAsal).getPermohonanByKalurahanAsal();
        expect(asal).to.include(ids[0]);
        const tujuan = await pencatatan.connect(kalurahanTujuan).getPermohonanByKalurahanTujuan();
        expect(tujuan).to.include(ids[0]);
        const perStatus = await pencatatan.connect(owner).getPermohonanForDukcapil(0);
        expect(perStatus).to.include(ids[0]);
    });

    it("A2. Gagal: ID Kalurahan Tujuan tidak valid", async () => {
        console.log("\n[TEST] A2. Gagal: ID Kalurahan Tujuan tidak valid");
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 0, 0, ethers.ZeroHash)
            ).to.be.revertedWithCustomError(pencatatan, "TujuanTidakValid"),
            "submitPermohonan (should revert - invalid tujuan)"
        );
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 99, 0, ethers.ZeroHash)
            ).to.be.revertedWithCustomError(pencatatan, "IdKalurahanTujuanTidakDikenal"),
            "submitPermohonan (should revert - unknown tujuan)"
        );
    });

    it("A3. Gagal: Tidak mengisi CID", async () => {
        console.log("\n[TEST] A3. Gagal: Tidak mengisi CID");
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(warga).submitPermohonan(4, "", 1, 2, 0, ethers.ZeroHash)
            ).to.be.revertedWithCustomError(pencatatan, "CidKosong"),
            "submitPermohonan (should revert - empty CID)"
        );
    });

    // B. Pengujian Kalurahan Asal
    it("B4. Verifikasi Kalurahan Asal berhasil (disetujui)", async () => {
        console.log("\n[TEST] B4. Verifikasi Kalurahan Asal berhasil (disetujui)");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah"
        );
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(5); // DisetujuiKalurahanAsal
        expect(data.verifikatorKalurahan).to.equal(kalurahanAsal.address);
        expect(data.waktuVerifikasiKalurahan).to.be.gt(0);

        const perStatus = await pencatatan.connect(owner).getPermohonanForDukcapil(5);
        expect(perStatus).to.include(ids[0]);
    });

    it("B5. Verifikasi Kalurahan Asal ditolak", async () => {
        console.log("\n[TEST] B5. Verifikasi Kalurahan Asal ditolak");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], false, "Alasan tolak", 2),
            "verifikasiKalurahanAsalPindah (reject)"
        );
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(6); // DitolakKalurahanAsal
        expect(data.alasanPenolakan).to.equal("Alasan tolak");
    });

    it("B6. Gagal: Verifikasi oleh kalurahan bukan asal", async () => {
        console.log("\n[TEST] B6. Gagal: Verifikasi oleh kalurahan bukan asal");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahanTujuan).verifikasiKalurahanAsalPindah(ids[0], true, "", 2)
            ).to.be.reverted,
            "verifikasiKalurahanAsalPindah (should revert - wrong kalurahan)"
        );
    });

    it("B7. Gagal: Verifikasi saat status bukan Diajukan", async () => {
        console.log("\n[TEST] B7. Gagal: Verifikasi saat status bukan Diajukan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah (first)"
        );
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2)
            ).to.be.revertedWithCustomError(pencatatan, "PermohonanBukanDiajukan"),
            "verifikasiKalurahanAsalPindah (should revert - already verified)"
        );
    });

    it("B8. Gagal: Verifikasi tanpa ID Kalurahan Tujuan (disetujui)", async () => {
        console.log("\n[TEST] B8. Gagal: Verifikasi tanpa ID Kalurahan Tujuan (disetujui)");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 0)
            ).to.be.revertedWithCustomError(pencatatan, "TujuanTidakValid"),
            "verifikasiKalurahanAsalPindah (should revert - invalid tujuan)"
        );
    });

    // C. Pengujian Kalurahan Tujuan
    it("C9. Verifikasi Kalurahan Tujuan berhasil (disetujui)", async () => {
        console.log("\n[TEST] C9. Verifikasi Kalurahan Tujuan berhasil (disetujui)");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah"
        );

        await measureTransaction(
            pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, ""),
            "verifikasiKalurahanTujuanPindah"
        );
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(7); // DisetujuiKalurahanTujuan
        expect(data.verifikatorKalurahanTujuan).to.equal(kalurahanTujuan.address);
        expect(data.waktuVerifikasiKalurahanTujuan).to.be.gt(0);
    });

    it("C10. Verifikasi Kalurahan Tujuan ditolak", async () => {
        console.log("\n[TEST] C10. Verifikasi Kalurahan Tujuan ditolak");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah"
        );

        await measureTransaction(
            pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], false, "Tolak tujuan"),
            "verifikasiKalurahanTujuanPindah (reject)"
        );
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(8); // DitolakKalurahanTujuan
        expect(data.alasanPenolakan).to.equal("Tolak tujuan");
    });

    it("C11. Gagal: Verifikasi oleh kalurahan bukan tujuan", async () => {
        console.log("\n[TEST] C11. Gagal: Verifikasi oleh kalurahan bukan tujuan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah"
        );

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahanAsal).verifikasiKalurahanTujuanPindah(ids[0], true, "")
            ).to.be.revertedWithCustomError(pencatatan, "HanyaKalurahanTujuan"),
            "verifikasiKalurahanTujuanPindah (should revert - wrong kalurahan)"
        );
    });

    it("C12. Gagal: Verifikasi saat status bukan DisetujuiKalurahanAsal", async () => {
        console.log("\n[TEST] C12. Gagal: Verifikasi saat status bukan DisetujuiKalurahanAsal");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await measureExpectedTransaction(
            expect(
                pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, "")
            ).to.be.revertedWithCustomError(pencatatan, "BelumDiverifikasiKalurahanAsal"),
            "verifikasiKalurahanTujuanPindah (should revert - not verified by asal)"
        );
    });

    // D. Pengujian Akses Data
    it("D13. Pemohon melihat daftar permohonan miliknya", async () => {
        console.log("\n[TEST] D13. Pemohon melihat daftar permohonan miliknya");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);
    });

    it("D14. Kalurahan Asal melihat permohonan dari wilayahnya", async () => {
        console.log("\n[TEST] D14. Kalurahan Asal melihat permohonan dari wilayahnya");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.connect(kalurahanAsal).getPermohonanByKalurahanAsal();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("D15. Kalurahan Tujuan melihat permohonan masuk", async () => {
        console.log("\n[TEST] D15. Kalurahan Tujuan melihat permohonan masuk");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.connect(kalurahanTujuan).getPermohonanByKalurahanTujuan();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("D16. Gagal: Kalurahan melihat permohonan bukan wilayahnya", async () => {
        console.log("\n[TEST] D16. Gagal: Kalurahan melihat permohonan bukan wilayahnya");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        // Kalurahan lain (bukan asal/bukan tujuan)
        await measureTransaction(
            pencatatan.tambahKalurahanById(3, lain.address, "QmTestMappingCID"),
            "tambahKalurahanById (lain)"
        );

        const asal = await pencatatan.connect(lain).getPermohonanByKalurahanAsal();
        expect(asal.length).to.equal(0);
        const tujuan = await pencatatan.connect(lain).getPermohonanByKalurahanTujuan();
        expect(tujuan.length).to.equal(0);
    });

    it("dukcapil dapat memverifikasi permohonan pindah setelah disetujui kalurahan tujuan", async () => {
        console.log("\n[TEST] dukcapil dapat memverifikasi permohonan pindah setelah disetujui kalurahan tujuan");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2, 0, ethers.ZeroHash),
            "submitPermohonan (pindah)"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await measureTransaction(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2),
            "verifikasiKalurahanAsalPindah"
        );
        await measureTransaction(
            pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, ""),
            "verifikasiKalurahanTujuanPindah"
        );
        await measureTransaction(
            pencatatan.connect(owner).verifikasiDukcapil(ids[0], true, "", "QmDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD", "QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"),
            "verifikasiDukcapil (pindah)"
        );
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(3); // DisetujuiDukcapil
    });
});

describe("KontrolAkses - registerWarga", function () {
    let kontrol, owner, warga1, warga2;

    beforeEach(async () => {
        [owner, warga1, warga2] = await ethers.getSigners();
        console.log("\n[SETUP] Deploying KontrolAkses contract...");
        const startTime = Date.now();
        const KontrolAkses = await ethers.getContractFactory("KontrolAkses");
        kontrol = await KontrolAkses.deploy("QmInitialNikMappingCID");
        const deployTx = kontrol.deploymentTransaction();
        await kontrol.waitForDeployment();
        const endTime = Date.now();
        if (deployTx) {
            // Get receipt from provider since transaction is already confirmed
            const provider = deployTx.provider;
            const deployReceipt = await provider.getTransactionReceipt(deployTx.hash);
            if (deployReceipt) {
                console.log(`  [GAS & DURATION] Deploy KontrolAkses:`);
                console.log(`    - Gas Used: ${deployReceipt.gasUsed.toString()}`);
                console.log(`    - Duration: ${endTime - startTime}ms`);
            }
        }
    });

    it("berhasil register warga baru", async () => {
        console.log("\n[TEST] berhasil register warga baru");
        const startTime = Date.now();
        await expect(kontrol.connect(warga1).registerWarga("1234567890"))
            .to.emit(kontrol, "WargaTerdaftar")
            .withArgs(warga1.address, "1234567890");
        const endTime = Date.now();
        console.log(`  [GAS & DURATION] registerWarga (with event check):`);
        console.log(`    - Duration: ${endTime - startTime}ms`);

        expect(await kontrol.nikByWallet(warga1.address)).to.equal("1234567890");
        expect(await kontrol.walletByNik("1234567890")).to.equal(warga1.address);
    });

    it("gagal jika NIK sudah diklaim wallet lain", async () => {
        console.log("\n[TEST] gagal jika NIK sudah diklaim wallet lain");
        await measureTransaction(
            kontrol.connect(warga1).registerWarga("1234567890"),
            "registerWarga (first)"
        );
        await measureExpectedTransaction(
            expect(
                kontrol.connect(warga2).registerWarga("1234567890")
            ).to.be.revertedWithCustomError(kontrol, "NikSudahDiklaim"),
            "registerWarga (should revert - NIK already claimed)"
        );
    });

    it("gagal jika wallet sudah digunakan", async () => {
        console.log("\n[TEST] gagal jika wallet sudah digunakan");
        await measureTransaction(
            kontrol.connect(warga1).registerWarga("1234567890"),
            "registerWarga (first)"
        );
        await measureExpectedTransaction(
            expect(
                kontrol.connect(warga1).registerWarga("0987654321")
            ).to.be.revertedWithCustomError(kontrol, "WalletSudahDigunakan"),
            "registerWarga (should revert - wallet already used)"
        );
    });
});

describe("PencatatanSipil - onlyWargaTerdaftar", function () {
    let pencatatan, kontrol, owner, kalurahan, warga;

    beforeEach(async () => {
        [owner, kalurahan, , warga] = await ethers.getSigners();
        console.log("\n[SETUP] Deploying contract for onlyWargaTerdaftar tests...");
        const startTime = Date.now();
        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy("QmInitialNikMappingCID");
        const deployTx = pencatatan.deploymentTransaction();
        await pencatatan.waitForDeployment();
        const endTime = Date.now();
        if (deployTx) {
            // Get receipt from provider since transaction is already confirmed
            const provider = deployTx.provider;
            const deployReceipt = await provider.getTransactionReceipt(deployTx.hash);
            if (deployReceipt) {
                console.log(`  [GAS & DURATION] Deploy PencatatanSipil:`);
                console.log(`    - Gas Used: ${deployReceipt.gasUsed.toString()}`);
                console.log(`    - Duration: ${endTime - startTime}ms`);
            }
        }

        // Setup role
        await measureTransaction(
            pencatatan.tambahKalurahanById(1, kalurahan.address, "QmTestMappingCID"),
            "tambahKalurahanById"
        );
        // Register warga for all tests unless the test is specifically for unregistered
        await measureTransaction(
            pencatatan.connect(warga).registerWarga("NIK123"),
            "registerWarga"
        );
    });

    it("gagal submitPermohonan jika belum registerWarga", async () => {
        console.log("\n[TEST] gagal submitPermohonan jika belum registerWarga");
        // Use a new signer that is not registered
        const [, , , , wargaBaru] = await ethers.getSigners();
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(wargaBaru).submitPermohonan(0, "cid_x", 1, 0, 0, ethers.ZeroHash)
            ).to.be.revertedWithCustomError(pencatatan, "OnlyWargaTerdaftar"),
            "submitPermohonan (should revert - not registered)"
        );
    });

    it("berhasil submitPermohonan setelah registerWarga", async () => {
        console.log("\n[TEST] berhasil submitPermohonan setelah registerWarga");
        const { tx } = await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_x", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        await tx.wait();
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);
    });

    it("gagal batalkanPermohonan jika belum registerWarga", async () => {
        console.log("\n[TEST] gagal batalkanPermohonan jika belum registerWarga");
        await measureTransaction(
            pencatatan.connect(warga).submitPermohonan(0, "cid_x", 1, 0, 0, ethers.ZeroHash),
            "submitPermohonan"
        );
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        // Buat akun baru yang belum register
        const [, , , , wargaBaru] = await ethers.getSigners();
        // Jangan register wargaBaru
        await measureExpectedTransaction(
            expect(
                pencatatan.connect(wargaBaru).batalkanPermohonan(ids[0])
            ).to.be.revertedWithCustomError(pencatatan, "OnlyWargaTerdaftar"),
            "batalkanPermohonan (should revert - not registered)"
        );
    });
});

