const { ethers } = require("hardhat");

/**
 * Script untuk mendapatkan error signatures dari smart contract
 * Run dengan: npx hardhat run scripts/getErrorSignatures.js
 */
async function main() {
    console.log("🔍 Getting error signatures from smart contracts...\n");

    // Get contract factories
    const KontrolAkses = await ethers.getContractFactory("KontrolAkses");
    const PencatatanSipil = await ethers.getContractFactory("PencatatanSipil");

    console.log("📋 Custom Errors dari KontrolAkses:");
    console.log("=====================================");

    // KontrolAkses errors
    const kontrolAksesErrors = [
        'OnlyOwner',
        'OnlyKalurahan',
        'OnlyDukcapil',
        'OnlyWargaTerdaftar',
        'AddressZero',
        'IdSudahDipakai',
        'AddressSudahDipakai',
        'NikSudahDiklaim',
        'WalletSudahDigunakan'
    ];

    kontrolAksesErrors.forEach(errorName => {
        const signature = ethers.keccak256(ethers.toUtf8Bytes(errorName)).slice(0, 10);
        console.log(`${errorName}: ${signature}`);
    });

    console.log("\n📋 Custom Errors dari PermohonanManager:");
    console.log("==========================================");

    // PermohonanManager errors
    const permohonanManagerErrors = [
        'BukanPemilikPermohonan',
        'TidakDapatDibatalkan',
        'PermohonanBukanDiajukan',
        'BukanPermohonanPindah',
        'TujuanTidakValid',
        'IdKalurahanTujuanTidakDikenal',
        'BelumDiverifikasiKalurahanAsal',
        'HanyaKalurahanTujuan',
        'PermohonanPindahBelumDisetujuiKalurahanTujuan',
        'PermohonanBelumDisetujuiKalurahan',
        'CidKosong',
        'BelumAdaDokumenResmi',
        'AksesDitolak'
    ];

    permohonanManagerErrors.forEach(errorName => {
        const signature = ethers.keccak256(ethers.toUtf8Bytes(errorName)).slice(0, 10);
        console.log(`${errorName}: ${signature}`);
    });

    console.log("\n📋 Custom Errors dari DokumenResmiManager:");
    console.log("============================================");

    // DokumenResmiManager errors
    const dokumenResmiManagerErrors = [
        'BelumDisetujuiDukcapil'
    ];

    dokumenResmiManagerErrors.forEach(errorName => {
        const signature = ethers.keccak256(ethers.toUtf8Bytes(errorName)).slice(0, 10);
        console.log(`${errorName}: ${signature}`);
    });

    console.log("\n📝 Copy signature di atas ke file frontend/src/config/errorSignatures.js");
    console.log("💡 Format: '0x...': 'ErrorName'");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 