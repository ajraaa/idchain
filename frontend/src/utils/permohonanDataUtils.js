import { encryptAes256CbcNodeStyle, decryptAes256CbcNodeStyle } from './crypto.js';
import { uploadToPinata, fetchFromIPFS } from './pinata.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
export const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        console.log(`🔄 [Base64-Convert] Converting file: ${file.name} (${file.size} bytes)`);

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
            // Remove data:application/pdf;base64, prefix
            const base64 = reader.result.split(',')[1];
            console.log(`✅ [Base64-Convert] Conversion berhasil (${base64.length} characters)`);
            resolve(base64);
        };

        reader.onerror = (error) => {
            console.error(`❌ [Base64-Convert] Conversion failed:`, error);
            reject(error);
        };
    });
};

/**
 * Validate NIK format (16 digits)
 * @param {string} nik - NIK to validate
 * @returns {boolean} - True if valid
 */
export const validateNIK = (nik) => {
    return /^\d{16}$/.test(nik);
};

/**
 * Validate required fields for Kelahiran permohonan
 * @param {Object} formData - Form data
 * @returns {Object} - Validation result
 */
export const validateKelahiranData = (formData) => {
    const errors = {};

    if (!formData.namaAnak?.trim()) errors.namaAnak = 'Nama anak wajib diisi';
    if (!formData.tempatLahirAnak?.trim()) errors.tempatLahirAnak = 'Tempat lahir wajib diisi';
    if (!formData.tanggalLahirAnak) errors.tanggalLahirAnak = 'Tanggal lahir wajib diisi';
    if (!formData.jamLahirAnak) errors.jamLahirAnak = 'Jam lahir wajib diisi';
    if (!validateNIK(formData.nikAyah)) errors.nikAyah = 'NIK ayah harus 16 digit';
    if (!validateNIK(formData.nikIbu)) errors.nikIbu = 'NIK ibu harus 16 digit';
    if (!validateNIK(formData.nikSaksi1)) errors.nikSaksi1 = 'NIK saksi 1 harus 16 digit';
    if (!validateNIK(formData.nikSaksi2)) errors.nikSaksi2 = 'NIK saksi 2 harus 16 digit';
    if (!formData.suratKeteranganLahir) errors.suratKeteranganLahir = 'Surat keterangan lahir wajib diupload';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate required fields for Kematian permohonan
 * @param {Object} formData - Form data
 * @returns {Object} - Validation result
 */
export const validateKematianData = (formData) => {
    const errors = {};

    if (!validateNIK(formData.nikAlmarhum)) errors.nikAlmarhum = 'NIK almarhum harus 16 digit';
    if (!validateNIK(formData.nikPelapor)) errors.nikPelapor = 'NIK pelapor harus 16 digit';
    if (!validateNIK(formData.nikSaksi1)) errors.nikSaksi1 = 'NIK saksi 1 harus 16 digit';
    if (!validateNIK(formData.nikSaksi2)) errors.nikSaksi2 = 'NIK saksi 2 harus 16 digit';
    if (!formData.hubunganPelapor?.trim()) errors.hubunganPelapor = 'Hubungan pelapor wajib diisi';
    if (!formData.tempatKematian?.trim()) errors.tempatKematian = 'Tempat kematian wajib diisi';
    if (!formData.tanggalKematian) errors.tanggalKematian = 'Tanggal kematian wajib diisi';
    if (!formData.penyebabKematian?.trim()) errors.penyebabKematian = 'Penyebab kematian wajib diisi';
    if (!formData.suratKeteranganKematian) errors.suratKeteranganKematian = 'Surat keterangan kematian wajib diupload';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate required fields for Perkawinan permohonan
 * @param {Object} formData - Form data
 * @returns {Object} - Validation result
 */
export const validatePerkawinanData = (formData) => {
    const errors = {};

    if (!validateNIK(formData.nikPria)) errors.nikPria = 'NIK pria harus 16 digit';
    if (!validateNIK(formData.nikWanita)) errors.nikWanita = 'NIK wanita harus 16 digit';
    if (!validateNIK(formData.nikSaksi1)) errors.nikSaksi1 = 'NIK saksi 1 harus 16 digit';
    if (!validateNIK(formData.nikSaksi2)) errors.nikSaksi2 = 'NIK saksi 2 harus 16 digit';
    if (!formData.tempatPernikahan?.trim()) errors.tempatPernikahan = 'Tempat pernikahan wajib diisi';
    if (!formData.tanggalPernikahan) errors.tanggalPernikahan = 'Tanggal pernikahan wajib diisi';
    if (!formData.suratKeteranganPernikahan) errors.suratKeteranganPernikahan = 'Surat keterangan pernikahan wajib diupload';
    if (!formData.fotoPria) errors.fotoPria = 'Foto pria wajib diupload';
    if (!formData.fotoWanita) errors.fotoWanita = 'Foto wanita wajib diupload';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate required fields for Perceraian permohonan
 * @param {Object} formData - Form data
 * @returns {Object} - Validation result
 */
export const validatePerceraianData = (formData) => {
    const errors = {};

    if (!validateNIK(formData.nikSuami)) errors.nikSuami = 'NIK suami harus 16 digit';
    if (!validateNIK(formData.nikIstri)) errors.nikIstri = 'NIK istri harus 16 digit';
    if (!formData.suratPutusanPengadilan) errors.suratPutusanPengadilan = 'Surat putusan pengadilan wajib diupload';

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate required fields for Pindah permohonan
 * @param {Object} formData - Form data
 * @param {string} jenisPindah - Jenis pindah
 * @returns {Object} - Validation result
 */
export const validatePindahData = (formData, jenisPindah) => {
    const errors = {};

    if (!jenisPindah) {
        errors.jenisPindah = 'Jenis pindah wajib dipilih';
        return { isValid: false, errors };
    }

    // Validasi alamat tujuan dan kalurahan tujuan (support objek dan string)
    if (typeof formData.alamatTujuan === 'object') {
        if (!formData.alamatTujuan.alamat?.trim()) errors.alamatBaru = 'Alamat tujuan wajib diisi';
        if (!formData.alamatTujuan.kalurahan?.trim()) errors.kalurahanBaru = 'Kalurahan tujuan wajib dipilih';
    } else {
        if (!formData.alamatTujuan?.trim()) errors.alamatBaru = 'Alamat tujuan wajib diisi';

        // Untuk Pindah Gabung KK (jenisPindah === '2'), kalurahanTujuan akan diisi dari KK tujuan saat submit
        // jadi tidak perlu validasi di sini
        if (jenisPindah !== '2' && !formData.kalurahanTujuan?.trim()) {
            errors.kalurahanBaru = 'Kalurahan tujuan wajib dipilih';
        }
    }

    if (!formData.alasanPindah?.trim()) errors.alasanPindah = 'Alasan pindah wajib dipilih';
    if (formData.alasanPindah === 'Lainnya' && !formData.alasanPindahLainnya?.trim()) {
        errors.alasanPindahLainnya = 'Alasan pindah lainnya wajib diisi';
    }

    // Validasi NIK kepala keluarga tujuan untuk Pindah Gabung KK
    if (jenisPindah === '2' && !formData.nikKepalaKeluargaTujuan?.trim()) {
        errors.nikKepalaKeluargaTujuan = 'NIK kepala keluarga tujuan wajib diisi';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Prepare Kelahiran data structure
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @returns {Object} - Prepared data structure
 */
export const prepareKelahiranData = (formData, walletAddress) => ({
    metadata: {
        jenisPermohonan: "Kelahiran",
        timestamp: new Date().toISOString(),
        pemohon: walletAddress,
        version: "1.0"
    },
    dataKelahiran: {
        namaAnak: formData.namaAnak,
        tempatLahir: formData.tempatLahirAnak,
        tanggalLahir: formData.tanggalLahirAnak,
        jamLahir: formData.jamLahirAnak,
        nikAyah: formData.nikAyah,
        nikIbu: formData.nikIbu,
        nikSaksi1: formData.nikSaksi1,
        nikSaksi2: formData.nikSaksi2,
        suratKeteranganLahir: formData.suratKeteranganLahir
    }
});

/**
 * Prepare Kematian data structure
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @returns {Object} - Prepared data structure
 */
export const prepareKematianData = (formData, walletAddress) => ({
    metadata: {
        jenisPermohonan: "Kematian",
        timestamp: new Date().toISOString(),
        pemohon: walletAddress,
        version: "1.0"
    },
    dataKematian: {
        nikAlmarhum: formData.nikAlmarhum,
        nikPelapor: formData.nikPelapor,
        nikSaksi1: formData.nikSaksi1,
        nikSaksi2: formData.nikSaksi2,
        hubunganPelapor: formData.hubunganPelapor,
        tempatKematian: formData.tempatKematian,
        tanggalKematian: formData.tanggalKematian,
        penyebabKematian: formData.penyebabKematian,
        suratKeteranganKematian: formData.suratKeteranganKematian
    }
});

/**
 * Prepare Perkawinan data structure
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @returns {Object} - Prepared data structure
 */
export const preparePerkawinanData = (formData, walletAddress) => ({
    metadata: {
        jenisPermohonan: "Perkawinan",
        timestamp: new Date().toISOString(),
        pemohon: walletAddress,
        version: "1.0"
    },
    dataPerkawinan: {
        nikPria: formData.nikPria,
        nikWanita: formData.nikWanita,
        nikSaksi1: formData.nikSaksi1,
        nikSaksi2: formData.nikSaksi2,
        tempatPernikahan: formData.tempatPernikahan,
        tanggalPernikahan: formData.tanggalPernikahan,
        suratKeteranganPernikahan: formData.suratKeteranganPernikahan,
        fotoPria: formData.fotoPria,
        fotoWanita: formData.fotoWanita
    }
});

/**
 * Prepare Perceraian data structure
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @returns {Object} - Prepared data structure
 */
export const preparePerceraianData = (formData, walletAddress) => ({
    metadata: {
        jenisPermohonan: "Perceraian",
        timestamp: new Date().toISOString(),
        pemohon: walletAddress,
        version: "1.0"
    },
    dataPerceraian: {
        nikSuami: formData.nikSuami,
        nikIstri: formData.nikIstri,
        suratPutusanPengadilan: formData.suratPutusanPengadilan
    }
});

/**
 * Prepare Pindah data structure
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @param {string} jenisPindah - Jenis pindah
 * @returns {Object} - Prepared data structure
 */
export const preparePindahData = (formData, walletAddress, jenisPindah) => {
    console.log('[preparePindahData] formData yang diterima:', formData);
    const dataPindah = {
        alamatTujuan: formData.alamatTujuan || formData.alamatBaru,
        kalurahanTujuan: formData.kalurahanTujuan || formData.kalurahanBaru,
        alasanPindah: formData.alasanPindah,
        alasanPindahLainnya: formData.alasanPindahLainnya,
        anggotaPindah: formData.anggotaPindah,
        nikKepalaKeluargaBaru: formData.nikKepalaKeluargaBaru,
        nikKepalaKeluargaTujuan: formData.nikKepalaKeluargaTujuan
    };
    console.log('[preparePindahData] dataPindah yang akan disimpan:', dataPindah);
    return {
        metadata: {
            jenisPermohonan: "Pindah",
            jenisPindah: jenisPindah,
            timestamp: new Date().toISOString(),
            pemohon: walletAddress,
            version: "1.0"
        },
        dataPindah
    };
};

/**
 * Prepare permohonan data based on jenis permohonan
 * @param {string} jenisPermohonan - Jenis permohonan
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @param {string} jenisPindah - Jenis pindah (only for pindah)
 * @returns {Object} - Prepared data structure
 */
export const preparePermohonanData = (jenisPermohonan, formData, walletAddress, jenisPindah = null) => {
    switch (jenisPermohonan) {
        case '0': return prepareKelahiranData(formData, walletAddress);
        case '1': return prepareKematianData(formData, walletAddress);
        case '2': return preparePerkawinanData(formData, walletAddress);
        case '3': return preparePerceraianData(formData, walletAddress);
        case '4': return preparePindahData(formData, walletAddress, jenisPindah);
        default: throw new Error('Jenis permohonan tidak valid');
    }
};

/**
 * Validate permohonan data based on jenis permohonan
 * @param {string} jenisPermohonan - Jenis permohonan
 * @param {Object} formData - Form data
 * @param {string} jenisPindah - Jenis pindah (only for pindah)
 * @returns {Object} - Validation result
 */
export const validatePermohonanData = (jenisPermohonan, formData, jenisPindah = null) => {
    switch (jenisPermohonan) {
        case '0': return validateKelahiranData(formData);
        case '1': return validateKematianData(formData);
        case '2': return validatePerkawinanData(formData);
        case '3': return validatePerceraianData(formData);
        case '4': return validatePindahData(formData, jenisPindah);
        default: return { isValid: false, errors: { jenisPermohonan: 'Jenis permohonan tidak valid' } };
    }
};

/**
 * Process and upload permohonan data to IPFS
 * @param {string} jenisPermohonan - Jenis permohonan
 * @param {Object} formData - Form data
 * @param {string} walletAddress - User wallet address
 * @param {string} jenisPindah - Jenis pindah (only for pindah)
 * @returns {Promise<string>} - IPFS CID
 */
export const processAndUploadPermohonanData = async (jenisPermohonan, formData, walletAddress, jenisPindah = null) => {
    const startTime = Date.now();
    const jenisPermohonanLabels = {
        '0': 'Kelahiran',
        '1': 'Kematian',
        '2': 'Perkawinan',
        '3': 'Perceraian',
        '4': 'Pindah'
    };

    console.log(`🚀 [IPFS-Upload] Memulai proses submit permohonan ${jenisPermohonanLabels[jenisPermohonan]}...`);
    console.log(`📋 [IPFS-Upload] Wallet Address: ${walletAddress}`);
    console.log(`📋 [IPFS-Upload] Jenis Pindah: ${jenisPindah || 'N/A'}`);
    console.log(`📋 [IPFS-Upload] Form Data Keys:`, Object.keys(formData));

    try {
        // 1. Validate data
        console.log(`🔍 [IPFS-Upload] Step 1: Validasi data...`);
        const validation = validatePermohonanData(jenisPermohonan, formData, jenisPindah);
        if (!validation.isValid) {
            console.error(`❌ [IPFS-Upload] Validasi gagal:`, validation.errors);
            throw new Error(`Validasi gagal: ${Object.values(validation.errors).join(', ')}`);
        }
        console.log(`✅ [IPFS-Upload] Validasi berhasil`);

        // 2. Prepare data structure
        console.log(`📝 [IPFS-Upload] Step 2: Menyiapkan struktur data...`);
        const permohonanData = preparePermohonanData(jenisPermohonan, formData, walletAddress, jenisPindah);
        console.log('📝 [IPFS-Upload] Hasil prepare data (akan diencrypt):', permohonanData);

        // 3. Encrypt data
        console.log(`🔐 [IPFS-Upload] Step 3: Enkripsi data...`);
        const encryptStartTime = Date.now();
        const encryptedData = await encryptAes256CbcNodeStyle(permohonanData, CRYPTO_CONFIG.SECRET_KEY);
        const encryptEndTime = Date.now();
        console.log(`✅ [IPFS-Upload] Enkripsi berhasil (${encryptEndTime - encryptStartTime}ms)`);
        console.log(`📊 [IPFS-Upload] Encrypted data size: ${encryptedData.length} characters`);

        // 4. Upload to IPFS
        console.log(`☁️ [IPFS-Upload] Step 4: Upload ke IPFS...`);
        const uploadStartTime = Date.now();

        // Generate random UUID filename
        const generateUUID = () => {
            if (crypto.randomUUID) {
                return crypto.randomUUID();
            }
            // Fallback untuk browser lama
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const filename = `${generateUUID()}.enc`;
        console.log(`📁 [IPFS-Upload] Filename: ${filename}`);

        const cidIPFS = await uploadToPinata(encryptedData, filename);
        const uploadEndTime = Date.now();

        const totalTime = Date.now() - startTime;
        console.log(`✅ [IPFS-Upload] Upload berhasil!`);
        console.log(`📊 [IPFS-Upload] Upload time: ${uploadEndTime - uploadStartTime}ms`);
        console.log(`📊 [IPFS-Upload] Total process time: ${totalTime}ms`);
        console.log(`🔗 [IPFS-Upload] IPFS CID: ${cidIPFS}`);
        console.log(`🔗 [IPFS-Upload] IPFS URL: https://gateway.pinata.cloud/ipfs/${cidIPFS}`);

        return cidIPFS;
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [IPFS-Upload] Error dalam ${totalTime}ms:`, error);
        console.error(`❌ [IPFS-Upload] Error stack:`, error.stack);
        throw error;
    }
};

/**
 * Decrypt file data from IPFS
 * @param {string} cidIPFS - IPFS CID
 * @returns {Promise<string>} - Decrypted file data (base64)
 */
export const decryptFileData = async (cidIPFS) => {
    const startTime = Date.now();
    console.log(`🔓 [File-Decrypt] Memulai decrypt file dari IPFS...`);
    console.log(`🔗 [File-Decrypt] CID: ${cidIPFS}`);

    try {
        // Fetch encrypted data from IPFS
        console.log(`📥 [File-Decrypt] Fetching encrypted file from IPFS...`);
        const fetchStartTime = Date.now();
        const encryptedData = await fetchFromIPFS(cidIPFS);
        const fetchEndTime = Date.now();
        console.log(`✅ [File-Decrypt] File fetched dalam ${fetchEndTime - fetchStartTime}ms (${encryptedData.length} characters)`);

        // Decrypt data
        console.log(`🔐 [File-Decrypt] Decrypting file...`);
        const decryptStartTime = Date.now();
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        const decryptEndTime = Date.now();
        console.log(`✅ [File-Decrypt] File decryption berhasil dalam ${decryptEndTime - decryptStartTime}ms`);

        const totalTime = Date.now() - startTime;
        console.log(`🎉 [File-Decrypt] File decrypt process berhasil dalam ${totalTime}ms`);

        return decryptedData; // Returns base64 string
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [File-Decrypt] Error dalam ${totalTime}ms:`, error);
        console.error(`❌ [File-Decrypt] Error stack:`, error.stack);
        throw new Error('Gagal memuat file dari IPFS');
    }
};

/**
 * Decrypt and parse permohonan data from IPFS
 * @param {string} cidIPFS - IPFS CID
 * @returns {Promise<Object>} - Decrypted permohonan data
 */
export const decryptPermohonanData = async (cidIPFS) => {
    const startTime = Date.now();
    console.log(`🔓 [IPFS-Decrypt] Memulai decrypt data dari IPFS...`);
    console.log(`🔗 [IPFS-Decrypt] CID: ${cidIPFS}`);

    try {
        // Fetch encrypted data from IPFS
        console.log(`📥 [IPFS-Decrypt] Fetching encrypted data from IPFS...`);
        const fetchStartTime = Date.now();
        const encryptedData = await fetchFromIPFS(cidIPFS);
        const fetchEndTime = Date.now();
        console.log(`✅ [IPFS-Decrypt] Data fetched dalam ${fetchEndTime - fetchStartTime}ms (${encryptedData.length} characters)`);

        // Decrypt data
        console.log(`🔐 [IPFS-Decrypt] Decrypting data...`);
        const decryptStartTime = Date.now();
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        const decryptEndTime = Date.now();
        console.log(`✅ [IPFS-Decrypt] Decryption berhasil dalam ${decryptEndTime - decryptStartTime}ms`);
        console.log(`📋 [IPFS-Decrypt] Decrypted data keys:`, Object.keys(decryptedData));

        const totalTime = Date.now() - startTime;
        console.log(`🎉 [IPFS-Decrypt] Decrypt process berhasil dalam ${totalTime}ms`);

        return decryptedData;
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [IPFS-Decrypt] Error dalam ${totalTime}ms:`, error);
        console.error(`❌ [IPFS-Decrypt] Error stack:`, error.stack);
        throw new Error('Gagal memuat data permohonan dari IPFS');
    }
};

/**
 * Get formatted display data for permohonan
 * @param {Object} permohonanData - Decrypted permohonan data
 * @returns {Object} - Formatted display data
 */
export const getFormattedPermohonanData = (permohonanData) => {
    const { metadata, ...data } = permohonanData;

    // Helper untuk deteksi CID IPFS (panjang 46, diawali 'Qm')
    const isCID = (val) => typeof val === 'string' && val.length >= 46 && val.startsWith('Qm');
    const makeDocField = (val) => {
        if (isCID(val)) {
            return {
                type: 'encrypted_file',
                cid: val,
                url: `https://ipfs.io/ipfs/${val}`,
                label: '📄 File Terenkripsi',
                viewLabel: '👁️ Lihat Dokumen',
                downloadLabel: '📥 Download',
                originalExtension: 'pdf' // Default to PDF for now
            };
        }
        if (val) return '✓ Terupload';
        return '✗ Belum upload';
    };

    switch (metadata.jenisPermohonan) {
        case 'Kelahiran':
            return {
                jenis: 'Kelahiran',
                data: {
                    'Nama Anak': data.dataKelahiran.namaAnak,
                    'Tempat Lahir': data.dataKelahiran.tempatLahir,
                    'Tanggal Lahir': new Date(data.dataKelahiran.tanggalLahir).toLocaleDateString('id-ID'),
                    'Jam Lahir': data.dataKelahiran.jamLahir,
                    'NIK Ayah': data.dataKelahiran.nikAyah,
                    'NIK Ibu': data.dataKelahiran.nikIbu,
                    'NIK Saksi 1': data.dataKelahiran.nikSaksi1,
                    'NIK Saksi 2': data.dataKelahiran.nikSaksi2,
                    'Surat Keterangan Lahir': makeDocField(data.dataKelahiran.suratKeteranganLahir)
                }
            };

        case 'Kematian':
            return {
                jenis: 'Kematian',
                data: {
                    'NIK Almarhum': data.dataKematian.nikAlmarhum,
                    'NIK Pelapor': data.dataKematian.nikPelapor,
                    'NIK Saksi 1': data.dataKematian.nikSaksi1,
                    'NIK Saksi 2': data.dataKematian.nikSaksi2,
                    'Hubungan Pelapor': data.dataKematian.hubunganPelapor,
                    'Tempat Kematian': data.dataKematian.tempatKematian,
                    'Tanggal Kematian': new Date(data.dataKematian.tanggalKematian).toLocaleDateString('id-ID'),
                    'Penyebab Kematian': data.dataKematian.penyebabKematian,
                    'Surat Keterangan Kematian': makeDocField(data.dataKematian.suratKeteranganKematian)
                }
            };

        case 'Perkawinan':
            return {
                jenis: 'Perkawinan',
                data: {
                    'NIK Pria': data.dataPerkawinan.nikPria,
                    'NIK Wanita': data.dataPerkawinan.nikWanita,
                    'NIK Saksi 1': data.dataPerkawinan.nikSaksi1,
                    'NIK Saksi 2': data.dataPerkawinan.nikSaksi2,
                    'Tempat Pernikahan': data.dataPerkawinan.tempatPernikahan,
                    'Tanggal Pernikahan': new Date(data.dataPerkawinan.tanggalPernikahan).toLocaleDateString('id-ID'),
                    'Surat Keterangan Pernikahan': makeDocField(data.dataPerkawinan.suratKeteranganPernikahan),
                    'Foto Pria': makeDocField(data.dataPerkawinan.fotoPria),
                    'Foto Wanita': makeDocField(data.dataPerkawinan.fotoWanita)
                }
            };

        case 'Perceraian':
            return {
                jenis: 'Perceraian',
                data: {
                    'NIK Suami': data.dataPerceraian.nikSuami,
                    'NIK Istri': data.dataPerceraian.nikIstri,
                    'Surat Putusan Pengadilan': makeDocField(data.dataPerceraian.suratPutusanPengadilan)
                }
            };

        case 'Pindah':
            const jenisPindahLabels = {
                0: 'Seluruh Keluarga',
                1: 'Mandiri',
                2: 'Gabung KK'
            };

            // Susun field agar 'Alasan Pindah (Lainnya)' langsung di bawah 'Alasan Pindah'
            const pindahData = {};
            pindahData['Alasan Pindah'] = data.dataPindah.alasanPindah;
            if (data.dataPindah.alasanPindah === 'Lainnya' && data.dataPindah.alasanPindahLainnya) {
                pindahData['Alasan Pindah (Lainnya)'] = data.dataPindah.alasanPindahLainnya;
            }
            pindahData['Alamat Tujuan'] = (() => {
                const at = data.dataPindah.alamatTujuan;
                if (!at) return '-';
                if (typeof at === 'object') {
                    const parts = [];
                    if (at.alamat) parts.push(at.alamat);
                    if (at.kalurahan) parts.push('Kalurahan ' + at.kalurahan);
                    if (at.kecamatan) parts.push('Kecamatan ' + at.kecamatan);
                    if (at.kabupaten) parts.push('Kabupaten ' + at.kabupaten);
                    if (at.provinsi) parts.push('Provinsi ' + at.provinsi);
                    return parts.join(', ');
                }
                return at;
            })();
            pindahData['Anggota Pindah'] = (() => {
                const ap = data.dataPindah.anggotaPindah;
                if (!ap || ap.length === 0) return 'Tidak ada';
                return ap.join(', ');
            })();

            pindahData['NIK Kepala Keluarga Baru'] = (() => {
                const nkkb = data.dataPindah.nikKepalaKeluargaBaru;
                if (!nkkb || nkkb.trim() === '') return 'Tidak ada';
                return nkkb;
            })();

            pindahData['NIK Kepala Keluarga Tujuan'] = (() => {
                const nkkt = data.dataPindah.nikKepalaKeluargaTujuan;
                if (!nkkt || nkkt.trim() === '') return 'Tidak ada';
                return nkkt;
            })();

            return {
                jenis: 'Pindah',
                jenisPindah: jenisPindahLabels[metadata.jenisPindah] || 'Tidak diketahui',
                data: pindahData
            };

        default:
            return {
                jenis: 'Tidak diketahui',
                data: {}
            };
    }
};

/**
 * Detect MIME type from file content (magic bytes)
 * @param {Uint8Array} bytes - File bytes
 * @returns {string} - MIME type
 */
const detectMimeTypeFromContent = (bytes) => {
    if (bytes.length < 4) return 'application/octet-stream';

    // PDF: starts with %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return 'application/pdf';
    }

    // JPEG: starts with FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image/jpeg';
    }

    // PNG: starts with 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image/png';
    }

    // GIF: starts with GIF87a or GIF89a
    if ((bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && bytes[4] === 0x37 && bytes[5] === 0x61) ||
        (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && bytes[4] === 0x39 && bytes[5] === 0x61)) {
        return 'image/gif';
    }

    // DOC: starts with D0 CF 11 E0
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
        return 'application/msword';
    }

    // DOCX: starts with 50 4B 03 04 (ZIP format)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
        // Check if it's a DOCX by looking for specific files in the ZIP
        const header = new TextDecoder().decode(bytes.slice(0, Math.min(1000, bytes.length)));
        if (header.includes('[Content_Types].xml') || header.includes('word/')) {
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        if (header.includes('xl/') || header.includes('worksheets/')) {
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        return 'application/zip';
    }

    // XLS: starts with D0 CF 11 E0 (same as DOC, but we'll check content)
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
        const header = new TextDecoder().decode(bytes.slice(0, Math.min(1000, bytes.length)));
        if (header.includes('Workbook') || header.includes('Worksheet')) {
            return 'application/vnd.ms-excel';
        }
        return 'application/msword';
    }

    return 'application/octet-stream';
};

/**
 * View encrypted file in browser
 * @param {string} cidIPFS - IPFS CID
 * @param {string} originalFilename - Original filename for display
 * @returns {Promise<{url: string, mimeType: string, isViewable: boolean}>} - Returns object with URL, MIME type, and viewability flag
 */
export const viewEncryptedFile = async (cidIPFS, originalFilename = 'file') => {
    try {
        console.log(`👁️ [File-View] Memulai view file dari IPFS...`);
        console.log(`🔗 [File-View] CID: ${cidIPFS}`);
        console.log(`📁 [File-View] Original filename: ${originalFilename}`);

        // Decrypt file data
        const decryptedBase64 = await decryptFileData(cidIPFS);

        // Convert base64 to blob
        const byteCharacters = atob(decryptedBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Try to detect MIME type from content first, then fallback to extension
        let mimeType = detectMimeTypeFromContent(byteArray);

        // If content detection failed, try extension-based detection
        if (mimeType === 'application/octet-stream') {
            const getMimeTypeFromExtension = (filename) => {
                const ext = filename.toLowerCase().split('.').pop();
                switch (ext) {
                    case 'pdf': return 'application/pdf';
                    case 'jpg':
                    case 'jpeg': return 'image/jpeg';
                    case 'png': return 'image/png';
                    case 'gif': return 'image/gif';
                    case 'doc': return 'application/msword';
                    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    case 'xls': return 'application/vnd.ms-excel';
                    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    default: return 'application/octet-stream';
                }
            };
            mimeType = getMimeTypeFromExtension(originalFilename);
        }

        const blob = new Blob([byteArray], { type: mimeType });

        // Create blob URL for viewing
        const url = window.URL.createObjectURL(blob);

        // Determine if file is viewable in browser
        const isViewable = mimeType.startsWith('image/') ||
            mimeType === 'application/pdf' ||
            mimeType === 'text/plain' ||
            mimeType === 'text/html';

        console.log(`✅ [File-View] File berhasil diprepare untuk viewing: ${originalFilename}`);
        console.log(`📄 [File-View] MIME Type: ${mimeType}`);
        console.log(`🔍 [File-View] Detection method: ${mimeType === 'application/octet-stream' ? 'extension' : 'content'}`);
        console.log(`👁️ [File-View] Viewable in browser: ${isViewable}`);

        return { url, mimeType, isViewable };
    } catch (error) {
        console.error(`❌ [File-View] Error viewing file:`, error);
        throw new Error('Gagal memuat file untuk ditampilkan');
    }
};

/**
 * Download encrypted file from IPFS
 * @param {string} cidIPFS - IPFS CID
 * @param {string} originalFilename - Original filename for download
 * @returns {Promise<void>} - Downloads the file
 */
export const downloadEncryptedFile = async (cidIPFS, originalFilename = 'file') => {
    try {
        console.log(`📥 [File-Download] Memulai download file dari IPFS...`);
        console.log(`🔗 [File-Download] CID: ${cidIPFS}`);
        console.log(`📁 [File-Download] Original filename: ${originalFilename}`);

        // Decrypt file data
        const decryptedBase64 = await decryptFileData(cidIPFS);

        // Convert base64 to blob
        const byteCharacters = atob(decryptedBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`✅ [File-Download] File berhasil didownload: ${originalFilename}`);
    } catch (error) {
        console.error(`❌ [File-Download] Error downloading file:`, error);
        throw new Error('Gagal mendownload file');
    }
};

/**
 * Load and format permohonan data for display
 * @param {string} cidIPFS - IPFS CID
 * @returns {Promise<Object>} - Formatted display data
 */
export const loadPermohonanDataForDisplay = async (cidIPFS) => {
    try {
        const permohonanData = await decryptPermohonanData(cidIPFS);
        return getFormattedPermohonanData(permohonanData);
    } catch (error) {
        console.error('Error loading permohonan data for display:', error);
        throw error;
    }
}; 