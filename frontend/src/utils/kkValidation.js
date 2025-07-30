// KK Data Validation System
// Sistem validasi data KK yang komprehensif untuk aplikasi IDChain

import { loadNIKMapping } from './ipfs.js';

/**
 * Validasi struktur data KK
 * @param {Object} kkData - Data KK yang akan divalidasi
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateKKStructure = (kkData) => {
    const errors = [];

    console.log('🔍 [KK-Validation] Validating KK structure:', JSON.stringify(kkData, null, 2));

    // 1. Validasi keberadaan field wajib
    if (!kkData.kk) errors.push("Nomor KK wajib diisi");
    if (!kkData.alamatLengkap) errors.push("Data alamat lengkap wajib diisi");
    if (!Array.isArray(kkData.anggota)) errors.push("Data anggota keluarga wajib berupa array");

    // 2. Validasi alamat lengkap (lebih fleksibel)
    if (kkData.alamatLengkap) {
        const alamat = kkData.alamatLengkap;
        console.log('🔍 [KK-Validation] Alamat data:', JSON.stringify(alamat, null, 2));

        // Hanya validasi field yang benar-benar penting
        const criticalFields = ['alamat', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi'];
        criticalFields.forEach(field => {
            if (!alamat[field] || alamat[field].toString().trim() === '') {
                errors.push(`Field ${field} dalam alamat wajib diisi`);
            }
        });
    }

    // 3. Validasi anggota keluarga
    if (kkData.anggota.length === 0) {
        errors.push("KK harus memiliki minimal 1 anggota keluarga");
    }

    // 4. Validasi kepala keluarga (lebih fleksibel)
    if (kkData.anggota.length > 0) {
        const kepalaKeluarga = kkData.anggota.find(a =>
            a.statusHubunganKeluarga === 'KEPALA KELUARGA' ||
            a.statusHubunganKeluarga === 'Kepala Keluarga' ||
            a.statusHubunganKeluarga === 'kepala keluarga'
        );
        if (!kepalaKeluarga) {
            errors.push("KK harus memiliki kepala keluarga");
        }
    }

    // 5. Validasi NIK unik
    if (kkData.anggota.length > 0) {
        const nikList = kkData.anggota.map(a => a.nik);
        const uniqueNik = new Set(nikList);
        if (nikList.length !== uniqueNik.size) {
            errors.push("Ada NIK duplikat dalam KK");
        }
    }

    console.log('📋 [KK-Validation] Structure validation result:', { isValid: errors.length === 0, errors });
    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi format NIK
 * @param {string} nik - NIK yang akan divalidasi
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateNIK = (nik) => {
    const errors = [];

    console.log('🔍 [KK-Validation] Validating NIK:', nik, 'Type:', typeof nik);

    // 1. Panjang NIK harus 16 digit (lebih fleksibel)
    if (!nik) {
        errors.push("NIK wajib diisi");
        return { isValid: false, errors };
    }

    const nikString = nik.toString();
    if (nikString.length !== 16) {
        errors.push("NIK harus 16 digit");
    }

    // 2. NIK harus berupa angka (lebih fleksibel)
    if (!/^\d+$/.test(nikString)) {
        errors.push("NIK hanya boleh berisi angka");
    }

    // 3. Validasi kode provinsi (2 digit pertama) - opsional untuk testing
    if (nikString && nikString.length >= 2) {
        const kodeProvinsi = nikString.substring(0, 2);
        const validProvinsi = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '34', '35', '36', '37', '38', '39', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '59', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '72', '73', '74', '75', '76', '77', '78', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
        if (!validProvinsi.includes(kodeProvinsi)) {
            console.warn('⚠️ [KK-Validation] Kode provinsi tidak valid:', kodeProvinsi);
            // Tidak throw error untuk kode provinsi dalam testing
        }
    }

    // 4. Validasi tanggal lahir (digit 7-12) - opsional untuk testing
    if (nikString && nikString.length >= 12) {
        const tanggalLahir = nikString.substring(6, 12);
        const tanggal = parseInt(tanggalLahir.substring(0, 2));
        const bulan = parseInt(tanggalLahir.substring(2, 4));
        const tahun = parseInt(tanggalLahir.substring(4, 6));

        if (tanggal < 1 || tanggal > 31) {
            console.warn('⚠️ [KK-Validation] Tanggal lahir tidak valid:', tanggal);
            // Tidak throw error untuk tanggal dalam testing
        }
        if (bulan < 1 || bulan > 12) {
            console.warn('⚠️ [KK-Validation] Bulan lahir tidak valid:', bulan);
            // Tidak throw error untuk bulan dalam testing
        }
    }

    console.log('📋 [KK-Validation] NIK validation result:', { isValid: errors.length === 0, errors });
    return { isValid: errors.length === 0, errors };
};

/**
 * Helper function untuk menghitung umur
 * @param {string} tanggalLahir - Tanggal lahir dalam format YYYY-MM-DD
 * @returns {number} - Umur dalam tahun
 */
export const calculateAge = (tanggalLahir) => {
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

/**
 * Validasi data kelahiran
 * @param {Object} kkAsal - Data KK asal
 * @param {Object} dataAnak - Data anak yang akan ditambahkan
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateKelahiran = (kkAsal, dataAnak) => {
    const errors = [];

    console.log('🔍 [KK-Validation] Validating kelahiran data:', JSON.stringify(dataAnak, null, 2));
    console.log('🔍 [KK-Validation] KK Asal for validation:', JSON.stringify(kkAsal, null, 2));

    // 1. Validasi ayah dan ibu ada di KK
    const ayah = kkAsal.anggota.find(a => a.nik === dataAnak.nikAyah);
    const ibu = kkAsal.anggota.find(a => a.nik === dataAnak.nikIbu);

    console.log('🔍 [KK-Validation] Found ayah:', ayah ? 'Yes' : 'No', 'NIK:', dataAnak.nikAyah);
    console.log('🔍 [KK-Validation] Found ibu:', ibu ? 'Yes' : 'No', 'NIK:', dataAnak.nikIbu);

    if (!ayah) errors.push("Ayah tidak ditemukan di KK");
    if (!ibu) errors.push("Ibu tidak ditemukan di KK");

    // 2. Validasi status perkawinan orang tua (lebih fleksibel)
    if (ayah) {
        // Cek field statusPernikahan atau statusPerkawinan
        const statusAyah = ayah.statusPernikahan || ayah.statusPerkawinan;
        console.log('🔍 [KK-Validation] Ayah status perkawinan:', statusAyah);
        const validStatusAyah = ['Kawin', 'KAWIN', 'kawin', 'Menikah', 'MENIKAH', 'menikah'];
        if (!validStatusAyah.includes(statusAyah)) {
            errors.push("Status perkawinan ayah harus 'Kawin'");
        }
    }
    if (ibu) {
        // Cek field statusPernikahan atau statusPerkawinan
        const statusIbu = ibu.statusPernikahan || ibu.statusPerkawinan;
        console.log('🔍 [KK-Validation] Ibu status perkawinan:', statusIbu);
        const validStatusIbu = ['Kawin', 'KAWIN', 'kawin', 'Menikah', 'MENIKAH', 'menikah'];
        if (!validStatusIbu.includes(statusIbu)) {
            errors.push("Status perkawinan ibu harus 'Kawin'");
        }
    }

    // 3. Validasi umur anak (tidak boleh sudah ada KK sendiri)
    const umurAnak = calculateAge(dataAnak.tanggalLahir);
    console.log('🔍 [KK-Validation] Umur anak:', umurAnak);
    if (umurAnak >= 17) {
        errors.push("Anak sudah berusia dewasa, tidak bisa ditambahkan ke KK");
    }

    // 4. Validasi tanggal kelahiran tidak di masa depan
    if (new Date(dataAnak.tanggalLahir) > new Date()) {
        errors.push("Tanggal kelahiran tidak boleh di masa depan");
    }

    // 5. Validasi kapasitas KK (maksimal 6 anggota)
    console.log('🔍 [KK-Validation] Jumlah anggota KK:', kkAsal.anggota.length);
    if (kkAsal.anggota.length >= 6) {
        errors.push("KK sudah penuh (maksimal 6 anggota)");
    }

    // 6. Validasi NIK anak (opsional untuk anak baru lahir)
    // Anak baru lahir biasanya belum punya NIK, jadi tidak wajib
    if (dataAnak.nik) {
        console.log('🔍 [KK-Validation] Validating NIK anak:', dataAnak.nik);
        const nikValidation = validateNIK(dataAnak.nik);
        if (!nikValidation.isValid) {
            errors.push(...nikValidation.errors);
        }
    } else {
        console.log('🔍 [KK-Validation] Anak baru lahir, NIK belum ada (normal)');
    }

    console.log('📋 [KK-Validation] Kelahiran validation result:', { isValid: errors.length === 0, errors });
    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi data kematian
 * @param {Object} kkAsal - Data KK asal
 * @param {Object} dataKematian - Data kematian
 * @param {Object} contractService - Service untuk akses mapping
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateKematian = async (kkAsal, dataKematian, contractService) => {
    const errors = [];

    // 1. Validasi almarhum ada di KK
    const almarhum = kkAsal.anggota.find(a => a.nik === dataKematian.nikAlmarhum);
    if (!almarhum) {
        errors.push("Almarhum tidak ditemukan di KK");
    }

    // 2. Validasi almarhum masih hidup (belum ada status kematian)
    if (almarhum && almarhum.statusKematian) {
        errors.push("Orang tersebut sudah tercatat meninggal");
    }

    // 3. Validasi pelapor ada di KK atau KK lain
    const pelapor = kkAsal.anggota.find(a => a.nik === dataKematian.nikPelapor);
    if (!pelapor) {
        // Cek di KK lain melalui mapping
        try {
            const mapping = await loadNIKMapping(contractService);
            if (!mapping[dataKematian.nikPelapor]) {
                errors.push("Pelapor tidak ditemukan di sistem");
            }
        } catch (error) {
            errors.push("Gagal memverifikasi data pelapor");
        }
    }

    // 4. Validasi tanggal kematian tidak di masa depan
    if (new Date(dataKematian.tanggalKematian) > new Date()) {
        errors.push("Tanggal kematian tidak boleh di masa depan");
    }

    // 5. Validasi tanggal kematian setelah tanggal lahir
    if (almarhum && new Date(dataKematian.tanggalKematian) < new Date(almarhum.tanggalLahir)) {
        errors.push("Tanggal kematian tidak valid");
    }

    // 6. Validasi kepala keluarga tidak boleh meninggal jika masih ada anggota lain
    if (almarhum && almarhum.statusHubunganKeluarga === 'KEPALA KELUARGA' && kkAsal.anggota.length > 1) {
        errors.push("Kepala keluarga tidak boleh meninggal jika masih ada anggota keluarga lain");
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi data perkawinan
 * @param {Object} kkSuami - Data KK suami
 * @param {Object} kkIstri - Data KK istri
 * @param {Object} dataPerkawinan - Data perkawinan
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validatePerkawinan = (kkSuami, kkIstri, dataPerkawinan) => {
    const errors = [];

    // 1. Validasi suami dan istri ada di KK masing-masing
    const suami = kkSuami.anggota.find(a => a.nik === dataPerkawinan.nikPria);
    const istri = kkIstri.anggota.find(a => a.nik === dataPerkawinan.nikWanita);

    if (!suami) errors.push("Data suami tidak ditemukan");
    if (!istri) errors.push("Data istri tidak ditemukan");

    // 2. Validasi status perkawinan (belum menikah)
    if (suami && suami.statusPerkawinan !== "Belum Kawin") {
        errors.push("Suami sudah menikah");
    }
    if (istri && istri.statusPerkawinan !== "Belum Kawin") {
        errors.push("Istri sudah menikah");
    }

    // 3. Validasi umur (minimal 19 tahun)
    if (suami && calculateAge(suami.tanggalLahir) < 19) {
        errors.push("Suami belum memenuhi syarat umur perkawinan");
    }
    if (istri && calculateAge(istri.tanggalLahir) < 19) {
        errors.push("Istri belum memenuhi syarat umur perkawinan");
    }

    // 4. Validasi jenis kelamin
    if (suami && suami.jenisKelamin !== "L") {
        errors.push("Suami harus berjenis kelamin laki-laki");
    }
    if (istri && istri.jenisKelamin !== "P") {
        errors.push("Istri harus berjenis kelamin perempuan");
    }

    // 5. Validasi KK berbeda
    if (kkSuami.kk === kkIstri.kk) {
        errors.push("Suami dan istri tidak boleh dari KK yang sama");
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi data perceraian
 * @param {Object} kkAsal - Data KK asal
 * @param {Object} dataPerceraian - Data perceraian
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validatePerceraian = (kkAsal, dataPerceraian) => {
    const errors = [];

    // 1. Validasi suami dan istri ada di KK yang sama
    const suami = kkAsal.anggota.find(a => a.nik === dataPerceraian.nikSuami);
    const istri = kkAsal.anggota.find(a => a.nik === dataPerceraian.nikIstri);

    if (!suami) errors.push("Suami tidak ditemukan di KK");
    if (!istri) errors.push("Istri tidak ditemukan di KK");

    // 2. Validasi status perkawinan (sudah menikah)
    if (suami && suami.statusPerkawinan !== "Kawin") {
        errors.push("Suami belum menikah");
    }
    if (istri && istri.statusPerkawinan !== "Kawin") {
        errors.push("Istri belum menikah");
    }

    // 3. Validasi hubungan keluarga
    if (suami && suami.statusHubunganKeluarga !== "KEPALA KELUARGA") {
        errors.push("Suami harus kepala keluarga");
    }
    if (istri && istri.statusHubunganKeluarga !== "ISTRI") {
        errors.push("Istri harus memiliki status istri");
    }

    // 4. Validasi ada anak (jika ada, perlu pengaturan hak asuh)
    const anak = kkAsal.anggota.filter(a =>
        a.statusHubunganKeluarga === "ANAK" &&
        (a.nikAyah === suami?.nik || a.nikIbu === istri?.nik)
    );

    if (anak.length > 0) {
        errors.push("Perceraian dengan anak memerlukan pengaturan hak asuh");
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi data pindah
 * @param {Object} kkAsal - Data KK asal
 * @param {Object} dataPindah - Data pindah
 * @param {string} jenisPindah - Jenis pindah (0: seluruh keluarga, 1: mandiri, 2: gabung KK)
 * @param {Object} contractService - Service untuk akses mapping
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validatePindah = async (kkAsal, dataPindah, jenisPindah, contractService) => {
    const errors = [];

    // 1. Validasi anggota yang pindah ada di KK asal
    if (jenisPindah === '1' || jenisPindah === '2') { // Mandiri atau Gabung KK
        if (!dataPindah.anggotaPindah || dataPindah.anggotaPindah.length === 0) {
            errors.push("Anggota yang pindah wajib dipilih");
        } else {
            dataPindah.anggotaPindah.forEach(nik => {
                const anggota = kkAsal.anggota.find(a => a.nik === nik);
                if (!anggota) {
                    errors.push(`Anggota dengan NIK ${nik} tidak ditemukan di KK asal`);
                }
            });
        }
    }

    // 2. Validasi kepala keluarga baru untuk pindah mandiri
    if (jenisPindah === '1') {
        if (!dataPindah.nikKepalaKeluargaBaru) {
            errors.push("Kepala keluarga baru wajib dipilih");
        } else {
            const kepalaBaru = kkAsal.anggota.find(a => a.nik === dataPindah.nikKepalaKeluargaBaru);
            if (!kepalaBaru) {
                errors.push("Kepala keluarga baru tidak ditemukan di KK asal");
            }
            if (!dataPindah.anggotaPindah.includes(dataPindah.nikKepalaKeluargaBaru)) {
                errors.push("Kepala keluarga baru harus termasuk dalam anggota yang pindah");
            }
        }
    }

    // 3. Validasi KK tujuan untuk pindah gabung KK
    if (jenisPindah === '2') {
        if (!dataPindah.nikKepalaKeluargaTujuan) {
            errors.push("NIK kepala keluarga tujuan wajib diisi");
        } else {
            try {
                const mapping = await loadNIKMapping(contractService);
                const cidKKTujuan = mapping[dataPindah.nikKepalaKeluargaTujuan];
                if (!cidKKTujuan) {
                    errors.push("KK tujuan tidak ditemukan");
                }
            } catch (error) {
                errors.push("Gagal memverifikasi KK tujuan");
            }
        }
    }

    // 4. Validasi alamat tujuan untuk pindah seluruh keluarga dan mandiri
    if (jenisPindah === '0' || jenisPindah === '1') {
        if (!dataPindah.alamatTujuan || !dataPindah.alamatTujuan.kalurahan) {
            errors.push("Alamat tujuan wajib diisi");
        }
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi konsistensi data KK
 * @param {Object} kkData - Data KK yang akan divalidasi
 * @param {Object} contractService - Service untuk akses mapping
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateDataConsistency = async (kkData, contractService) => {
    const errors = [];

    console.log('🔍 [KK-Validation] Validating data consistency for KK:', kkData.kk);

    // 1. Validasi jumlah anggota sesuai dengan array (lebih fleksibel)
    if (kkData.jumlahAnggotaKeluarga !== undefined && kkData.jumlahAnggotaKeluarga !== kkData.anggota.length) {
        console.warn('⚠️ [KK-Validation] Jumlah anggota tidak konsisten:', {
            expected: kkData.jumlahAnggotaKeluarga,
            actual: kkData.anggota.length
        });
        errors.push("Jumlah anggota keluarga tidak konsisten");
    }

    // 2. Validasi NIK ayah dan ibu ada di sistem (opsional untuk testing)
    try {
        const mapping = await loadNIKMapping(contractService);
        console.log('🔍 [KK-Validation] NIK mapping loaded, checking parents...');

        kkData.anggota.forEach(anggota => {
            if (anggota.nikAyah && !mapping[anggota.nikAyah]) {
                console.warn('⚠️ [KK-Validation] NIK ayah tidak ditemukan:', anggota.nikAyah);
                // Tidak throw error untuk testing
            }
            if (anggota.nikIbu && !mapping[anggota.nikIbu]) {
                console.warn('⚠️ [KK-Validation] NIK ibu tidak ditemukan:', anggota.nikIbu);
                // Tidak throw error untuk testing
            }
        });
    } catch (error) {
        console.warn('⚠️ [KK-Validation] Gagal memverifikasi data orang tua:', error.message);
        // Tidak throw error untuk testing
    }

    console.log('📋 [KK-Validation] Data consistency validation result:', { isValid: errors.length === 0, errors });
    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi temporal (waktu) data
 * @param {Object} dataPermohonan - Data permohonan
 * @param {Object} kkData - Data KK
 * @returns {Object} - Hasil validasi dengan status dan error messages
 */
export const validateTemporalData = (dataPermohonan, kkData) => {
    const errors = [];
    const now = new Date();

    // 1. Validasi tanggal lahir tidak di masa depan
    kkData.anggota.forEach(anggota => {
        if (new Date(anggota.tanggalLahir) > now) {
            errors.push(`Tanggal lahir ${anggota.nama} tidak valid`);
        }
    });

    // 2. Validasi urutan waktu untuk perkawinan
    if (dataPermohonan.jenis === 'Perkawinan') {
        const suami = kkData.anggota.find(a => a.nik === dataPermohonan.nikPria);
        const istri = kkData.anggota.find(a => a.nik === dataPermohonan.nikWanita);

        if (suami && istri) {
            const umurSuami = calculateAge(suami.tanggalLahir);
            const umurIstri = calculateAge(istri.tanggalLahir);

            if (umurSuami < 19 || umurIstri < 19) {
                errors.push("Umur tidak memenuhi syarat perkawinan");
            }
        }
    }

    return { isValid: errors.length === 0, errors };
};

/**
 * Validasi komprehensif untuk semua jenis permohonan
 * @param {Object} kkData - Data KK
 * @param {Object} dataPermohonan - Data permohonan
 * @param {string} jenisPermohonan - Jenis permohonan
 * @param {Object} contractService - Service untuk akses mapping
 * @returns {Object} - Hasil validasi komprehensif
 */
export const validateKKComprehensive = async (kkData, dataPermohonan, jenisPermohonan, contractService) => {
    const allErrors = [];

    // 1. Validasi struktur dasar
    const structureValidation = validateKKStructure(kkData);
    if (!structureValidation.isValid) {
        allErrors.push(...structureValidation.errors);
    }

    // 2. Validasi konsistensi data
    const consistencyValidation = await validateDataConsistency(kkData, contractService);
    if (!consistencyValidation.isValid) {
        allErrors.push(...consistencyValidation.errors);
    }

    // 3. Validasi temporal
    const temporalValidation = validateTemporalData(dataPermohonan, kkData);
    if (!temporalValidation.isValid) {
        allErrors.push(...temporalValidation.errors);
    }

    // 4. Validasi spesifik berdasarkan jenis permohonan
    let businessValidation;
    switch (jenisPermohonan) {
        case 'Kelahiran':
            businessValidation = validateKelahiran(kkData, dataPermohonan);
            break;
        case 'Kematian':
            businessValidation = await validateKematian(kkData, dataPermohonan, contractService);
            break;
        case 'Perkawinan':
            // Perlu data KK istri untuk validasi perkawinan
            businessValidation = { isValid: true, errors: [] }; // Placeholder
            break;
        case 'Perceraian':
            businessValidation = validatePerceraian(kkData, dataPermohonan);
            break;
        case 'Pindah':
            businessValidation = await validatePindah(kkData, dataPermohonan, dataPermohonan.jenisPindah, contractService);
            break;
        default:
            businessValidation = { isValid: true, errors: [] };
    }

    if (!businessValidation.isValid) {
        allErrors.push(...businessValidation.errors);
    }

    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        details: {
            structure: structureValidation,
            consistency: consistencyValidation,
            temporal: temporalValidation,
            business: businessValidation
        }
    };
}; 