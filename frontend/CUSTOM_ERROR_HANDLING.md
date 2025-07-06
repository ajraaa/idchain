# Custom Error Handling di Frontend

## Overview

Frontend sekarang sudah mengimplementasikan custom error handling untuk smart contract errors. Ini memberikan user experience yang lebih baik dengan pesan error yang spesifik dan informatif dalam bahasa Indonesia.

## File yang Dimodifikasi

### 1. `frontend/src/utils/errorHandler.js` (Baru)
- Utility utama untuk handle custom errors
- Mapping custom error ke pesan user-friendly
- Parse error dari berbagai format (reason, data, message)

### 2. `frontend/src/config/errorSignatures.js` (Baru)
- Konfigurasi error signatures untuk custom errors
- Mapping signature ke nama error
- Helper functions untuk lookup

### 3. `frontend/src/utils/contract.js`
- Semua error handling di ContractService menggunakan `handleContractError()`
- Error messages sekarang lebih spesifik dan informatif

### 4. `frontend/src/components/IdentityForm.jsx`
- Error handling untuk verifikasi identitas
- Pesan error yang lebih jelas untuk user

### 5. `frontend/src/components/OwnerDashboard.jsx`
- Error handling untuk operasi owner (tambah/hapus kalurahan/dukcapil)
- Feedback yang lebih baik untuk admin

### 6. `frontend/src/components/WalletConnect.jsx`
- Error handling untuk koneksi wallet
- Pesan error yang lebih user-friendly

## Custom Errors yang Didukung

### KontrolAkses Errors
- `OnlyOwner`: "Hanya owner yang dapat melakukan aksi ini"
- `OnlyKalurahan`: "Hanya kalurahan yang dapat melakukan aksi ini"
- `OnlyDukcapil`: "Hanya dukcapil yang dapat melakukan aksi ini"
- `OnlyWargaTerdaftar`: "Hanya warga terdaftar yang dapat melakukan aksi ini"
- `AddressZero`: "Alamat wallet tidak valid (zero address)"
- `IdSudahDipakai`: "ID kalurahan sudah digunakan"
- `AddressSudahDipakai`: "Alamat wallet sudah terdaftar sebagai kalurahan"
- `NikSudahDiklaim`: "NIK ini sudah terdaftar dengan wallet lain"
- `WalletSudahDigunakan`: "Wallet ini sudah terdaftar dengan NIK lain"

### PermohonanManager Errors
- `BukanPemilikPermohonan`: "Anda bukan pemilik permohonan ini"
- `TidakDapatDibatalkan`: "Permohonan tidak dapat dibatalkan"
- `PermohonanBukanDiajukan`: "Status permohonan bukan Diajukan"
- `BukanPermohonanPindah`: "Permohonan ini bukan permohonan pindah"
- `TujuanTidakValid`: "ID kalurahan tujuan tidak valid"
- `IdKalurahanTujuanTidakDikenal`: "ID kalurahan tujuan tidak ditemukan"
- `BelumDiverifikasiKalurahanAsal`: "Belum diverifikasi oleh kalurahan asal"
- `HanyaKalurahanTujuan`: "Hanya kalurahan tujuan yang dapat melakukan aksi ini"
- `PermohonanPindahBelumDisetujuiKalurahanTujuan`: "Permohonan pindah belum disetujui kalurahan tujuan"
- `PermohonanBelumDisetujuiKalurahan`: "Permohonan belum disetujui kalurahan"
- `CidKosong`: "CID dokumen tidak boleh kosong"
- `BelumAdaDokumenResmi`: "Dokumen resmi belum diunggah"
- `AksesDitolak`: "Akses ditolak untuk dokumen ini"

### DokumenResmiManager Errors
- `BelumDisetujuiDukcapil`: "Permohonan belum disetujui dukcapil"

## Generic Error Handling

Untuk error yang bukan custom error, sistem akan memberikan pesan yang sesuai:

- **User Rejected**: "Transaksi dibatalkan oleh pengguna"
- **Insufficient Funds**: "Saldo tidak cukup untuk membayar gas fee"
- **Network Error**: "Kesalahan jaringan. Silakan coba lagi"
- **Default**: "Terjadi kesalahan pada blockchain. Silakan coba lagi"

## Cara Penggunaan

### Di Component
```javascript
import { handleContractError } from '../utils/errorHandler.js';

try {
    const result = await contractService.someFunction();
    // Handle success
} catch (error) {
    const errorMessage = handleContractError(error);
    onError?.(errorMessage);
}
```

### Di Service
```javascript
import { handleContractError } from './errorHandler.js';

try {
    const tx = await this.contract.someFunction();
    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.hash };
} catch (error) {
    console.error('Operation failed:', error);
    const errorMessage = handleContractError(error);
    throw new Error(errorMessage);
}
```

## Error Signature

Error signatures dihitung menggunakan keccak256 hash dari nama error. Script untuk mendapatkan signature:

```bash
npx hardhat run scripts/getErrorSignatures.js
```

## Testing

Untuk test custom error handling:

1. Jalankan test smart contract untuk memastikan custom errors berfungsi
2. Test di frontend dengan berbagai skenario error
3. Verifikasi pesan error yang ditampilkan sesuai dengan yang diharapkan

## Maintenance

Ketika menambah custom error baru di smart contract:

1. Update `scripts/getErrorSignatures.js` dengan nama error baru
2. Jalankan script untuk mendapatkan signature
3. Update `frontend/src/config/errorSignatures.js` dengan signature baru
4. Update `frontend/src/utils/errorHandler.js` dengan pesan error baru
5. Test error handling di frontend

## Benefits

1. **User Experience**: Pesan error yang jelas dan informatif
2. **Localization**: Semua pesan dalam bahasa Indonesia
3. **Debugging**: Error logging yang lebih detail
4. **Maintainability**: Centralized error handling
5. **Consistency**: Pesan error yang konsisten di seluruh aplikasi 