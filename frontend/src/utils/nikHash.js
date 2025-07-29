import { ethers } from 'ethers';

/**
 * Hash NIK menggunakan keccak256 (SHA3)
 * @param {string} nik - NIK yang akan di-hash
 * @returns {string} Hash NIK dalam format hex
 */
export function hashNIK(nik) {
    if (!nik || typeof nik !== 'string') {
        throw new Error('NIK harus berupa string yang valid');
    }
    return ethers.keccak256(ethers.toUtf8Bytes(nik));
}

/**
 * Verifikasi apakah hash NIK sesuai dengan NIK asli
 * @param {string} nik - NIK asli
 * @param {string} hash - Hash NIK yang akan diverifikasi
 * @returns {boolean} True jika hash sesuai
 */
export function verifyNIKHash(nik, hash) {
    const computedHash = hashNIK(nik);
    return computedHash === hash;
}