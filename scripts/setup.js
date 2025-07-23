// scripts/setup.js
const hre = require("hardhat");

async function main() {
    console.log("🚀 Memulai setup kontrak PencatatanSipil...");

    // Contract address dari deployment terakhir
    const contractAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

    // Get signers
    const [deployer, kalurahan1, kalurahan2, warga1, warga2] = await hre.ethers.getSigners();

    console.log("📋 Signers:");
    console.log("Deployer (Dukcapil):", deployer.address);
    console.log("Kalurahan 1:", kalurahan1.address);
    console.log("Kalurahan 2:", kalurahan2.address);
    console.log("Warga 1:", warga1.address);
    console.log("Warga 2:", warga2.address);

    // Get contract instance
    const PencatatanSipil = await hre.ethers.getContractFactory("PencatatanSipil");
    const contract = PencatatanSipil.attach(contractAddress);

    console.log("\n🔧 Setup Kalurahan...");

    // Buat mapping kalurahan awal
    const initialMapping = [
        { id: 1, nama: "Kalurahan 1", address: kalurahan1.address },
        { id: 2, nama: "Kalurahan 2", address: kalurahan2.address }
    ];

    // Note: Untuk setup script, kita menggunakan placeholder CID
    // Dalam implementasi nyata, mapping akan dienkripsi dan diupload ke IPFS
    const mappingCID = "QmInitialMappingCID"; // Placeholder CID untuk setup

    // Setup kalurahan dengan ID dan mapping CID
    console.log("➕ Menambahkan Kalurahan 1 (ID: 1)...");
    await contract.tambahKalurahanById(1, kalurahan1.address, mappingCID);
    console.log("✅ Kalurahan 1 berhasil ditambahkan");

    console.log("➕ Menambahkan Kalurahan 2 (ID: 2)...");
    await contract.tambahKalurahanById(2, kalurahan2.address, mappingCID);
    console.log("✅ Kalurahan 2 berhasil ditambahkan");

    console.log("\n👥 Setup Warga...");

    // Register warga
    console.log("➕ Register Warga 1...");
    await contract.connect(warga1).registerWarga("1635142482592647");
    console.log("✅ Warga 1 berhasil diregister dengan NIK: 1635142482592647");

    console.log("➕ Register Warga 2...");
    await contract.connect(warga2).registerWarga("1234567890123456");
    console.log("✅ Warga 2 berhasil diregister dengan NIK: 1234567890123456");

    console.log("\n📊 Verifikasi Setup...");

    // Verify kalurahan
    const kalurahan1Address = await contract.addressKalurahanById(1);
    const kalurahan2Address = await contract.addressKalurahanById(2);
    console.log("📍 Kalurahan 1 (ID: 1):", kalurahan1Address);
    console.log("📍 Kalurahan 2 (ID: 2):", kalurahan2Address);

    // Verify warga
    const nikWarga1 = await contract.nikByWallet(warga1.address);
    const nikWarga2 = await contract.nikByWallet(warga2.address);
    console.log("🆔 NIK Warga 1:", nikWarga1);
    console.log("🆔 NIK Warga 2:", nikWarga2);

    console.log("\n🎉 Setup selesai! Contract siap digunakan.");
    console.log("📍 Contract Address:", contractAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup gagal:", error);
        process.exit(1);
    }); 