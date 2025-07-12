const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test Permohonan Pindah Flow", function () {
    let contract, deployer, kalurahan1, kalurahan2, warga1;

    beforeEach(async function () {
        [deployer, kalurahan1, kalurahan2, warga1] = await ethers.getSigners();

        // Deploy contract
        const PencatatanSipil = await ethers.getContractFactory("PencatatanSipil");
        contract = await PencatatanSipil.deploy();
        await contract.waitForDeployment();

        // Setup kalurahan
        await contract.tambahKalurahanById(1, kalurahan1.address); // Kalurahan Asal
        await contract.tambahKalurahanById(2, kalurahan2.address); // Kalurahan Tujuan

        // Register warga
        await contract.connect(warga1).registerWarga("1635142482592647");
    });

    it("Should complete full permohonan pindah flow", async function () {
        console.log("🚀 Testing complete permohonan pindah flow...");
        console.log("📍 Contract Address:", await contract.getAddress());
        console.log("👤 Warga:", warga1.address);
        console.log("🏛️ Kalurahan Asal (ID: 1):", kalurahan1.address);
        console.log("🏛️ Kalurahan Tujuan (ID: 2):", kalurahan2.address);

        // Step 1: Submit permohonan pindah
        console.log("\n📝 Step 1: Submit permohonan pindah...");
        const tx1 = await contract.connect(warga1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "QmeZkk4mNoyYc2BHavnpBMNmCDoWRDaTCYanp9BWehVugC", // CID IPFS
            1, // idKalurahanAsal
            2, // idKalurahanTujuan
            0  // JenisPindah.PindahSeluruhKeluarga
        );
        await tx1.wait();
        console.log("✅ Permohonan pindah submitted successfully");

        // Step 2: Check initial status
        console.log("\n🔍 Step 2: Check initial status...");
        const permohonan = await contract.getPermohonan(0);
        const status = await contract.getStatusPermohonan(0);
        console.log("📋 Initial Status:", status);
        console.log("📋 ID Kalurahan Asal:", permohonan.idKalurahanAsal);
        console.log("📋 ID Kalurahan Tujuan:", permohonan.idKalurahanTujuan);
        expect(status).to.equal("Diajukan");

        // Step 3: Kalurahan Asal verifies (setuju)
        console.log("\n✅ Step 3: Kalurahan Asal verifies (setuju)...");
        const tx2 = await contract.connect(kalurahan1).verifikasiKalurahanAsalPindah(
            0, // permohonan ID
            true, // setuju
            '', // alasan
            2 // idKalurahanTujuan
        );
        await tx2.wait();
        console.log("✅ Kalurahan Asal verification successful");

        // Step 4: Check status after kalurahan asal verification
        console.log("\n🔍 Step 4: Check status after kalurahan asal verification...");
        const statusAfterAsal = await contract.getStatusPermohonan(0);
        console.log("📋 Status after Kalurahan Asal:", statusAfterAsal);
        expect(statusAfterAsal).to.equal("Disetujui Kalurahan Asal");

        // Step 5: Check if permohonan appears in kalurahan tujuan
        console.log("\n🔍 Step 5: Check if permohonan appears in kalurahan tujuan...");
        const permohonanTujuan = await contract.getPermohonanByKalurahanTujuan();
        console.log("📋 Permohonan di Kalurahan Tujuan:", permohonanTujuan);
        expect(permohonanTujuan.length).to.equal(1);
        expect(permohonanTujuan[0]).to.equal(0);

        // Step 6: Kalurahan Tujuan verifies (setuju)
        console.log("\n✅ Step 6: Kalurahan Tujuan verifies (setuju)...");
        const tx3 = await contract.connect(kalurahan2).verifikasiKalurahanTujuanPindah(
            0, // permohonan ID
            true, // setuju
            '' // alasan
        );
        await tx3.wait();
        console.log("✅ Kalurahan Tujuan verification successful");

        // Step 7: Check final status
        console.log("\n🔍 Step 7: Check final status...");
        const finalStatus = await contract.getStatusPermohonan(0);
        console.log("📋 Final Status:", finalStatus);
        expect(finalStatus).to.equal("Disetujui Kalurahan Tujuan");

        console.log("\n🎉 Complete permohonan pindah flow test passed!");
    });

    it("Should show correct permohonan lists for each kalurahan", async function () {
        console.log("🔍 Testing permohonan lists for each kalurahan...");

        // Submit permohonan pindah
        await contract.connect(warga1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "QmeZkk4mNoyYc2BHavnpBMNmCDoWRDaTCYanp9BWehVugC", // CID IPFS
            1, // idKalurahanAsal
            2, // idKalurahanTujuan
            0  // JenisPindah.PindahSeluruhKeluarga
        );

        // Check kalurahan asal list
        const permohonanAsal = await contract.getPermohonanByKalurahanAsal();
        console.log("📋 Permohonan di Kalurahan Asal:", permohonanAsal);
        expect(permohonanAsal.length).to.equal(1);

        // Check kalurahan tujuan list (should be empty initially)
        const permohonanTujuan = await contract.getPermohonanByKalurahanTujuan();
        console.log("📋 Permohonan di Kalurahan Tujuan (before verification):", permohonanTujuan);
        expect(permohonanTujuan.length).to.equal(1); // Should be 1 because it's added during submission

        // Verify by kalurahan asal
        await contract.connect(kalurahan1).verifikasiKalurahanAsalPindah(0, true, '', 2);

        // Check kalurahan tujuan list (should have the permohonan now)
        const permohonanTujuanAfter = await contract.getPermohonanByKalurahanTujuan();
        console.log("📋 Permohonan di Kalurahan Tujuan (after verification):", permohonanTujuanAfter);
        expect(permohonanTujuanAfter.length).to.equal(1);

        console.log("✅ Permohonan lists test passed!");
    });
}); 