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

    if (jenisPindah === '0') { // Seluruh keluarga
        if (!formData.alamatBaru?.trim()) errors.alamatBaru = 'Alamat tujuan wajib diisi';
        if (!formData.kalurahanBaru?.trim()) errors.kalurahanBaru = 'Kalurahan tujuan wajib dipilih';
        if (!formData.alasanPindah?.trim()) errors.alasanPindah = 'Alasan pindah wajib dipilih';
        if (formData.alasanPindah === 'Lainnya' && !formData.alasanPindahLainnya?.trim()) {
            errors.alasanPindahLainnya = 'Alasan pindah lainnya wajib diisi';
        }
    } else if (jenisPindah === '1') { // Mandiri
        if (formData.anggotaPindah?.length === 0) errors.anggotaPindah = 'Pilih minimal satu anggota yang pindah';
        if (!formData.nikKepalaKeluargaBaru?.trim()) errors.nikKepalaKeluargaBaru = 'Pilih kepala keluarga baru';
        if (!formData.alamatBaru?.trim()) errors.alamatBaru = 'Alamat tujuan wajib diisi';
        if (!formData.kalurahanBaru?.trim()) errors.kalurahanBaru = 'Kalurahan tujuan wajib dipilih';
        if (!formData.alasanPindah?.trim()) errors.alasanPindah = 'Alasan pindah wajib dipilih';
        if (formData.alasanPindah === 'Lainnya' && !formData.alasanPindahLainnya?.trim()) {
            errors.alasanPindahLainnya = 'Alasan pindah lainnya wajib diisi';
        }
    } else if (jenisPindah === '2') { // Gabung KK
        if (formData.anggotaPindah?.length === 0) errors.anggotaPindah = 'Pilih minimal satu anggota yang pindah';
        if (!formData.nikKepalaKeluargaTujuan?.trim()) errors.nikKepalaKeluargaTujuan = 'NIK kepala keluarga tujuan wajib diisi';
        if (!formData.alasanPindah?.trim()) errors.alasanPindah = 'Alasan pindah wajib dipilih';
        if (formData.alasanPindah === 'Lainnya' && !formData.alasanPindahLainnya?.trim()) {
            errors.alasanPindahLainnya = 'Alasan pindah lainnya wajib diisi';
        }
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
        const filename = `permohonan_${jenisPermohonan}_${Date.now()}.enc`;
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
            return `https://ipfs.io/ipfs/${val}`;
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

            return {
                jenis: 'Pindah',
                jenisPindah: jenisPindahLabels[metadata.jenisPindah] || 'Tidak diketahui',
                data: {
                    'Alasan Pindah': data.dataPindah.alasanPindah,
                    'Alamat Tujuan': `${data.dataPindah.alamatTujuan.alamat}, ${data.dataPindah.alamatTujuan.kalurahan}, ${data.dataPindah.alamatTujuan.kecamatan}, ${data.dataPindah.alamatTujuan.kabupaten}, ${data.dataPindah.alamatTujuan.provinsi}`,
                    'Anggota Pindah': data.dataPindah.anggotaPindah?.length > 0 ? data.dataPindah.anggotaPindah.join(', ') : 'Tidak ada',
                    'NIK Kepala Keluarga Baru': data.dataPindah.nikKepalaKeluargaBaru || 'Tidak ada',
                    'NIK Kepala Keluarga Tujuan': data.dataPindah.nikKepalaKeluargaTujuan || 'Tidak ada'
                }
            };

        default:
            return {
                jenis: 'Tidak diketahui',
                data: {}
            };
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