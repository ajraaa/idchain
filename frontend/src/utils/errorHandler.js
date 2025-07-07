import { getCustomErrorBySignature } from '../config/errorSignatures.js';

/**
 * Utility untuk handle custom errors dari smart contract
 */

/**
 * Parse dan handle custom errors dari smart contract
 * @param {Error} error - Error object dari ethers.js
 * @returns {string} Pesan error yang user-friendly
 */
export function handleContractError(error) {
    console.error('Contract error details:', error);

    // Handle custom errors dari smart contract
    if (error.reason) {
        return getCustomErrorMessage(error.reason);
    }

    // Handle error dengan data yang berisi custom error
    if (error.data) {
        try {
            // Coba decode error data
            const errorSignature = error.data.slice(0, 10);
            const customError = getCustomErrorBySignature(errorSignature);
            if (customError) {
                return getCustomErrorMessage(customError);
            }
        } catch (decodeError) {
            console.error('Failed to decode error data:', decodeError);
        }
    }

    // Handle error message yang mengandung custom error name
    if (error.message) {
        const customError = extractCustomErrorFromMessage(error.message);
        if (customError) {
            return getCustomErrorMessage(customError);
        }
    }

    // Fallback ke pesan error generik
    return getGenericErrorMessage(error);
}

/**
 * Mapping custom error ke pesan user-friendly
 * @param {string} errorName - Nama custom error
 * @returns {string} Pesan error dalam bahasa Indonesia
 */
function getCustomErrorMessage(errorName) {
    const errorMessages = {
        // KontrolAkses errors
        //'OnlyOwner': 'Hanya owner yang dapat melakukan aksi ini',
        'OnlyKalurahan': 'Hanya kalurahan yang dapat melakukan aksi ini',
        'OnlyDukcapil': 'Hanya dukcapil yang dapat melakukan aksi ini',
        'OnlyWargaTerdaftar': 'Hanya warga terdaftar yang dapat melakukan aksi ini',
        'AddressZero': 'Alamat wallet tidak valid (zero address)',
        'IdSudahDipakai': 'ID kalurahan sudah digunakan',
        'AddressSudahDipakai': 'Alamat wallet sudah terdaftar sebagai kalurahan',
        'NikSudahDiklaim': 'NIK ini sudah terdaftar dengan wallet lain',
        'WalletSudahDigunakan': 'Wallet ini sudah terdaftar dengan NIK lain',

        // PermohonanManager errors
        'BukanPemilikPermohonan': 'Anda bukan pemilik permohonan ini',
        'TidakDapatDibatalkan': 'Permohonan tidak dapat dibatalkan',
        'PermohonanBukanDiajukan': 'Status permohonan bukan Diajukan',
        'BukanPermohonanPindah': 'Permohonan ini bukan permohonan pindah',
        'TujuanTidakValid': 'ID kalurahan tujuan tidak valid',
        'IdKalurahanTujuanTidakDikenal': 'ID kalurahan tujuan tidak ditemukan',
        'BelumDiverifikasiKalurahanAsal': 'Belum diverifikasi oleh kalurahan asal',
        'HanyaKalurahanTujuan': 'Hanya kalurahan tujuan yang dapat melakukan aksi ini',
        'PermohonanPindahBelumDisetujuiKalurahanTujuan': 'Permohonan pindah belum disetujui kalurahan tujuan',
        'PermohonanBelumDisetujuiKalurahan': 'Permohonan belum disetujui kalurahan',
        'CidKosong': 'CID dokumen tidak boleh kosong',
        'BelumAdaDokumenResmi': 'Dokumen resmi belum diunggah',
        'AksesDitolak': 'Akses ditolak untuk dokumen ini',

        // DokumenResmiManager errors
        'BelumDisetujuiDukcapil': 'Permohonan belum disetujui dukcapil'
    };

    return errorMessages[errorName] || `Error tidak dikenal: ${errorName}`;
}

/**
 * Extract custom error dari error message
 * @param {string} message - Error message
 * @returns {string|null} Nama custom error atau null
 */
function extractCustomErrorFromMessage(message) {
    // Pattern untuk mencari custom error dalam error message
    const customErrorPatterns = [
        /execution reverted: "([^"]+)"/,
        /execution reverted: ([A-Za-z]+)/,
        /reverted: "([^"]+)"/,
        /reverted: ([A-Za-z]+)/
    ];

    for (const pattern of customErrorPatterns) {
        const match = message.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Get pesan error generik berdasarkan tipe error
 * @param {Error} error - Error object
 * @returns {string} Pesan error generik
 */
function getGenericErrorMessage(error) {
    if (error.code === 'ACTION_REJECTED') {
        return 'Transaksi dibatalkan oleh pengguna';
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
        return 'Saldo tidak cukup untuk membayar gas fee';
    }

    if (error.code === 'NETWORK_ERROR') {
        return 'Kesalahan jaringan. Silakan coba lagi';
    }

    if (error.message && error.message.includes('user rejected')) {
        return 'Transaksi dibatalkan oleh pengguna';
    }

    if (error.message && error.message.includes('insufficient funds')) {
        return 'Saldo tidak cukup untuk membayar gas fee';
    }

    if (error.message && error.message.includes('network')) {
        return 'Kesalahan jaringan. Silakan coba lagi';
    }

    return 'Terjadi kesalahan pada blockchain. Silakan coba lagi';
}

/**
 * Check apakah error adalah custom error
 * @param {Error} error - Error object
 * @returns {boolean} True jika custom error
 */
export function isCustomError(error) {
    return !!(error.reason ||
        (error.data && error.data.length >= 10) ||
        extractCustomErrorFromMessage(error.message));
} 