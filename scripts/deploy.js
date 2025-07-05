// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    console.log("🚀 Memulai deployment kontrak PencatatanSipil...");

    // Deploy kontrak PencatatanSipil
    const PencatatanSipil = await hre.ethers.getContractFactory("PencatatanSipil");
    const pencatatanSipil = await PencatatanSipil.deploy();

    await pencatatanSipil.waitForDeployment();

    const address = await pencatatanSipil.getAddress();

    console.log("✅ Kontrak PencatatanSipil berhasil di-deploy!");
    console.log("📍 Address kontrak:", address);
    console.log("🔗 Network:", hre.network.name);

    // Verifikasi kontrak (opsional, untuk testnet)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("⏳ Menunggu beberapa block untuk verifikasi...");
        await pencatatanSipil.deploymentTransaction().wait(6);

        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: [],
            });
            console.log("✅ Kontrak berhasil diverifikasi di Etherscan!");
        } catch (error) {
            console.log("❌ Verifikasi gagal:", error.message);
        }
    }

    console.log("\n📋 Informasi Deployment:");
    console.log("==========================");
    console.log("Contract Name: PencatatanSipil");
    console.log("Contract Address:", address);
    console.log("Network:", hre.network.name);
    console.log("Deployer:", await pencatatanSipil.deploymentTransaction().from);

    // Simpan address ke file untuk digunakan frontend
    const fs = require('fs');
    const deploymentInfo = {
        contractName: "PencatatanSipil",
        address: address,
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