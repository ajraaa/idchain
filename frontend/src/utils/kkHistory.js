// KK History Management System
// Sistem manajemen riwayat perubahan KK untuk aplikasi IDChain

import { uploadToPinata } from './pinata.js';
import { encryptAes256CbcNodeStyle } from './crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

/**
 * Struktur riwayat perubahan KK
 */
export const KK_HISTORY_TYPES = {
    KELAHIRAN: 'Kelahiran',
    KEMATIAN: 'Kematian',
    PERKAWINAN: 'Perkawinan',
    PERCERAIAN: 'Perceraian',
    PINDAH_SELURUH: 'Pindah Seluruh Keluarga',
    PINDAH_MANDIRI: 'Pindah Mandiri',
    PINDAH_GABUNG: 'Pindah Gabung KK',
    UPDATE_ALAMAT: 'Update Alamat',
    UPDATE_DATA: 'Update Data'
};

/**
 * Generate UUID untuk nama file
 * @returns {string} - UUID string
 */
export const generateUUID = () => {
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

/**
 * Buat backup KK sebelum perubahan
 * @param {Object} kkData - Data KK yang akan dibackup
 * @param {string} alasanBackup - Alasan backup
 * @returns {Object} - Data backup dengan metadata
 */
export const createKKBackup = (kkData, alasanBackup) => {
    const backupData = {
        metadata: {
            timestamp: new Date().toISOString(),
            alasan: alasanBackup,
            version: "1.0",
            type: "KK_BACKUP"
        },
        kkData: JSON.parse(JSON.stringify(kkData)) // Deep copy
    };

    return backupData;
};

/**
 * Upload backup KK ke IPFS
 * @param {Object} backupData - Data backup
 * @returns {Promise<string>} - CID dari backup yang diupload
 */
export const uploadKKBackup = async (backupData) => {
    try {
        const encryptedBackup = await encryptAes256CbcNodeStyle(
            JSON.stringify(backupData),
            CRYPTO_CONFIG.SECRET_KEY
        );

        const fileName = `kk_backup_${generateUUID()}.json`;
        const cid = await uploadToPinata(encryptedBackup, fileName);

        console.log('✅ [KK-History] Backup uploaded successfully:', cid);
        return cid;
    } catch (error) {
        console.error('❌ [KK-History] Failed to upload backup:', error);
        throw new Error(`Gagal upload backup: ${error.message}`);
    }
};

/**
 * Buat entri riwayat perubahan
 * @param {Object} kkData - Data KK setelah perubahan
 * @param {string} jenisPerubahan - Jenis perubahan
 * @param {Object} detailPerubahan - Detail perubahan
 * @param {string|null} oldKKCID - CID KK lama (null untuk KK baru)
 * @param {string} newCID - CID KK baru
 * @returns {Object} - Entri riwayat
 */
export const createHistoryEntry = (kkData, jenisPerubahan, detailPerubahan, oldKKCID, newCID) => {
    const historyEntry = {
        timestamp: new Date().toISOString(),
        jenisPerubahan: jenisPerubahan,
        detailPerubahan: detailPerubahan,
        kkLamaCID: oldKKCID, // Bisa null untuk KK baru
        kkBaruCID: newCID,
        nomorKK: kkData.kk,
        jumlahAnggotaSebelum: detailPerubahan.jumlahAnggotaSebelum || 0,
        jumlahAnggotaSesudah: kkData.anggota.length,
        alamatSebelum: detailPerubahan.alamatSebelum || null,
        alamatSesudah: kkData.alamatLengkap || null,
        anggotaYangBerubah: detailPerubahan.anggotaYangBerubah || [],
        metadata: {
            version: "1.0",
            type: "KK_HISTORY_ENTRY"
        }
    };

    return historyEntry;
};

/**
 * Update riwayat KK dengan entri baru
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @param {Object} newEntry - Entri baru
 * @returns {Array} - Riwayat yang diupdate
 */
export const updateKKHistory = (existingHistory, newEntry) => {
    const updatedHistory = Array.isArray(existingHistory) ? [...existingHistory] : [];
    updatedHistory.push(newEntry);

    // Batasi riwayat ke 100 entri terakhir untuk efisiensi
    if (updatedHistory.length > 100) {
        updatedHistory.splice(0, updatedHistory.length - 100);
    }

    return updatedHistory;
};

/**
 * Upload riwayat KK ke IPFS
 * @param {Array} historyData - Data riwayat
 * @param {string} nomorKK - Nomor KK
 * @returns {Promise<string>} - CID dari riwayat yang diupload
 */
export const uploadKKHistory = async (historyData, nomorKK) => {
    try {
        const historyFile = {
            metadata: {
                nomorKK: nomorKK,
                timestamp: new Date().toISOString(),
                version: "1.0",
                type: "KK_HISTORY_FILE"
            },
            history: historyData
        };

        const encryptedHistory = await encryptAes256CbcNodeStyle(
            JSON.stringify(historyFile),
            CRYPTO_CONFIG.SECRET_KEY
        );

        const fileName = `kk_history_${nomorKK}_${generateUUID()}.json`;
        const cid = await uploadToPinata(encryptedHistory, fileName);

        console.log('✅ [KK-History] History uploaded successfully:', cid);
        return cid;
    } catch (error) {
        console.error('❌ [KK-History] Failed to upload history:', error);
        throw new Error(`Gagal upload riwayat: ${error.message}`);
    }
};

/**
 * Fungsi utama untuk update KK dengan riwayat
 * @param {Object} kkData - Data KK yang akan diupdate
 * @param {string} jenisPerubahan - Jenis perubahan
 * @param {Object} detailPerubahan - Detail perubahan
 * @param {string|null} oldKKCID - CID KK lama yang sudah ada di IPFS (null untuk KK baru)
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update dengan CID baru dan riwayat
 */
export const updateKKWithHistory = async (kkData, jenisPerubahan, detailPerubahan, oldKKCID = null, existingHistory = []) => {
    try {
        console.log('🔄 [KK-History] Starting KK update with history...');
        console.log('📋 [KK-History] Old KK CID:', oldKKCID || 'null (KK baru)');

        // 1. Upload KK baru (KK lama tidak perlu diupload ulang, gunakan CID yang ada)
        const encryptedKK = await encryptAes256CbcNodeStyle(
            JSON.stringify(kkData),
            CRYPTO_CONFIG.SECRET_KEY
        );

        const fileName = `${generateUUID()}.enc`;
        const newCID = await uploadToPinata(encryptedKK, fileName);
        console.log('✅ [KK-History] New KK uploaded:', newCID);

        // 2. Buat entri riwayat dengan CID KK lama yang sudah ada (atau null untuk KK baru)
        const historyEntry = createHistoryEntry(
            kkData,
            jenisPerubahan,
            detailPerubahan,
            oldKKCID, // Bisa null untuk KK baru
            newCID
        );

        // 3. Update riwayat
        const updatedHistory = updateKKHistory(existingHistory, historyEntry);

        // 4. Upload riwayat yang diupdate
        const historyCID = await uploadKKHistory(updatedHistory, kkData.kk);
        console.log('✅ [KK-History] History updated:', historyCID);

        return {
            success: true,
            newKKCID: newCID,
            oldKKCID: oldKKCID, // Return CID KK lama untuk referensi (atau null)
            historyCID: historyCID,
            historyEntry: historyEntry,
            updatedHistory: updatedHistory,
            newKKData: kkData // Return data KK baru untuk referensi
        };

    } catch (error) {
        console.error('❌ [KK-History] Error updating KK with history:', error);
        throw new Error(`Gagal update KK dengan riwayat: ${error.message}`);
    }
};

/**
 * Fungsi khusus untuk update KK kelahiran
 * @param {Object} kkAsal - KK asal
 * @param {Object} dataAnak - Data anak yang akan ditambahkan
 * @param {string} oldKKCID - CID KK lama
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update
 */
export const updateKKKelahiran = async (kkAsal, dataAnak, oldKKCID, existingHistory = []) => {
    console.log('🔍 [KK-History] Creating new KK for kelahiran with data:', JSON.stringify(dataAnak, null, 2));

    // Generate NIK valid untuk anak baru lahir jika belum ada
    const nikAnak = dataAnak.nik || generateNIKFromKelahiran(dataAnak);
    console.log('🔍 [KK-History] Generated NIK for child:', nikAnak);

    // Buat KK baru dengan anak
    const kkBaru = {
        ...kkAsal,
        anggota: [...kkAsal.anggota, {
            nik: nikAnak,
            nama: dataAnak.namaAnak,
            tempatLahir: dataAnak.tempatLahir,
            tanggalLahir: dataAnak.tanggalLahir,
            jenisKelamin: dataAnak.jenisKelamin || 'L', // Default jika tidak ada
            agama: dataAnak.agama || 'Islam',
            pendidikan: dataAnak.pendidikan || 'BELUM TAMAT SD/SEDERAJAT',
            jenisPekerjaan: dataAnak.jenisPekerjaan || 'BELUM/TIDAK BEKERJA',
            statusPernikahan: 'BELUM KAWIN', // Gunakan statusPernikahan bukan statusPerkawinan
            statusHubunganKeluarga: 'ANAK',
            kewarganegaraan: 'WNI',
            nikAyah: dataAnak.nikAyah,
            nikIbu: dataAnak.nikIbu
        }],
        jumlahAnggotaKeluarga: kkAsal.anggota.length + 1
    };

    console.log('🔍 [KK-History] New KK created:', JSON.stringify(kkBaru, null, 2));

    const detailPerubahan = {
        jumlahAnggotaSebelum: kkAsal.anggota.length,
        anggotaYangBerubah: [{
            nik: nikAnak,
            nama: dataAnak.namaAnak,
            aksi: 'TAMBAH',
            alasan: 'Kelahiran',
            tanggalLahir: dataAnak.tanggalLahir,
            tempatLahir: dataAnak.tempatLahir
        }],
        alamatSebelum: kkAsal.alamatLengkap,
        alamatSesudah: kkBaru.alamatLengkap
    };

    return await updateKKWithHistory(kkBaru, KK_HISTORY_TYPES.KELAHIRAN, detailPerubahan, oldKKCID, existingHistory);
};

/**
 * Fungsi khusus untuk update KK kematian
 * @param {Object} kkAsal - KK asal
 * @param {Object} dataKematian - Data kematian
 * @param {string} oldKKCID - CID KK lama
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update
 */
export const updateKKKematian = async (kkAsal, dataKematian, oldKKCID, existingHistory = []) => {
    // Hapus anggota yang meninggal
    const anggotaBaru = kkAsal.anggota.filter(anggota => anggota.nik !== dataKematian.nikAlmarhum);

    const kkBaru = {
        ...kkAsal,
        anggota: anggotaBaru,
        jumlahAnggotaKeluarga: anggotaBaru.length
    };

    const almarhum = kkAsal.anggota.find(a => a.nik === dataKematian.nikAlmarhum);

    const detailPerubahan = {
        jumlahAnggotaSebelum: kkAsal.anggota.length,
        anggotaYangBerubah: [{
            nik: dataKematian.nikAlmarhum,
            nama: almarhum?.nama || 'Tidak diketahui',
            aksi: 'HAPUS',
            alasan: 'Kematian',
            tanggalKematian: dataKematian.tanggalKematian,
            penyebabKematian: dataKematian.penyebabKematian
        }],
        alamatSebelum: kkAsal.alamatLengkap,
        alamatSesudah: kkBaru.alamatLengkap
    };

    return await updateKKWithHistory(kkBaru, KK_HISTORY_TYPES.KEMATIAN, detailPerubahan, oldKKCID, existingHistory);
};

/**
 * Fungsi khusus untuk update KK perkawinan
 * @param {Object} kkSuami - KK suami
 * @param {Object} kkIstri - KK istri
 * @param {Object} dataPerkawinan - Data perkawinan
 * @param {string} oldKKSuamiCID - CID KK suami lama
 * @param {string} oldKKIstriCID - CID KK istri lama
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update untuk kedua KK
 */
export const updateKKPerkawinan = async (kkSuami, kkIstri, dataPerkawinan, oldKKSuamiCID, oldKKIstriCID, existingHistory = []) => {
    // Hapus suami dari KK asalnya
    const kkSuamiBaru = {
        ...kkSuami,
        anggota: kkSuami.anggota.filter(anggota => anggota.nik !== dataPerkawinan.nikPria),
        jumlahAnggotaKeluarga: kkSuami.anggota.length - 1
    };

    // Hapus istri dari KK asalnya
    const kkIstriBaru = {
        ...kkIstri,
        anggota: kkIstri.anggota.filter(anggota => anggota.nik !== dataPerkawinan.nikWanita),
        jumlahAnggotaKeluarga: kkIstri.anggota.length - 1
    };

    // Buat KK baru untuk pasangan
    const suami = kkSuami.anggota.find(a => a.nik === dataPerkawinan.nikPria);
    const istri = kkIstri.anggota.find(a => a.nik === dataPerkawinan.nikWanita);

    const kkBaru = {
        kk: `KK_${generateUUID().substring(0, 8)}`,
        alamatLengkap: kkSuami.alamatLengkap, // Gunakan alamat suami
        anggota: [
            {
                ...suami,
                statusPerkawinan: 'Kawin',
                statusHubunganKeluarga: 'KEPALA KELUARGA'
            },
            {
                ...istri,
                statusPerkawinan: 'Kawin',
                statusHubunganKeluarga: 'ISTRI'
            }
        ],
        jumlahAnggotaKeluarga: 2
    };

    // Update kedua KK lama
    const updateSuami = await updateKKWithHistory(
        kkSuamiBaru,
        KK_HISTORY_TYPES.PERKAWINAN,
        {
            jumlahAnggotaSebelum: kkSuami.anggota.length,
            anggotaYangBerubah: [{
                nik: dataPerkawinan.nikPria,
                nama: suami?.nama || 'Tidak diketahui',
                aksi: 'PINDAH',
                alasan: 'Perkawinan - Membuat KK baru'
            }]
        },
        oldKKSuamiCID,
        existingHistory
    );

    const updateIstri = await updateKKWithHistory(
        kkIstriBaru,
        KK_HISTORY_TYPES.PERKAWINAN,
        {
            jumlahAnggotaSebelum: kkIstri.anggota.length,
            anggotaYangBerubah: [{
                nik: dataPerkawinan.nikWanita,
                nama: istri?.nama || 'Tidak diketahui',
                aksi: 'PINDAH',
                alasan: 'Perkawinan - Gabung ke KK suami'
            }]
        },
        oldKKIstriCID,
        existingHistory
    );

    // Upload KK baru (tidak ada KK lama untuk KK baru)
    const updateKKBaru = await updateKKWithHistory(
        kkBaru,
        KK_HISTORY_TYPES.PERKAWINAN,
        {
            jumlahAnggotaSebelum: 0,
            anggotaYangBerubah: [
                {
                    nik: dataPerkawinan.nikPria,
                    nama: suami?.nama || 'Tidak diketahui',
                    aksi: 'TAMBAH',
                    alasan: 'Perkawinan - Kepala keluarga baru'
                },
                {
                    nik: dataPerkawinan.nikWanita,
                    nama: istri?.nama || 'Tidak diketahui',
                    aksi: 'TAMBAH',
                    alasan: 'Perkawinan - Istri'
                }
            ]
        },
        null // oldKKCID untuk KK baru
    );

    return {
        success: true,
        kkSuamiUpdate: updateSuami,
        kkIstriUpdate: updateIstri,
        kkBaru: updateKKBaru
    };
};

/**
 * Fungsi khusus untuk update KK perceraian
 * @param {Object} kkAsal - KK asal
 * @param {Object} dataPerceraian - Data perceraian
 * @param {string} oldKKCID - CID KK lama
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update untuk kedua KK
 */
export const updateKKPerceraian = async (kkAsal, dataPerceraian, oldKKCID, existingHistory = []) => {
    const suami = kkAsal.anggota.find(a => a.nik === dataPerceraian.nikSuami);
    const istri = kkAsal.anggota.find(a => a.nik === dataPerceraian.nikIstri);

    // KK mantan suami (tetap di alamat yang sama)
    const kkSuamiBaru = {
        ...kkAsal,
        anggota: kkAsal.anggota.filter(anggota => anggota.nik !== dataPerceraian.nikIstri),
        jumlahAnggotaKeluarga: kkAsal.anggota.length - 1
    };

    // KK mantan istri (buat KK baru)
    const kkIstriBaru = {
        kk: `KK_${generateUUID().substring(0, 8)}`,
        alamatLengkap: kkAsal.alamatLengkap, // Bisa diubah sesuai kesepakatan
        anggota: [
            {
                ...istri,
                statusPerkawinan: 'Cerai Hidup',
                statusHubunganKeluarga: 'KEPALA KELUARGA'
            }
        ],
        jumlahAnggotaKeluarga: 1
    };

    // Update KK mantan suami
    const updateSuami = await updateKKWithHistory(
        kkSuamiBaru,
        KK_HISTORY_TYPES.PERCERAIAN,
        {
            jumlahAnggotaSebelum: kkAsal.anggota.length,
            anggotaYangBerubah: [{
                nik: dataPerceraian.nikIstri,
                nama: istri?.nama || 'Tidak diketahui',
                aksi: 'PINDAH',
                alasan: 'Perceraian - Membuat KK terpisah'
            }]
        },
        oldKKCID,
        existingHistory
    );

    // Upload KK mantan istri (tidak ada KK lama untuk KK baru)
    const updateIstri = await updateKKWithHistory(
        kkIstriBaru,
        KK_HISTORY_TYPES.PERCERAIAN,
        {
            jumlahAnggotaSebelum: 0,
            anggotaYangBerubah: [{
                nik: dataPerceraian.nikIstri,
                nama: istri?.nama || 'Tidak diketahui',
                aksi: 'TAMBAH',
                alasan: 'Perceraian - Kepala keluarga baru'
            }]
        },
        null // oldKKCID untuk KK baru
    );

    return {
        success: true,
        kkSuamiUpdate: updateSuami,
        kkIstriBaru: updateIstri
    };
};

/**
 * Fungsi khusus untuk update KK pindah
 * @param {Object} kkAsal - KK asal
 * @param {Object} dataPindah - Data pindah
 * @param {string} jenisPindah - Jenis pindah
 * @param {string} oldKKCID - CID KK lama
 * @param {Array} existingHistory - Riwayat yang sudah ada
 * @returns {Promise<Object>} - Hasil update
 */
export const updateKKPindah = async (kkAsal, dataPindah, jenisPindah, oldKKCID, existingHistory = []) => {
    switch (jenisPindah) {
        case '0': // Pindah seluruh keluarga
            return await updateKKPindahSeluruhKeluarga(kkAsal, dataPindah, oldKKCID, existingHistory);
        case '1': // Pindah mandiri
            return await updateKKPindahMandiri(kkAsal, dataPindah, oldKKCID, existingHistory);
        case '2': // Pindah gabung KK
            return await updateKKPindahGabung(kkAsal, dataPindah, oldKKCID, existingHistory);
        default:
            throw new Error('Jenis pindah tidak valid');
    }
};

/**
 * Update KK pindah seluruh keluarga
 */
const updateKKPindahSeluruhKeluarga = async (kkAsal, dataPindah, oldKKCID, existingHistory) => {
    const kkBaru = {
        ...kkAsal,
        alamatLengkap: dataPindah.alamatTujuan
    };

    const detailPerubahan = {
        jumlahAnggotaSebelum: kkAsal.anggota.length,
        anggotaYangBerubah: kkAsal.anggota.map(anggota => ({
            nik: anggota.nik,
            nama: anggota.nama,
            aksi: 'PINDAH_ALAMAT',
            alasan: 'Pindah seluruh keluarga'
        })),
        alamatSebelum: kkAsal.alamatLengkap,
        alamatSesudah: kkBaru.alamatLengkap
    };

    return await updateKKWithHistory(kkBaru, KK_HISTORY_TYPES.PINDAH_SELURUH, detailPerubahan, oldKKCID, existingHistory);
};

/**
 * Update KK pindah mandiri
 */
const updateKKPindahMandiri = async (kkAsal, dataPindah, oldKKCID, existingHistory) => {
    // KK asal (setelah anggota pindah)
    const anggotaTinggal = kkAsal.anggota.filter(anggota =>
        !dataPindah.anggotaPindah.includes(anggota.nik)
    );

    const kkAsalBaru = {
        ...kkAsal,
        anggota: anggotaTinggal,
        jumlahAnggotaKeluarga: anggotaTinggal.length
    };

    // KK baru untuk anggota yang pindah
    const anggotaPindah = kkAsal.anggota.filter(anggota =>
        dataPindah.anggotaPindah.includes(anggota.nik)
    );

    const kepalaKeluargaBaru = anggotaPindah.find(a => a.nik === dataPindah.nikKepalaKeluargaBaru);

    const kkBaru = {
        kk: `KK_${generateUUID().substring(0, 8)}`,
        alamatLengkap: dataPindah.alamatTujuan,
        anggota: anggotaPindah.map(anggota => ({
            ...anggota,
            statusHubunganKeluarga: anggota.nik === dataPindah.nikKepalaKeluargaBaru ? 'KEPALA KELUARGA' : anggota.statusHubunganKeluarga
        })),
        jumlahAnggotaKeluarga: anggotaPindah.length
    };

    // Update KK asal
    const updateKKAsal = await updateKKWithHistory(
        kkAsalBaru,
        KK_HISTORY_TYPES.PINDAH_MANDIRI,
        {
            jumlahAnggotaSebelum: kkAsal.anggota.length,
            anggotaYangBerubah: anggotaPindah.map(anggota => ({
                nik: anggota.nik,
                nama: anggota.nama,
                aksi: 'PINDAH',
                alasan: 'Pindah mandiri - Membuat KK baru'
            }))
        },
        oldKKCID,
        existingHistory
    );

    // Upload KK baru (tidak ada KK lama untuk KK baru)
    const updateKKBaru = await updateKKWithHistory(
        kkBaru,
        KK_HISTORY_TYPES.PINDAH_MANDIRI,
        {
            jumlahAnggotaSebelum: 0,
            anggotaYangBerubah: anggotaPindah.map(anggota => ({
                nik: anggota.nik,
                nama: anggota.nama,
                aksi: 'TAMBAH',
                alasan: 'Pindah mandiri - KK baru'
            }))
        },
        null // oldKKCID untuk KK baru
    );

    return {
        success: true,
        kkAsalUpdate: updateKKAsal,
        kkBaru: updateKKBaru
    };
};

/**
 * Update KK pindah gabung
 */
const updateKKPindahGabung = async (kkAsal, dataPindah, oldKKCID, existingHistory) => {
    // KK asal (setelah anggota pindah)
    const anggotaTinggal = kkAsal.anggota.filter(anggota =>
        !dataPindah.anggotaPindah.includes(anggota.nik)
    );

    const kkAsalBaru = {
        ...kkAsal,
        anggota: anggotaTinggal,
        jumlahAnggotaKeluarga: anggotaTinggal.length
    };

    const anggotaPindah = kkAsal.anggota.filter(anggota =>
        dataPindah.anggotaPindah.includes(anggota.nik)
    );

    // Update KK asal
    const updateKKAsal = await updateKKWithHistory(
        kkAsalBaru,
        KK_HISTORY_TYPES.PINDAH_GABUNG,
        {
            jumlahAnggotaSebelum: kkAsal.anggota.length,
            anggotaYangBerubah: anggotaPindah.map(anggota => ({
                nik: anggota.nik,
                nama: anggota.nama,
                aksi: 'PINDAH',
                alasan: 'Pindah gabung KK'
            }))
        },
        oldKKCID,
        existingHistory
    );

    return {
        success: true,
        kkAsalUpdate: updateKKAsal,
        anggotaPindah: anggotaPindah // Untuk diproses di KK tujuan
    };
};

/**
 * Load riwayat KK dari IPFS
 * @param {string} historyCID - CID riwayat
 * @param {Object} contractService - Service untuk dekripsi
 * @returns {Promise<Array>} - Data riwayat
 */
export const loadKKHistory = async (historyCID, contractService) => {
    try {
        // Implementasi load dan dekripsi riwayat
        // Ini akan diimplementasikan sesuai dengan struktur yang ada
        console.log('📋 [KK-History] Loading history from CID:', historyCID);
        return [];
    } catch (error) {
        console.error('❌ [KK-History] Failed to load history:', error);
        return [];
    }
};

/**
 * Generate NIK valid untuk anak baru lahir
 * Format NIK: PPKKDDMMYYXXXX
 * PP = Kode Provinsi (2 digit)
 * KK = Kode Kabupaten/Kota (2 digit)  
 * DD = Tanggal lahir (2 digit)
 * MM = Bulan lahir (2 digit)
 * YY = Tahun lahir (2 digit)
 * XXXX = Nomor urut (4 digit)
 * @param {string} tanggalLahir - Tanggal lahir dalam format YYYY-MM-DD
 * @param {string} kodeProvinsi - Kode provinsi (default: 34 untuk DIY)
 * @param {string} kodeKabupaten - Kode kabupaten (default: 01 untuk Sleman)
 * @returns {string} - NIK yang digenerate
 */
export const generateNIK = (tanggalLahir, kodeProvinsi = '34', kodeKabupaten = '01') => {
    try {
        console.log('🔍 [KK-History] Generating NIK for:', { tanggalLahir, kodeProvinsi, kodeKabupaten });

        // Parse tanggal lahir
        const date = new Date(tanggalLahir);
        const tanggal = date.getDate().toString().padStart(2, '0');
        const bulan = (date.getMonth() + 1).toString().padStart(2, '0');
        const tahun = date.getFullYear().toString().slice(-2); // Ambil 2 digit terakhir

        // Generate nomor urut random (4 digit)
        const nomorUrut = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

        // Gabungkan semua komponen
        const nik = `${kodeProvinsi}${kodeKabupaten}${tanggal}${bulan}${tahun}${nomorUrut}`;

        console.log('✅ [KK-History] Generated NIK:', nik);
        console.log('📋 [KK-History] NIK breakdown:', {
            kodeProvinsi,
            kodeKabupaten,
            tanggal,
            bulan,
            tahun,
            nomorUrut,
            totalLength: nik.length
        });

        return nik;
    } catch (error) {
        console.error('❌ [KK-History] Error generating NIK:', error);
        // Fallback ke NIK sementara jika ada error
        return `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

/**
 * Generate NIK berdasarkan data kelahiran
 * @param {Object} dataAnak - Data anak yang baru lahir
 * @returns {string} - NIK yang digenerate
 */
export const generateNIKFromKelahiran = (dataAnak) => {
    try {
        console.log('🔍 [KK-History] Generating NIK from kelahiran data:', JSON.stringify(dataAnak, null, 2));

        // Tentukan kode provinsi dan kabupaten berdasarkan tempat lahir
        let kodeProvinsi = '34'; // Default: DIY
        let kodeKabupaten = '01'; // Default: Sleman

        // Mapping tempat lahir ke kode (bisa diperluas)
        const tempatLahir = dataAnak.tempatLahir?.toLowerCase() || '';

        if (tempatLahir.includes('sleman')) {
            kodeProvinsi = '34';
            kodeKabupaten = '01';
        } else if (tempatLahir.includes('yogyakarta') || tempatLahir.includes('yogya')) {
            kodeProvinsi = '34';
            kodeKabupaten = '02';
        } else if (tempatLahir.includes('bantul')) {
            kodeProvinsi = '34';
            kodeKabupaten = '03';
        } else if (tempatLahir.includes('kulon progo') || tempatLahir.includes('kulonprogo')) {
            kodeProvinsi = '34';
            kodeKabupaten = '04';
        } else if (tempatLahir.includes('gunung kidul') || tempatLahir.includes('gunungkidul')) {
            kodeProvinsi = '34';
            kodeKabupaten = '05';
        }
        // Bisa ditambahkan mapping untuk provinsi lain

        const nik = generateNIK(dataAnak.tanggalLahir, kodeProvinsi, kodeKabupaten);

        console.log('✅ [KK-History] Generated NIK from kelahiran:', nik);
        return nik;

    } catch (error) {
        console.error('❌ [KK-History] Error generating NIK from kelahiran:', error);
        // Fallback ke NIK sementara
        return `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}; 