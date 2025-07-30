// Test file untuk sistem validasi KK
// Contoh penggunaan dan testing

import {
    validateKKStructure,
    validateNIK,
    validateKelahiran,
    validateKematian,
    validatePerkawinan,
    validatePerceraian,
    validatePindah,
    validateKKComprehensive,
    calculateAge
} from './kkValidation.js';

// Contoh data KK valid
const sampleKKValid = {
    kk: "1234567890123456",
    alamatLengkap: {
        alamat: "Jl. Contoh No. 123",
        rt: "001",
        rw: "002",
        kelurahan: "Kelurahan Contoh",
        kecamatan: "Kecamatan Contoh",
        kabupaten: "Kabupaten Contoh",
        provinsi: "Provinsi Contoh",
        kodePos: "12345"
    },
    anggota: [
        {
            nik: "1234567890123456",
            nama: "Ahmad Suharto",
            tempatLahir: "Jakarta",
            tanggalLahir: "1980-01-15",
            jenisKelamin: "L",
            agama: "Islam",
            statusPerkawinan: "Kawin",
            pekerjaan: "Wiraswasta",
            kewarganegaraan: "WNI",
            statusHubunganKeluarga: "KEPALA KELUARGA",
            nikAyah: "",
            nikIbu: ""
        },
        {
            nik: "1234567890123457",
            nama: "Siti Aminah",
            tempatLahir: "Bandung",
            tanggalLahir: "1985-03-20",
            jenisKelamin: "P",
            agama: "Islam",
            statusPerkawinan: "Kawin",
            pekerjaan: "Ibu Rumah Tangga",
            kewarganegaraan: "WNI",
            statusHubunganKeluarga: "ISTRI",
            nikAyah: "",
            nikIbu: ""
        },
        {
            nik: "1234567890123458",
            nama: "Budi Santoso",
            tempatLahir: "Jakarta",
            tanggalLahir: "2010-07-10",
            jenisKelamin: "L",
            agama: "Islam",
            statusPerkawinan: "Belum Kawin",
            pekerjaan: "Belum/Tidak Bekerja",
            kewarganegaraan: "WNI",
            statusHubunganKeluarga: "ANAK",
            nikAyah: "1234567890123456",
            nikIbu: "1234567890123457"
        }
    ],
    jumlahAnggotaKeluarga: 3
};

// Contoh data kelahiran valid
const sampleKelahiranValid = {
    nik: "1234567890123459",
    namaAnak: "Dewi Sartika",
    tempatLahir: "Jakarta",
    tanggalLahir: "2024-01-15",
    jenisKelamin: "P",
    agama: "Islam",
    nikAyah: "1234567890123456",
    nikIbu: "1234567890123457"
};

// Contoh data kematian valid
const sampleKematianValid = {
    nikAlmarhum: "1234567890123458",
    namaAlmarhum: "Budi Santoso",
    tanggalKematian: "2024-01-10",
    penyebabKematian: "Sakit",
    nikPelapor: "1234567890123456",
    namaPelapor: "Ahmad Suharto"
};

// Contoh data perkawinan valid
const samplePerkawinanValid = {
    nikPria: "1234567890123456",
    namaPria: "Ahmad Suharto",
    nikWanita: "1234567890123457",
    namaWanita: "Siti Aminah",
    tanggalPerkawinan: "2024-01-15",
    tempatPerkawinan: "Jakarta"
};

// Contoh data perceraian valid
const samplePerceraianValid = {
    nikSuami: "1234567890123456",
    namaSuami: "Ahmad Suharto",
    nikIstri: "1234567890123457",
    namaIstri: "Siti Aminah",
    tanggalPerceraian: "2024-01-15",
    alasanPerceraian: "Tidak rukun"
};

// Contoh data pindah valid
const samplePindahValid = {
    anggotaPindah: ["1234567890123456", "1234567890123457"],
    alamatTujuan: {
        alamat: "Jl. Baru No. 456",
        rt: "003",
        rw: "004",
        kelurahan: "Kelurahan Baru",
        kecamatan: "Kecamatan Baru",
        kabupaten: "Kabupaten Baru",
        provinsi: "Provinsi Baru",
        kodePos: "54321"
    },
    jenisPindah: "0" // Seluruh keluarga
};

// Mock contract service untuk testing
const mockContractService = {
    // Mock functions yang diperlukan untuk testing
};

// Test functions
export const runValidationTests = async () => {
    console.log('🧪 [KK-Validation] Starting validation tests...');

    try {
        // Test 1: Validasi struktur KK
        console.log('\n📋 Test 1: Validasi struktur KK');
        const structureResult = validateKKStructure(sampleKKValid);
        console.log('✅ Structure validation:', structureResult.isValid);
        if (!structureResult.isValid) {
            console.log('❌ Errors:', structureResult.errors);
        }

        // Test 2: Validasi NIK
        console.log('\n📋 Test 2: Validasi NIK');
        const nikResult = validateNIK("1234567890123456");
        console.log('✅ NIK validation:', nikResult.isValid);
        if (!nikResult.isValid) {
            console.log('❌ Errors:', nikResult.errors);
        }

        // Test 3: Validasi kelahiran
        console.log('\n📋 Test 3: Validasi kelahiran');
        const kelahiranResult = validateKelahiran(sampleKKValid, sampleKelahiranValid);
        console.log('✅ Kelahiran validation:', kelahiranResult.isValid);
        if (!kelahiranResult.isValid) {
            console.log('❌ Errors:', kelahiranResult.errors);
        }

        // Test 4: Validasi kematian
        console.log('\n📋 Test 4: Validasi kematian');
        const kematianResult = await validateKematian(sampleKKValid, sampleKematianValid, mockContractService);
        console.log('✅ Kematian validation:', kematianResult.isValid);
        if (!kematianResult.isValid) {
            console.log('❌ Errors:', kematianResult.errors);
        }

        // Test 5: Validasi perkawinan
        console.log('\n📋 Test 5: Validasi perkawinan');
        const perkawinanResult = validatePerkawinan(sampleKKValid, sampleKKValid, samplePerkawinanValid);
        console.log('✅ Perkawinan validation:', perkawinanResult.isValid);
        if (!perkawinanResult.isValid) {
            console.log('❌ Errors:', perkawinanResult.errors);
        }

        // Test 6: Validasi perceraian
        console.log('\n📋 Test 6: Validasi perceraian');
        const perceraianResult = validatePerceraian(sampleKKValid, samplePerceraianValid);
        console.log('✅ Perceraian validation:', perceraianResult.isValid);
        if (!perceraianResult.isValid) {
            console.log('❌ Errors:', perceraianResult.errors);
        }

        // Test 7: Validasi pindah
        console.log('\n📋 Test 7: Validasi pindah');
        const pindahResult = await validatePindah(sampleKKValid, samplePindahValid, "0", mockContractService);
        console.log('✅ Pindah validation:', pindahResult.isValid);
        if (!pindahResult.isValid) {
            console.log('❌ Errors:', pindahResult.errors);
        }

        // Test 8: Validasi komprehensif
        console.log('\n📋 Test 8: Validasi komprehensif');
        const comprehensiveResult = await validateKKComprehensive(
            sampleKKValid,
            sampleKelahiranValid,
            'Kelahiran',
            mockContractService
        );
        console.log('✅ Comprehensive validation:', comprehensiveResult.isValid);
        if (!comprehensiveResult.isValid) {
            console.log('❌ Errors:', comprehensiveResult.errors);
        }

        // Test 9: Calculate age
        console.log('\n📋 Test 9: Calculate age');
        const age = calculateAge("1990-01-15");
        console.log('✅ Age calculation:', age, 'years');

        console.log('\n🎉 [KK-Validation] All tests completed!');

    } catch (error) {
        console.error('❌ [KK-Validation] Test error:', error);
    }
};

// Test error cases
export const runErrorTests = async () => {
    console.log('\n🧪 [KK-Validation] Starting error tests...');

    try {
        // Test 1: KK tanpa kepala keluarga
        console.log('\n📋 Error Test 1: KK tanpa kepala keluarga');
        const invalidKK = {
            ...sampleKKValid,
            anggota: sampleKKValid.anggota.map(a => ({
                ...a,
                statusHubunganKeluarga: a.statusHubunganKeluarga === 'KEPALA KELUARGA' ? 'ANAK' : a.statusHubunganKeluarga
            }))
        };
        const structureResult = validateKKStructure(invalidKK);
        console.log('❌ Expected error - Structure validation:', structureResult.isValid);
        console.log('📋 Errors:', structureResult.errors);

        // Test 2: NIK invalid
        console.log('\n📋 Error Test 2: NIK invalid');
        const nikResult = validateNIK("12345"); // Terlalu pendek
        console.log('❌ Expected error - NIK validation:', nikResult.isValid);
        console.log('📋 Errors:', nikResult.errors);

        // Test 3: Kelahiran dengan ayah tidak ada di KK
        console.log('\n📋 Error Test 3: Kelahiran dengan ayah tidak ada di KK');
        const invalidKelahiran = {
            ...sampleKelahiranValid,
            nikAyah: "9999999999999999" // NIK yang tidak ada
        };
        const kelahiranResult = validateKelahiran(sampleKKValid, invalidKelahiran);
        console.log('❌ Expected error - Kelahiran validation:', kelahiranResult.isValid);
        console.log('📋 Errors:', kelahiranResult.errors);

        // Test 4: Anak sudah dewasa
        console.log('\n📋 Error Test 4: Anak sudah dewasa');
        const invalidKelahiranDewasa = {
            ...sampleKelahiranValid,
            tanggalLahir: "1990-01-15" // Sudah dewasa
        };
        const kelahiranDewasaResult = validateKelahiran(sampleKKValid, invalidKelahiranDewasa);
        console.log('❌ Expected error - Kelahiran validation:', kelahiranDewasaResult.isValid);
        console.log('📋 Errors:', kelahiranDewasaResult.errors);

        console.log('\n🎉 [KK-Validation] Error tests completed!');

    } catch (error) {
        console.error('❌ [KK-Validation] Error test error:', error);
    }
};

// Export test data for external use
export const testData = {
    sampleKKValid,
    sampleKelahiranValid,
    sampleKematianValid,
    samplePerkawinanValid,
    samplePerceraianValid,
    samplePindahValid
};

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.href.includes('test')) {
    runValidationTests().then(() => {
        runErrorTests();
    });
} 