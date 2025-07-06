/**
 * Utility untuk memperbaiki pesan notifikasi agar lebih user-friendly
 */

/**
 * Enhance notification message berdasarkan tipe dan konteks
 * @param {string} message - Pesan asli
 * @param {string} type - Tipe notifikasi (success, error, warning, info)
 * @param {string} context - Konteks operasi (wallet, verification, owner, etc.)
 * @returns {string} Pesan yang sudah di-enhance
 */
export function enhanceNotificationMessage(message, type = 'info', context = '') {
    // Jika sudah menggunakan custom error handling, return as is
    if (isCustomErrorMessage(message)) {
        return message;
    }

    // Enhance berdasarkan tipe dan konteks
    switch (type) {
        case 'success':
            return enhanceSuccessMessage(message, context);
        case 'error':
            return enhanceErrorMessage(message, context);
        case 'warning':
            return enhanceWarningMessage(message, context);
        case 'info':
            return enhanceInfoMessage(message, context);
        default:
            return message;
    }
}

/**
 * Check apakah message sudah menggunakan custom error handling
 * @param {string} message - Pesan untuk dicek
 * @returns {boolean} True jika sudah custom error message
 */
function isCustomErrorMessage(message) {
    const customErrorPatterns = [
        'Hanya owner yang dapat melakukan aksi ini',
        'Hanya kalurahan yang dapat melakukan aksi ini',
        'Hanya dukcapil yang dapat melakukan aksi ini',
        'Hanya warga terdaftar yang dapat melakukan aksi ini',
        'NIK ini sudah terdaftar dengan wallet lain',
        'Wallet ini sudah terdaftar dengan NIK lain',
        'Anda bukan pemilik permohonan ini',
        'Permohonan tidak dapat dibatalkan',
        'Status permohonan bukan Diajukan',
        'ID kalurahan tujuan tidak valid',
        'CID dokumen tidak boleh kosong',
        'Dokumen resmi belum diunggah',
        'Akses ditolak untuk dokumen ini',
        'Permohonan belum disetujui dukcapil',
        'Transaksi dibatalkan oleh pengguna',
        'Saldo tidak cukup untuk membayar gas fee',
        'Kesalahan jaringan. Silakan coba lagi'
    ];

    return customErrorPatterns.some(pattern => message.includes(pattern));
}

/**
 * Enhance success message
 * @param {string} message - Pesan asli
 * @param {string} context - Konteks operasi
 * @returns {string} Pesan yang sudah di-enhance
 */
function enhanceSuccessMessage(message, context) {
    // Wallet connection success
    if (message.includes('Wallet berhasil terhubung')) {
        return '✅ Wallet berhasil terhubung! Anda sekarang dapat menggunakan sistem.';
    }

    // Identity verification success
    if (message.includes('Identitas berhasil diverifikasi')) {
        return '✅ Identitas berhasil diverifikasi! NIK Anda telah terdaftar dalam sistem blockchain.';
    }

    // Owner operations success
    if (message.includes('berhasil ditambahkan') || message.includes('berhasil dihapus')) {
        if (message.includes('Dukcapil')) {
            return '✅ Dukcapil berhasil dikelola! Perubahan telah disimpan ke blockchain.';
        }
        if (message.includes('Kalurahan')) {
            return '✅ Kalurahan berhasil dikelola! Perubahan telah disimpan ke blockchain.';
        }
    }

    // Generic success enhancement
    if (message.includes('Transaction:')) {
        const baseMessage = message.split('Transaction:')[0].trim();
        return `✅ ${baseMessage} Transaksi telah berhasil diproses.`;
    }

    return `✅ ${message}`;
}

/**
 * Enhance error message
 * @param {string} message - Pesan asli
 * @param {string} context - Konteks operasi
 * @returns {string} Pesan yang sudah di-enhance
 */
function enhanceErrorMessage(message, context) {
    // Wallet connection errors
    if (message.includes('MetaMask is not installed')) {
        return '❌ MetaMask tidak terinstall. Silakan install MetaMask terlebih dahulu.';
    }

    if (message.includes('Failed to connect wallet')) {
        return '❌ Gagal menghubungkan wallet. Silakan coba lagi atau periksa koneksi internet.';
    }

    if (message.includes('user rejected')) {
        return '❌ Transaksi dibatalkan oleh pengguna. Silakan coba lagi jika diperlukan.';
    }

    // Contract initialization errors
    if (message.includes('Contract not initialized')) {
        return '❌ Wallet belum terhubung. Silakan hubungkan wallet terlebih dahulu.';
    }

    // Registration errors
    if (message.includes('Failed to register warga')) {
        return '❌ Gagal mendaftarkan warga. Silakan periksa data dan coba lagi.';
    }

    // Generic error enhancement
    if (message.includes('Failed') || message.includes('Gagal')) {
        return `❌ ${message}`;
    }

    return `❌ ${message}`;
}

/**
 * Enhance warning message
 * @param {string} message - Pesan asli
 * @param {string} context - Konteks operasi
 * @returns {string} Pesan yang sudah di-enhance
 */
function enhanceWarningMessage(message, context) {
    return `⚠️ ${message}`;
}

/**
 * Enhance info message
 * @param {string} message - Pesan asli
 * @param {string} context - Konteks operasi
 * @returns {string} Pesan yang sudah di-enhance
 */
function enhanceInfoMessage(message, context) {
    if (message.includes('Wallet terputus')) {
        return 'ℹ️ Wallet telah terputus. Silakan hubungkan kembali untuk melanjutkan.';
    }

    return `ℹ️ ${message}`;
}

/**
 * Get notification duration berdasarkan tipe dan konteks
 * @param {string} type - Tipe notifikasi
 * @param {string} context - Konteks operasi
 * @returns {number} Durasi dalam milidetik
 */
export function getNotificationDuration(type, context) {
    switch (type) {
        case 'success':
            return 4000; // 4 detik untuk success
        case 'error':
            return 6000; // 6 detik untuk error (lebih lama agar user bisa baca)
        case 'warning':
            return 5000; // 5 detik untuk warning
        case 'info':
            return 3000; // 3 detik untuk info
        default:
            return 5000;
    }
}

/**
 * Get notification auto-close setting berdasarkan tipe
 * @param {string} type - Tipe notifikasi
 * @returns {boolean} True jika auto-close
 */
export function getNotificationAutoClose(type) {
    // Error messages tidak auto-close agar user bisa baca dengan teliti
    return type !== 'error';
} 