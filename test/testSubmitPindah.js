const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test Submit Permohonan Pindah", function () {
    let contract, deployer, kalurahan1, kalurahan2, warga1, warga2;

    beforeEach(async function () {
        [deployer, kalurahan1, kalurahan2, warga1, warga2] = await ethers.getSigners();

        // Deploy contract
        const PencatatanSipil = await ethers.getContractFactory("PencatatanSipil");
        contract = await PencatatanSipil.deploy();
        await contract.waitForDeployment();

        // Setup kalurahan
        await contract.tambahKalurahanById(1, kalurahan1.address, "QmTestMappingCID");
        await contract.tambahKalurahanById(2, kalurahan2.address, "QmTestMappingCID");

        // Register warga
        await contract.connect(warga1).registerWarga("1635142482592647");
        await contract.connect(warga2).registerWarga("1234567890123456");
    });

    it("Should submit permohonan pindah successfully with warga wallet", async function () {
        console.log("🔍 Testing submit permohonan pindah...");
        console.log("📍 Contract Address:", await contract.getAddress());
        console.log("👤 Warga 1 Address:", warga1.address);
        console.log("🏛️ Kalurahan 1 (ID: 1):", kalurahan1.address);
        console.log("🏛️ Kalurahan 2 (ID: 2):", kalurahan2.address);

        // Submit permohonan pindah dengan warga wallet
        const tx = await contract.connect(warga1).submitPermohonan(
            4, // JenisPermohonan.Pindah
            "QmeZkk4mNoyYc2BHavnpBMNmCDoWRDaTCYanp9BWehVugC", // CID IPFS
            1, // idKalurahanAsal
            2, // idKalurahanTujuan
            0  // JenisPindah.PindahSeluruhKeluarga
        );

        const receipt = await tx.wait();
        console.log("✅ Transaction successful!");
        console.log("🔗 Transaction Hash:", receipt.hash);

        // Verify permohonan was created
        const permohonan = await contract.getPermohonan(0);
        expect(permohonan.pemohon).to.equal(warga1.address);
        expect(permohonan.jenis).to.equal(4); // Pindah
        expect(permohonan.cidIPFS).to.equal("QmeZkk4mNoyYc2BHavnpBMNmCDoWRDaTCYanp9BWehVugC");
        expect(permohonan.idKalurahanAsal).to.equal(1);
        expect(permohonan.idKalurahanTujuan).to.equal(2);
        expect(permohonan.jenisPindah).to.equal(0); // PindahSeluruhKeluarga

        console.log("✅ Permohonan verified successfully!");
    });

    it("Should fail when using kalurahan wallet", async function () {
        console.log("🔍 Testing submit permohonan pindah with kalurahan wallet (should fail)...");

        // Try to submit with kalurahan wallet (should fail)
        await expect(
            contract.connect(kalurahan1).submitPermohonan(
                4, // JenisPermohonan.Pindah
                "QmeZkk4mNoyYc2BHavnpBMNmCDoWRDaTCYanp9BWehVugC", // CID IPFS
                1, // idKalurahanAsal
                2, // idKalurahanTujuan
                0  // JenisPindah.PindahSeluruhKeluarga
            )
        ).to.be.revertedWithCustomError(contract, "OnlyWargaTerdaftar");

        console.log("✅ Correctly failed with OnlyWargaTerdaftar error!");
    });
}); 