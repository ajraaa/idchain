// scripts/deploy.js
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Memulai deployment kontrak PencatatanSipil...");

    // ====== GANTI CID INI DENGAN CID YANG DIDAPAT SETELAH UPLOAD MANUAL ======
    const MAPPING_CID = "bafkreianoq56u2ldneg7bvutza6e4f6yqygh5bkgdefyirijlegjfsvr4a"; // <-- Ganti dengan CID yang didapat

    if (MAPPING_CID === "QmYourUploadedMappingCIDHere") {
        console.log("❌ CID mapping belum diset!");
        console.log("💡 Upload file mapping manual ke IPFS, lalu update CID di deploy.js");
        process.exit(1);
    }

    console.log("🔗 Initial NIK-CID mapping CID:", MAPPING_CID);

    // Deploy kontrak PencatatanSipil dengan CID mapping awal
    console.log("📦 Deploying PencatatanSipil with initial mapping CID...");
    const PencatatanSipil = await hre.ethers.getContractFactory("PencatatanSipil");
    const pencatatanSipil = await PencatatanSipil.deploy(MAPPING_CID);

    await pencatatanSipil.waitForDeployment();
    const pencatatanSipilAddress = await pencatatanSipil.getAddress();

    console.log("✅ Kontrak PencatatanSipil berhasil di-deploy!");
    console.log("📍 Address PencatatanSipil:", pencatatanSipilAddress);
    console.log("🔗 Initial mapping CID set:", MAPPING_CID);

    console.log("🔗 Network:", hre.network.name);

    // Verifikasi kontrak (opsional, untuk testnet)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("⏳ Menunggu beberapa block untuk verifikasi...");
        await pencatatanSipil.deploymentTransaction().wait(6);

        try {
            // Verifikasi PencatatanSipil dengan constructor arguments
            await hre.run("verify:verify", {
                address: pencatatanSipilAddress,
                constructorArguments: [MAPPING_CID],
            });
            console.log("✅ PencatatanSipil berhasil diverifikasi di Etherscan!");
        } catch (error) {
            console.log("❌ Verifikasi gagal:", error.message);
        }
    }

    console.log("\n📋 Informasi Deployment:");
    console.log("==========================");
    console.log("PencatatanSipil Address:", pencatatanSipilAddress);
    console.log("Network:", hre.network.name);
    console.log("Deployer:", await pencatatanSipil.deploymentTransaction().from);

    // Simpan address ke file untuk digunakan frontend
    const deploymentInfo = {
        pencatatanSipil: {
            contractName: "PencatatanSipil",
            address: pencatatanSipilAddress,
        },
        network: hre.network.name,
        deployer: await pencatatanSipil.deploymentTransaction().from,
        deploymentTime: new Date().toISOString()
    };

    fs.writeFileSync(
        'deployment-info.json',
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n💾 Informasi deployment disimpan ke: deployment-info.json");
    console.log("\n🎉 Deployment selesai! Copy address di atas ke frontend config.");
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment gagal:", error);
        process.exit(1);
    }); 