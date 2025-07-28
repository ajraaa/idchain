// KK Update Manager
// Manager untuk mengintegrasikan validasi dan riwayat perubahan KK

import { validateKKComprehensive } from './kkValidation.js';
import {
    updateKKKelahiran,
    updateKKKematian,
    updateKKPerkawinan,
    updateKKPerceraian,
    updateKKPindah,
    updateKKWithHistory,
    KK_HISTORY_TYPES
} from './kkHistory.js';
import { loadNIKMapping, fetchFromIPFS, uploadToPinata } from './ipfs.js';
import { decryptAes256CbcNodeStyle, encryptAes256CbcNodeStyle } from './crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

/**
 * Manager utama untuk update KK setelah permohonan disetujui Dukcapil
 */
export class KKUpdateManager {
    constructor(contractService) {
        this.contractService = contractService;
    }

    /**
     * Load KK data dari IPFS berdasarkan NIK
     * @param {string} nik - NIK anggota keluarga
     * @returns {Promise<Object>} - Data KK
     */
    async loadKKByNIK(nik) {
        try {
            console.log('🔄 [KK-Update] Loading KK data for NIK:', nik);

            const mapping = await loadNIKMapping(this.contractService);
            const cid = mapping[nik];

            if (!cid) {
                throw new Error(`NIK ${nik} tidak ditemukan di sistem`);
            }

            const encryptedData = await fetchFromIPFS(cid);
            const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);

            // Parse JSON jika masih string
            let kkData = decryptedData;
            if (typeof decryptedData === 'string') {
                try {
                    kkData = JSON.parse(decryptedData);
                } catch (error) {
                    throw new Error('Gagal parse data KK');
                }
            }

            console.log('✅ [KK-Update] KK data loaded successfully');
            return kkData;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to load KK data:', error);
            throw error;
        }
    }

    /**
     * Load data permohonan dari IPFS
     * @param {string} cidIPFS - CID data permohonan
     * @returns {Promise<Object>} - Data permohonan
     */
    async loadPermohonanData(cidIPFS) {
        try {
            console.log('🔄 [KK-Update] Loading permohonan data from CID:', cidIPFS);

            const encryptedData = await fetchFromIPFS(cidIPFS);
            const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);

            let permohonanData = decryptedData;
            if (typeof decryptedData === 'string') {
                try {
                    permohonanData = JSON.parse(decryptedData);
                } catch (error) {
                    throw new Error('Gagal parse data permohonan');
                }
            }

            console.log('✅ [KK-Update] Permohonan data loaded successfully');
            return permohonanData;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to load permohonan data:', error);
            throw error;
        }
    }

    /**
     * Update mapping NIK setelah perubahan KK
     * @param {Object} mapping - Mapping yang sudah ada
     * @param {Array} nikList - List NIK yang perlu diupdate
     * @param {string} newCID - CID baru
     * @returns {Promise<Object>} - Mapping yang diupdate
     */
    async updateNIKMapping(mapping, nikList, newCID) {
        try {
            console.log('🔄 [KK-Update] Updating NIK mapping for:', nikList);

            const updatedMapping = { ...mapping };
            nikList.forEach(nik => {
                updatedMapping[nik] = newCID;
            });

            // Upload mapping baru ke IPFS
            const encryptedMapping = await encryptAes256CbcNodeStyle(
                JSON.stringify(updatedMapping),
                CRYPTO_CONFIG.SECRET_KEY
            );

            const fileName = `nik_mapping_${new Date().toISOString().split('T')[0]}.json`;
            const mappingCID = await uploadToPinata(encryptedMapping, fileName);

            console.log('✅ [KK-Update] NIK mapping uploaded to IPFS:', mappingCID);
            return updatedMapping;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to update NIK mapping:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk permohonan kelahiran
     * @param {Object} permohonanData - Data permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processKelahiran(permohonanData) {
        try {
            console.log('🔄 [KK-Update] Processing kelahiran...');

            const dataKelahiran = permohonanData.dataKelahiran;

            // Load KK ayah atau ibu
            const kkAsal = await this.loadKKByNIK(dataKelahiran.nikAyah);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKCID = mapping[dataKelahiran.nikAyah];

            // Validasi data
            const validation = await validateKKComprehensive(
                kkAsal,
                dataKelahiran,
                'Kelahiran',
                this.contractService
            );

            if (!validation.isValid) {
                throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
            }

            // Update KK dengan riwayat
            const result = await updateKKKelahiran(kkAsal, dataKelahiran, oldKKCID);

            // Update mapping NIK
            const nikList = kkAsal.anggota.map(a => a.nik).concat([dataKelahiran.nik]);
            await this.updateNIKMapping(mapping, nikList, result.newKKCID);

            console.log('✅ [KK-Update] Kelahiran processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process kelahiran:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk permohonan kematian
     * @param {Object} permohonanData - Data permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processKematian(permohonanData) {
        try {
            console.log('🔄 [KK-Update] Processing kematian...');

            const dataKematian = permohonanData.dataKematian;

            // Load KK almarhum
            const kkAsal = await this.loadKKByNIK(dataKematian.nikAlmarhum);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKCID = mapping[dataKematian.nikAlmarhum];

            // Validasi data
            const validation = await validateKKComprehensive(
                kkAsal,
                dataKematian,
                'Kematian',
                this.contractService
            );

            if (!validation.isValid) {
                throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
            }

            // Update KK dengan riwayat
            const result = await updateKKKematian(kkAsal, dataKematian, oldKKCID);

            // Update mapping NIK
            const nikList = kkAsal.anggota.filter(a => a.nik !== dataKematian.nikAlmarhum).map(a => a.nik);
            await this.updateNIKMapping(mapping, nikList, result.newKKCID);

            console.log('✅ [KK-Update] Kematian processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process kematian:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk permohonan perkawinan
     * @param {Object} permohonanData - Data permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processPerkawinan(permohonanData) {
        try {
            console.log('🔄 [KK-Update] Processing perkawinan...');

            const dataPerkawinan = permohonanData.dataPerkawinan;

            // Load KK suami dan istri
            const kkSuami = await this.loadKKByNIK(dataPerkawinan.nikPria);
            const kkIstri = await this.loadKKByNIK(dataPerkawinan.nikWanita);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKSuamiCID = mapping[dataPerkawinan.nikPria];
            const oldKKIstriCID = mapping[dataPerkawinan.nikWanita];

            // Validasi data (perlu implementasi khusus untuk perkawinan)
            // const validation = await validateKKComprehensive(...);

            // Update KK dengan riwayat
            const result = await updateKKPerkawinan(kkSuami, kkIstri, dataPerkawinan, oldKKSuamiCID, oldKKIstriCID);

            // Update mapping NIK untuk semua KK yang terpengaruh
            const nikListSuami = kkSuami.anggota.filter(a => a.nik !== dataPerkawinan.nikPria).map(a => a.nik);
            const nikListIstri = kkIstri.anggota.filter(a => a.nik !== dataPerkawinan.nikWanita).map(a => a.nik);
            const nikListBaru = [dataPerkawinan.nikPria, dataPerkawinan.nikWanita];

            await this.updateNIKMapping(mapping, nikListSuami, result.kkSuamiUpdate.newKKCID);
            await this.updateNIKMapping(mapping, nikListIstri, result.kkIstriUpdate.newKKCID);
            await this.updateNIKMapping(mapping, nikListBaru, result.kkBaru.newKKCID);

            console.log('✅ [KK-Update] Perkawinan processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process perkawinan:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk permohonan perceraian
     * @param {Object} permohonanData - Data permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processPerceraian(permohonanData) {
        try {
            console.log('🔄 [KK-Update] Processing perceraian...');

            const dataPerceraian = permohonanData.dataPerceraian;

            // Load KK suami
            const kkAsal = await this.loadKKByNIK(dataPerceraian.nikSuami);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKCID = mapping[dataPerceraian.nikSuami];

            // Validasi data
            const validation = await validateKKComprehensive(
                kkAsal,
                dataPerceraian,
                'Perceraian',
                this.contractService
            );

            if (!validation.isValid) {
                throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
            }

            // Update KK dengan riwayat
            const result = await updateKKPerceraian(kkAsal, dataPerceraian, oldKKCID);

            // Update mapping NIK
            const nikListSuami = kkAsal.anggota.filter(a => a.nik !== dataPerceraian.nikIstri).map(a => a.nik);
            const nikListIstri = [dataPerceraian.nikIstri];

            await this.updateNIKMapping(mapping, nikListSuami, result.kkSuamiUpdate.newKKCID);
            await this.updateNIKMapping(mapping, nikListIstri, result.kkIstriBaru.newKKCID);

            console.log('✅ [KK-Update] Perceraian processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process perceraian:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk permohonan pindah
     * @param {Object} permohonanData - Data permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processPindah(permohonanData) {
        try {
            console.log('🔄 [KK-Update] Processing pindah...');

            const dataPindah = permohonanData.dataPindah;
            const jenisPindah = permohonanData.metadata.jenisPindah;

            // Load KK asal
            const kkAsal = await this.loadKKByNIK(dataPindah.anggotaPindah[0]);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKCID = mapping[dataPindah.anggotaPindah[0]];

            // Validasi data
            const validation = await validateKKComprehensive(
                kkAsal,
                dataPindah,
                'Pindah',
                this.contractService
            );

            if (!validation.isValid) {
                throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
            }

            // Update KK dengan riwayat
            const result = await updateKKPindah(kkAsal, dataPindah, jenisPindah, oldKKCID);

            // Update mapping NIK sesuai jenis pindah
            if (jenisPindah === '0') { // Pindah seluruh keluarga
                const nikList = kkAsal.anggota.map(a => a.nik);
                await this.updateNIKMapping(mapping, nikList, result.newKKCID);
            } else if (jenisPindah === '1') { // Pindah mandiri
                const nikListTinggal = kkAsal.anggota.filter(a => !dataPindah.anggotaPindah.includes(a.nik)).map(a => a.nik);
                const nikListPindah = dataPindah.anggotaPindah;

                await this.updateNIKMapping(mapping, nikListTinggal, result.kkAsalUpdate.newKKCID);
                await this.updateNIKMapping(mapping, nikListPindah, result.kkBaru.newKKCID);
            } else if (jenisPindah === '2') { // Pindah gabung KK
                const nikListTinggal = kkAsal.anggota.filter(a => !dataPindah.anggotaPindah.includes(a.nik)).map(a => a.nik);
                await this.updateNIKMapping(mapping, nikListTinggal, result.kkAsalUpdate.newKKCID);
                // KK tujuan akan diupdate terpisah
            }

            console.log('✅ [KK-Update] Pindah processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process pindah:', error);
            throw error;
        }
    }

    /**
     * Proses update KK untuk pindah gabung KK (update KK tujuan)
     * @param {string} nikKepalaKeluargaTujuan - NIK kepala keluarga tujuan
     * @param {Array} anggotaPindah - Data anggota yang pindah
     * @returns {Promise<Object>} - Hasil update
     */
    async processPindahGabungKKTujuan(nikKepalaKeluargaTujuan, anggotaPindah) {
        try {
            console.log('🔄 [KK-Update] Processing pindah gabung KK tujuan...');

            // Load KK tujuan
            const kkTujuan = await this.loadKKByNIK(nikKepalaKeluargaTujuan);

            // Dapatkan CID KK lama dari mapping
            const mapping = await loadNIKMapping(this.contractService);
            const oldKKCID = mapping[nikKepalaKeluargaTujuan];

            // Tambahkan anggota yang pindah ke KK tujuan
            const kkTujuanBaru = {
                ...kkTujuan,
                anggota: [...kkTujuan.anggota, ...anggotaPindah],
                jumlahAnggotaKeluarga: kkTujuan.anggota.length + anggotaPindah.length
            };

            // Update KK tujuan dengan riwayat
            const detailPerubahan = {
                jumlahAnggotaSebelum: kkTujuan.anggota.length,
                anggotaYangBerubah: anggotaPindah.map(anggota => ({
                    nik: anggota.nik,
                    nama: anggota.nama,
                    aksi: 'TAMBAH',
                    alasan: 'Pindah gabung KK'
                }))
            };

            const result = await updateKKWithHistory(
                kkTujuanBaru,
                KK_HISTORY_TYPES.PINDAH_GABUNG,
                detailPerubahan,
                oldKKCID
            );

            // Update mapping NIK
            const nikList = kkTujuan.anggota.map(a => a.nik).concat(anggotaPindah.map(a => a.nik));
            await this.updateNIKMapping(mapping, nikList, result.newKKCID);

            console.log('✅ [KK-Update] Pindah gabung KK tujuan processed successfully');
            return result;
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process pindah gabung KK tujuan:', error);
            throw error;
        }
    }

    /**
     * Main function untuk memproses update KK berdasarkan jenis permohonan
     * @param {Object} permohonanData - Data permohonan dari IPFS
     * @param {string} jenisPermohonan - Jenis permohonan
     * @returns {Promise<Object>} - Hasil update
     */
    async processKKUpdate(permohonanData, jenisPermohonan) {
        try {
            console.log('🔄 [KK-Update] Starting KK update process for:', jenisPermohonan);

            switch (jenisPermohonan) {
                case 'Kelahiran':
                    return await this.processKelahiran(permohonanData);
                case 'Kematian':
                    return await this.processKematian(permohonanData);
                case 'Perkawinan':
                    return await this.processPerkawinan(permohonanData);
                case 'Perceraian':
                    return await this.processPerceraian(permohonanData);
                case 'Pindah':
                    return await this.processPindah(permohonanData);
                default:
                    throw new Error(`Jenis permohonan tidak didukung: ${jenisPermohonan}`);
            }
        } catch (error) {
            console.error('❌ [KK-Update] Failed to process KK update:', error);
            throw error;
        }
    }

    /**
     * Validasi dan update KK dalam satu proses
     * @param {string} cidIPFS - CID data permohonan
     * @param {string} jenisPermohonan - Jenis permohonan
     * @returns {Promise<Object>} - Hasil validasi dan update
     */
    async validateAndUpdateKK(cidIPFS, jenisPermohonan) {
        try {
            console.log('🔄 [KK-Update] Starting validate and update process...');

            // Load data permohonan
            const permohonanData = await this.loadPermohonanData(cidIPFS);

            // Proses update KK
            const result = await this.processKKUpdate(permohonanData, jenisPermohonan);

            console.log('✅ [KK-Update] Validate and update completed successfully');
            return {
                success: true,
                result: result,
                permohonanData: permohonanData
            };
        } catch (error) {
            console.error('❌ [KK-Update] Validate and update failed:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }
}

/**
 * Factory function untuk membuat KKUpdateManager
 * @param {Object} contractService - Service kontrak
 * @returns {KKUpdateManager} - Instance KKUpdateManager
 */
export const createKKUpdateManager = (contractService) => {
    return new KKUpdateManager(contractService);
}; 