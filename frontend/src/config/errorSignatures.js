/**
 * Error signatures untuk custom errors dari smart contract
 * Signature ini dihasilkan dari keccak256 hash dari custom error name
 */

export const ERROR_SIGNATURES = {
    // KontrolAkses errors
    '0x24775acc': 'OnlyOwner',
    '0x64e3211f': 'OnlyKalurahan',
    '0xad4577c5': 'OnlyDukcapil',
    '0x59bda38f': 'OnlyWargaTerdaftar',
    '0x40b87d2f': 'AddressZero',
    '0xbfdb10c3': 'IdSudahDipakai',
    '0xc9f68deb': 'AddressSudahDipakai',
    '0x9e53e91e': 'NikSudahDiklaim',
    '0xfe0c2a70': 'WalletSudahDigunakan',

    // PermohonanManager errors
    '0xc8f7ff64': 'BukanPemilikPermohonan',
    '0x79efba79': 'TidakDapatDibatalkan',
    '0x4f6d3154': 'PermohonanBukanDiajukan',
    '0xdcc506a2': 'BukanPermohonanPindah',
    '0xc1e534e3': 'TujuanTidakValid',
    '0x1cb87421': 'IdKalurahanTujuanTidakDikenal',
    '0xd81595e9': 'BelumDiverifikasiKalurahanAsal',
    '0xa970a3a9': 'HanyaKalurahanTujuan',
    '0xf76212a8': 'PermohonanPindahBelumDisetujuiKalurahanTujuan',
    '0xc0e59c82': 'PermohonanBelumDisetujuiKalurahan',
    '0x46e81955': 'CidKosong',
    '0xca0851c2': 'BelumAdaDokumenResmi',
    '0xd19d8d88': 'AksesDitolak',

    // DokumenResmiManager errors
    '0xfeb0cd9f': 'BelumDisetujuiDukcapil'
};

/**
 * Get custom error name berdasarkan signature
 * @param {string} signature - Error signature (4 bytes)
 * @returns {string|null} Nama custom error atau null
 */
export function getCustomErrorBySignature(signature) {
    return ERROR_SIGNATURES[signature] || null;
}

/**
 * Get signature berdasarkan custom error name
 * @param {string} errorName - Nama custom error
 * @returns {string|null} Error signature atau null
 */
export function getSignatureByCustomError(errorName) {
    for (const [signature, name] of Object.entries(ERROR_SIGNATURES)) {
        if (name === errorName) {
            return signature;
        }
    }
    return null;
} 