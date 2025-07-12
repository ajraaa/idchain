# IPFS Implementation untuk Sistem Permohonan Sipil

## Overview

Implementasi ini menambahkan fitur upload dan enkripsi data ke IPFS untuk semua jenis permohonan dalam sistem registrasi sipil terdesentralisasi. Semua data sensitif dienkripsi sebelum diupload ke IPFS untuk menjaga privasi dan keamanan.

## Fitur yang Diimplementasikan

### 1. **Enkripsi Data**
- Menggunakan AES-256-CBC encryption
- Semua data permohonan dienkripsi sebelum upload ke IPFS
- Key management melalui `CRYPTO_CONFIG`

### 2. **Jenis Permohonan yang Didukung**

#### **A. Permohonan Kelahiran (jenisPermohonan = '0')**
**Data yang dienkripsi:**
- Nama lengkap anak
- Tempat, tanggal, dan jam lahir
- NIK ayah, ibu, dan saksi
- Surat keterangan lahir (file)

#### **B. Permohonan Kematian (jenisPermohonan = '1')**
**Data yang dienkripsi:**
- NIK almarhum/almarhumah
- NIK pelapor dan saksi
- Hubungan pelapor
- Tempat dan tanggal kematian
- Penyebab kematian
- Surat keterangan kematian (file)

#### **C. Permohonan Perkawinan (jenisPermohonan = '2')**
**Data yang dienkripsi:**
- NIK calon pengantin pria dan wanita
- NIK saksi
- Tempat dan tanggal pernikahan
- Surat keterangan pernikahan (file)
- Foto calon pengantin (file)

#### **D. Permohonan Perceraian (jenisPermohonan = '3')**
**Data yang dienkripsi:**
- NIK suami dan istri
- Surat putusan pengadilan (file)

#### **E. Permohonan Pindah (jenisPermohonan = '4')**
**Data yang dienkripsi:**
- Jenis pindah (seluruh keluarga/mandiri/gabung KK)
- Alasan pindah
- Alamat tujuan lengkap
- Anggota keluarga yang pindah
- NIK kepala keluarga baru/tujuan

### 3. **Struktur Data IPFS**

Setiap permohonan memiliki struktur data yang konsisten:

```javascript
{
  metadata: {
    jenisPermohonan: "Kelahiran|Kematian|Perkawinan|Perceraian|Pindah",
    jenisPindah: 0|1|2, // Hanya untuk permohonan pindah
    timestamp: "2024-01-01T00:00:00.000Z",
    pemohon: "0x...",
    version: "1.0"
  },
  dataKelahiran: { ... },     // Untuk kelahiran
  dataKematian: { ... },      // Untuk kematian
  dataPerkawinan: { ... },    // Untuk perkawinan
  dataPerceraian: { ... },    // Untuk perceraian
  dataPindah: { ... }         // Untuk pindah
}
```

## File yang Diupdate

### 1. **`frontend/src/utils/permohonanDataUtils.js`** (Baru)
- Utility functions untuk validasi data
- Functions untuk prepare dan encrypt data
- Functions untuk decrypt dan display data
- File upload handling

### 2. **`frontend/src/components/CitizenDashboard.jsx`**
- State management untuk semua jenis permohonan
- Form validation dengan error handling
- IPFS upload integration
- Modal detail dengan data dari IPFS

### 3. **`frontend/src/utils/contract.js`**
- Sudah mendukung semua jenis permohonan
- Tidak perlu perubahan

## Cara Kerja

### 1. **Submit Permohonan**
```javascript
// 1. User mengisi form
// 2. Data divalidasi
const validation = validatePermohonanData(jenisPermohonan, formData, jenisPindah);

// 3. Data diprepare dan dienkripsi
const cidIPFS = await processAndUploadPermohonanData(
  jenisPermohonan, 
  formData, 
  walletAddress, 
  jenisPindah
);

// 4. CID dikirim ke smart contract
const result = await contractService.submitPermohonan(
  parseInt(jenisPermohonan),
  cidIPFS,
  idKalurahanAsal,
  idKalurahanTujuan
);
```

### 2. **View Detail Permohonan**
```javascript
// 1. Load basic data dari smart contract
const detail = await contractService.getPermohonanDetail(id);

// 2. Load detailed data dari IPFS
const detailData = await loadPermohonanDataForDisplay(detail.cidIPFS);

// 3. Display data
```

## Keamanan

### 1. **Enkripsi**
- Semua data dienkripsi dengan AES-256-CBC
- Key disimpan di `CRYPTO_CONFIG.SECRET_KEY`
- File di-convert ke base64 sebelum enkripsi

### 2. **Validasi**
- NIK validation (16 digit)
- Required field validation
- File type validation
- Data format validation

### 3. **Error Handling**
- Graceful error handling untuk IPFS upload
- User-friendly error messages
- Fallback untuk data yang gagal dimuat

## Testing

### 1. **Manual Testing**
- Test semua jenis permohonan
- Test file upload
- Test error scenarios
- Test data decryption

### 2. **Validation Testing**
- Test form validation
- Test NIK format
- Test required fields
- Test file types

## Dependencies

### 1. **Existing Dependencies**
- `scrypt-js` - untuk enkripsi
- `ethers` - untuk smart contract interaction
- `react-icons` - untuk UI icons

### 2. **IPFS Dependencies**
- `pinata` - untuk IPFS upload
- `crypto.js` - untuk enkripsi/dekripsi

## Configuration

### 1. **Crypto Config**
```javascript
// frontend/src/config/crypto.js
export const CRYPTO_CONFIG = {
  SECRET_KEY: process.env.REACT_APP_CRYPTO_SECRET_KEY || 'your-secret-key'
};
```

### 2. **Pinata Config**
```javascript
// frontend/src/config/pinata.js
export const PINATA_CONFIG = {
  API_KEY: process.env.REACT_APP_PINATA_API_KEY,
  SECRET_KEY: process.env.REACT_APP_PINATA_SECRET_KEY
};
```

## Environment Variables

Tambahkan ke `.env`:
```env
REACT_APP_CRYPTO_SECRET_KEY=your-secret-key-here
REACT_APP_PINATA_API_KEY=your-pinata-api-key
REACT_APP_PINATA_SECRET_KEY=your-pinata-secret-key
```

## Status Implementasi

✅ **Completed:**
- [x] Utility functions untuk semua jenis permohonan
- [x] Form validation dan error handling
- [x] IPFS upload dengan enkripsi
- [x] Data decryption dan display
- [x] Modal detail dengan data dari IPFS
- [x] State management untuk semua form types
- [x] File upload handling
- [x] Error messages dan loading states

🔄 **In Progress:**
- [ ] Testing dengan data real
- [ ] Performance optimization
- [ ] Error recovery mechanisms

📋 **Future Enhancements:**
- [ ] Batch upload untuk multiple files
- [ ] Data compression sebelum enkripsi
- [ ] Offline support dengan local storage
- [ ] Data backup mechanisms

## Troubleshooting

### 1. **IPFS Upload Failed**
- Check Pinata API credentials
- Verify network connection
- Check file size limits

### 2. **Encryption Failed**
- Verify crypto secret key
- Check data format
- Ensure all required fields

### 3. **Decryption Failed**
- Verify CID is correct
- Check if data exists on IPFS
- Verify encryption key

## Performance Considerations

### 1. **File Size**
- Compress images before upload
- Limit file sizes
- Use appropriate file formats

### 2. **Network**
- Implement retry mechanisms
- Add loading indicators
- Cache frequently accessed data

### 3. **Memory**
- Clean up temporary data
- Implement pagination for large lists
- Optimize state management

## Security Best Practices

### 1. **Key Management**
- Use environment variables
- Rotate keys regularly
- Never commit keys to version control

### 2. **Data Validation**
- Validate all inputs
- Sanitize data before encryption
- Implement rate limiting

### 3. **Error Handling**
- Don't expose sensitive data in errors
- Log errors securely
- Implement graceful degradation 