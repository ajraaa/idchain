// Test file untuk sistem riwayat perubahan KK
// Contoh penggunaan dan testing

import {
    createKKBackup,
    createHistoryEntry,
    updateKKHistory,
    KK_HISTORY_TYPES,
    generateUUID
} from './kkHistory.js';

// Import test data dari validation test
import { testData } from './kkValidation.test.js';

// Mock functions untuk testing
const mockUploadToPinata = async (data, fileName) => {
    // Simulate IPFS upload delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return `QmMockCID_${fileName}_${Date.now()}`;
};

const mockEncryptAes256CbcNodeStyle = async (data, key) => {
    // Simulate encryption
    return `encrypted_${data}_${key}`;
};

// Test functions
export const runHistoryTests = async () => {
    console.log('🧪 [KK-History] Starting history tests...');

    try {
        // Test 1: Generate UUID
        console.log('\n📋 Test 1: Generate UUID');
        const uuid1 = generateUUID();
        const uuid2 = generateUUID();
        console.log('✅ UUID 1:', uuid1);
        console.log('✅ UUID 2:', uuid2);
        console.log('✅ UUIDs are different:', uuid1 !== uuid2);

        // Test 2: Create KK backup
        console.log('\n📋 Test 2: Create KK backup');
        const backupData = createKKBackup(testData.sampleKKValid, 'Test backup');
        console.log('✅ Backup created');
        console.log('✅ Backup metadata:', backupData.metadata);
        console.log('✅ Backup has KK data:', !!backupData.kkData);
        console.log('✅ Backup timestamp:', backupData.metadata.timestamp);

        // Test 3: Create history entry
        console.log('\n📋 Test 3: Create history entry');
        const historyEntry = createHistoryEntry(
            testData.sampleKKValid,
            KK_HISTORY_TYPES.KELAHIRAN,
            {
                jumlahAnggotaSebelum: 3,
                anggotaYangBerubah: [{
                    nik: "1234567890123459",
                    nama: "Dewi Sartika",
                    aksi: "TAMBAH",
                    alasan: "Kelahiran"
                }],
                alamatSebelum: testData.sampleKKValid.alamatLengkap,
                alamatSesudah: testData.sampleKKValid.alamatLengkap
            },
            "QmBackupCID",
            "QmNewKKCID"
        );
        console.log('✅ History entry created');
        console.log('✅ Entry timestamp:', historyEntry.timestamp);
        console.log('✅ Entry type:', historyEntry.jenisPerubahan);
        console.log('✅ Entry details:', historyEntry.detailPerubahan);

        // Test 4: Update KK history
        console.log('\n📋 Test 4: Update KK history');
        const existingHistory = [];
        const updatedHistory = updateKKHistory(existingHistory, historyEntry);
        console.log('✅ History updated');
        console.log('✅ History length:', updatedHistory.length);
        console.log('✅ First entry:', updatedHistory[0]);

        // Test 5: Add multiple entries
        console.log('\n📋 Test 5: Add multiple entries');
        let currentHistory = [];

        // Add first entry
        const entry1 = createHistoryEntry(
            testData.sampleKKValid,
            KK_HISTORY_TYPES.KELAHIRAN,
            {
                jumlahAnggotaSebelum: 3,
                anggotaYangBerubah: [{
                    nik: "1234567890123459",
                    nama: "Dewi Sartika",
                    aksi: "TAMBAH",
                    alasan: "Kelahiran"
                }]
            },
            "QmBackupCID1",
            "QmNewKKCID1"
        );
        currentHistory = updateKKHistory(currentHistory, entry1);
        console.log('✅ Added entry 1, history length:', currentHistory.length);

        // Add second entry
        const entry2 = createHistoryEntry(
            testData.sampleKKValid,
            KK_HISTORY_TYPES.KEMATIAN,
            {
                jumlahAnggotaSebelum: 4,
                anggotaYangBerubah: [{
                    nik: "1234567890123458",
                    nama: "Budi Santoso",
                    aksi: "HAPUS",
                    alasan: "Kematian"
                }]
            },
            "QmBackupCID2",
            "QmNewKKCID2"
        );
        currentHistory = updateKKHistory(currentHistory, entry2);
        console.log('✅ Added entry 2, history length:', currentHistory.length);

        // Add third entry
        const entry3 = createHistoryEntry(
            testData.sampleKKValid,
            KK_HISTORY_TYPES.PINDAH_SELURUH,
            {
                jumlahAnggotaSebelum: 3,
                anggotaYangBerubah: testData.sampleKKValid.anggota.map(a => ({
                    nik: a.nik,
                    nama: a.nama,
                    aksi: "PINDAH_ALAMAT",
                    alasan: "Pindah seluruh keluarga"
                }))
            },
            "QmBackupCID3",
            "QmNewKKCID3"
        );
        currentHistory = updateKKHistory(currentHistory, entry3);
        console.log('✅ Added entry 3, history length:', currentHistory.length);

        // Test 6: History limit (100 entries)
        console.log('\n📋 Test 6: History limit');
        let largeHistory = [];
        for (let i = 0; i < 105; i++) {
            const entry = createHistoryEntry(
                testData.sampleKKValid,
                KK_HISTORY_TYPES.UPDATE_DATA,
                {
                    jumlahAnggotaSebelum: 3,
                    anggotaYangBerubah: []
                },
                `QmBackupCID${i}`,
                `QmNewKKCID${i}`
            );
            largeHistory = updateKKHistory(largeHistory, entry);
        }
        console.log('✅ Large history created');
        console.log('✅ History length (should be 100):', largeHistory.length);
        console.log('✅ First entry timestamp:', largeHistory[0].timestamp);
        console.log('✅ Last entry timestamp:', largeHistory[largeHistory.length - 1].timestamp);

        // Test 7: Different history types
        console.log('\n📋 Test 7: Different history types');
        const historyTypes = Object.values(KK_HISTORY_TYPES);
        console.log('✅ Available history types:', historyTypes);

        historyTypes.forEach(type => {
            const entry = createHistoryEntry(
                testData.sampleKKValid,
                type,
                {
                    jumlahAnggotaSebelum: 3,
                    anggotaYangBerubah: []
                },
                "QmBackupCID",
                "QmNewKKCID"
            );
            console.log(`✅ Created entry for type: ${type}`);
        });

        console.log('\n🎉 [KK-History] All tests completed!');

    } catch (error) {
        console.error('❌ [KK-History] Test error:', error);
    }
};

// Test error cases
export const runHistoryErrorTests = async () => {
    console.log('\n🧪 [KK-History] Starting error tests...');

    try {
        // Test 1: Invalid KK data
        console.log('\n📋 Error Test 1: Invalid KK data');
        try {
            const backupData = createKKBackup(null, 'Test backup');
            console.log('❌ Should have failed with null KK data');
        } catch (error) {
            console.log('✅ Correctly caught error:', error.message);
        }

        // Test 2: Invalid history entry
        console.log('\n📋 Error Test 2: Invalid history entry');
        try {
            const historyEntry = createHistoryEntry(
                null,
                'InvalidType',
                null,
                null,
                null
            );
            console.log('❌ Should have failed with invalid data');
        } catch (error) {
            console.log('✅ Correctly caught error:', error.message);
        }

        // Test 3: Update history with invalid entry
        console.log('\n📋 Error Test 3: Update history with invalid entry');
        try {
            const updatedHistory = updateKKHistory([], null);
            console.log('❌ Should have failed with null entry');
        } catch (error) {
            console.log('✅ Correctly caught error:', error.message);
        }

        console.log('\n🎉 [KK-History] Error tests completed!');

    } catch (error) {
        console.error('❌ [KK-History] Error test error:', error);
    }
};

// Test performance
export const runPerformanceTests = async () => {
    console.log('\n🧪 [KK-History] Starting performance tests...');

    try {
        const startTime = Date.now();

        // Test 1: Create many backups
        console.log('\n📋 Performance Test 1: Create many backups');
        const backupStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            createKKBackup(testData.sampleKKValid, `Performance test ${i}`);
        }
        const backupEndTime = Date.now();
        console.log(`✅ Created 100 backups in ${backupEndTime - backupStartTime}ms`);

        // Test 2: Create many history entries
        console.log('\n📋 Performance Test 2: Create many history entries');
        const entryStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            createHistoryEntry(
                testData.sampleKKValid,
                KK_HISTORY_TYPES.UPDATE_DATA,
                {
                    jumlahAnggotaSebelum: 3,
                    anggotaYangBerubah: []
                },
                `QmBackupCID${i}`,
                `QmNewKKCID${i}`
            );
        }
        const entryEndTime = Date.now();
        console.log(`✅ Created 100 history entries in ${entryEndTime - entryStartTime}ms`);

        // Test 3: Update history many times
        console.log('\n📋 Performance Test 3: Update history many times');
        const updateStartTime = Date.now();
        let history = [];
        for (let i = 0; i < 100; i++) {
            const entry = createHistoryEntry(
                testData.sampleKKValid,
                KK_HISTORY_TYPES.UPDATE_DATA,
                {
                    jumlahAnggotaSebelum: 3,
                    anggotaYangBerubah: []
                },
                `QmBackupCID${i}`,
                `QmNewKKCID${i}`
            );
            history = updateKKHistory(history, entry);
        }
        const updateEndTime = Date.now();
        console.log(`✅ Updated history 100 times in ${updateEndTime - updateStartTime}ms`);
        console.log(`✅ Final history length: ${history.length}`);

        const totalTime = Date.now() - startTime;
        console.log(`\n🎉 [KK-History] Performance tests completed in ${totalTime}ms`);

    } catch (error) {
        console.error('❌ [KK-History] Performance test error:', error);
    }
};

// Export test functions
export const runAllHistoryTests = async () => {
    console.log('🚀 [KK-History] Running all history tests...');

    await runHistoryTests();
    await runHistoryErrorTests();
    await runPerformanceTests();

    console.log('🎉 [KK-History] All history tests completed!');
};

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.href.includes('test')) {
    runAllHistoryTests();
} 