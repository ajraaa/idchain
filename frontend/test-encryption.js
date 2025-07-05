// Test script untuk demonstrasi enkripsi/dekripsi
// Jalankan dengan: node test-encryption.js

import CryptoJS from 'crypto-js';

// Sample data keluarga
const familyData = [
    {
        nik: "1234567890123456",
        nama: "John Doe",
        tanggalLahir: "1990-01-15",
        hubungan: "Kepala Keluarga"
    },
    {
        nik: "2345678901234567",
        nama: "Jane Doe",
        tanggalLahir: "1992-05-20",
        hubungan: "Istri"
    },
    {
        nik: "3456789012345678",
        nama: "Baby Doe",
        tanggalLahir: "2015-08-10",
        hubungan: "Anak"
    }
];

// Secret key untuk enkripsi/dekripsi
const secretKey = "mySecretKey123";

// Enkripsi data
function encryptData(data, key) {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
}

// Dekripsi data
function decryptData(encryptedData, key) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Dekripsi gagal:', error);
        return null;
    }
}

// Test enkripsi
console.log('=== TEST ENKRIPSI/DEKRIPSI ===');
console.log('Data asli:', familyData);

const encrypted = encryptData(familyData, secretKey);
console.log('\nData terenkripsi:', encrypted);

const decrypted = decryptData(encrypted, secretKey);
console.log('\nData terdekripsi:', decrypted);

// Test verifikasi
function verifyFamilyMember(data, nik, dateOfBirth) {
    if (!Array.isArray(data)) {
        return false;
    }

    return data.some(member => {
        const memberDateOfBirth = new Date(member.tanggalLahir);
        const inputDateOfBirth = new Date(dateOfBirth);

        return member.nik === nik &&
            memberDateOfBirth.toDateString() === inputDateOfBirth.toDateString();
    });
}

console.log('\n=== TEST VERIFIKASI ===');
console.log('Test NIK valid:', verifyFamilyMember(decrypted, "1234567890123456", "1990-01-15"));
console.log('Test NIK tidak valid:', verifyFamilyMember(decrypted, "9999999999999999", "1990-01-15"));
console.log('Test tanggal lahir tidak valid:', verifyFamilyMember(decrypted, "1234567890123456", "1990-01-16"));

console.log('\n=== INSTRUKSI ===');
console.log('1. Copy data terenkripsi di atas');
console.log('2. Upload ke IPFS dan dapatkan CID');
console.log('3. Update file nikToCidKK.json dengan CID tersebut');
console.log('4. Gunakan secret key "mySecretKey123" di aplikasi'); 