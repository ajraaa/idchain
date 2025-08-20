import { scrypt } from 'scrypt-js';

// Fungsi untuk konversi base64 ke Uint8Array
function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Dekripsi file hasil enkripsi Node.js (crypto, aes-256-cbc, scrypt, IV+cipher)
 * @param {string} base64Data - string base64 hasil upload dari Node.js
 * @param {string} passphrase - secret key
 * @returns {Promise<any>} - hasil JSON
 */
export async function decryptAes256CbcNodeStyle(base64Data, passphrase) {
    const encryptedBytes = base64ToBytes(base64Data);
    const iv = encryptedBytes.slice(0, 16);
    const ciphertext = encryptedBytes.slice(16);
    const key = await scrypt(
        new TextEncoder().encode(passphrase),
        new TextEncoder().encode('salt'),
        16384, 8, 1, 32
    );
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-CBC' },
        false,
        ['decrypt']
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        ciphertext
    );
    const decoder = new TextDecoder();
    const decodedString = decoder.decode(decryptedBuffer);
    console.log('🔍 [Crypto] Decoded string length:', decodedString.length);
    console.log('🔍 [Crypto] Decoded string preview:', decodedString.substring(0, 100) + '...');

    try {
        const parsedData = JSON.parse(decodedString);
        console.log('✅ [Crypto] Successfully parsed JSON');
        return parsedData;
    } catch (error) {
        console.error('❌ [Crypto] Failed to parse JSON:', error);
        console.error('❌ [Crypto] Raw decoded string:', decodedString);
        throw new Error('Failed to parse decrypted JSON: ' + error.message);
    }
}

/**
 * Enkripsi data JSON ke format base64 (IV + ciphertext) kompatibel Node.js
 * @param {any} jsonData - data yang akan dienkripsi
 * @param {string} passphrase - secret key
 * @returns {Promise<string>} - base64 string siap upload ke IPFS
 */
export async function encryptAes256CbcNodeStyle(jsonData, passphrase) {
    // 1. Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    // 2. Derive key
    const key = await scrypt(
        new TextEncoder().encode(passphrase),
        new TextEncoder().encode('salt'),
        16384, 8, 1, 32
    );
    // 3. Import key
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
    );
    // 4. Encrypt
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(jsonData);
    console.log('🔍 [Crypto] JSON string to encrypt length:', jsonString.length);
    console.log('🔍 [Crypto] JSON string preview:', jsonString.substring(0, 100) + '...');
    const data = encoder.encode(jsonString);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        cryptoKey,
        data
    );
    // 5. Gabungkan IV + ciphertext, encode ke base64
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64 using a more efficient method for large arrays
    let binary = '';
    const len = result.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(result[i]);
    }
    return btoa(binary);
}

export const validateNIK = (nik) => {
    // Basic NIK validation (16 digits)
    return /^\d{16}$/.test(nik);
};

export const validateDateOfBirth = (dateOfBirth) => {
    // Basic date validation
    const date = new Date(dateOfBirth);
    return date instanceof Date && !isNaN(date);
}; 