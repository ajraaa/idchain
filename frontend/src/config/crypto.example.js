// Crypto configuration template
// Copy this file to crypto.js and replace the placeholder values with your actual configuration
export const CRYPTO_CONFIG = {
    // Secret key untuk enkripsi/dekripsi data keluarga
    // ⚠️ PERINGATAN: Dalam production, secret key seharusnya disimpan di environment variables
    // atau backend server, bukan di frontend
    SECRET_KEY: 'YOUR_SECRET_KEY_HERE',

    // Salt untuk scrypt (tidak boleh diubah setelah data sudah terenkripsi)
    SALT: 'salt',

    // Parameter scrypt
    SCRYPT_PARAMS: {
        N: 16384,  // CPU/memory cost
        r: 8,      // Block size
        p: 1       // Parallelization
    }
}; 