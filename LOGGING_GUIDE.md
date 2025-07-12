# Logging Guide untuk Proses Submit Permohonan

## Overview

Sistem logging komprehensif telah ditambahkan untuk melacak setiap langkah dalam proses submit permohonan, dari form input hingga upload ke IPFS dan submission ke smart contract.

## Log Categories

### 1. **📁 [File-Upload]** - File Upload Process
**Fungsi:** `handleFileUpload()`

**Log Messages:**
```
📁 [File-Upload] Memulai upload file...
📋 [File-Upload] File: document.pdf (245760 bytes)
📋 [File-Upload] Type: application/pdf
📋 [File-Upload] Jenis Permohonan: Kelahiran
📋 [File-Upload] Field: suratKeteranganLahir
🔄 [File-Upload] Converting file to base64...
✅ [File-Upload] Base64 conversion berhasil (327680 characters)
💾 [File-Upload] Saving to form state...
✅ [File-Upload] File upload berhasil dalam 1250ms
```

**Error Logs:**
```
❌ [File-Upload] Error dalam 500ms: [Error details]
❌ [File-Upload] Error stack: [Stack trace]
```

### 2. **🔄 [Base64-Convert]** - File to Base64 Conversion
**Fungsi:** `convertFileToBase64()`

**Log Messages:**
```
🔄 [Base64-Convert] Converting file: document.pdf (245760 bytes)
✅ [Base64-Convert] Conversion berhasil (327680 characters)
```

**Error Logs:**
```
❌ [Base64-Convert] Conversion failed: [Error details]
```

### 3. **🚀 [Submit-Permohonan]** - Main Submission Process
**Fungsi:** `handleSubmitPermohonan()`

**Log Messages:**
```
🚀 [Submit-Permohonan] Memulai submit permohonan...
📋 [Submit-Permohonan] Jenis Permohonan: Kelahiran (0)
📋 [Submit-Permohonan] Wallet Address: 0x1234...
🔍 [Submit-Permohonan] Mencari ID Kalurahan asal...
📋 [Submit-Permohonan] Kalurahan Asal: Gamping -> ID: 1
🔄 [Submit-Permohonan] Processing permohonan Kelahiran...
📝 [Submit-Permohonan] Mengumpulkan data form...
📋 [Submit-Permohonan] Form Data Keys: ['namaAnak', 'tempatLahirAnak', ...]
☁️ [Submit-Permohonan] Memulai upload data ke IPFS...
✅ [Submit-Permohonan] IPFS upload berhasil, CID: QmX...
📜 [Submit-Permohonan] Submitting ke smart contract...
✅ [Submit-Permohonan] Smart contract submission berhasil dalam 2500ms
🔗 [Submit-Permohonan] Transaction Hash: 0xabcd...
🔄 [Submit-Permohonan] Resetting form...
🔄 [Submit-Permohonan] Reloading daftar permohonan...
🎉 [Submit-Permohonan] Submit permohonan berhasil dalam 5000ms!
```

**Error Logs:**
```
❌ [Submit-Permohonan] Jenis permohonan tidak dipilih
❌ [Submit-Permohonan] ID Kalurahan asal tidak ditemukan
❌ [Submit-Permohonan] Error dalam 3000ms: [Error details]
❌ [Submit-Permohonan] Error stack: [Stack trace]
```

### 4. **🚀 [IPFS-Upload]** - IPFS Upload Process
**Fungsi:** `processAndUploadPermohonanData()`

**Log Messages:**
```
🚀 [IPFS-Upload] Memulai proses submit permohonan Kelahiran...
📋 [IPFS-Upload] Wallet Address: 0x1234...
📋 [IPFS-Upload] Jenis Pindah: N/A
📋 [IPFS-Upload] Form Data Keys: ['namaAnak', 'tempatLahirAnak', ...]
🔍 [IPFS-Upload] Step 1: Validasi data...
✅ [IPFS-Upload] Validasi berhasil
📝 [IPFS-Upload] Step 2: Menyiapkan struktur data...
📝 [IPFS-Upload] Data structure prepared: {
  jenisPermohonan: "Kelahiran",
  timestamp: "2024-01-01T00:00:00.000Z",
  pemohon: "0x1234...",
  dataKeys: ["dataKelahiran"]
}
🔐 [IPFS-Upload] Step 3: Enkripsi data...
✅ [IPFS-Upload] Enkripsi berhasil (150ms)
📊 [IPFS-Upload] Encrypted data size: 2048 characters
☁️ [IPFS-Upload] Step 4: Upload ke IPFS...
📁 [IPFS-Upload] Filename: permohonan_0_1704067200000.enc
✅ [IPFS-Upload] Upload berhasil!
📊 [IPFS-Upload] Upload time: 2000ms
📊 [IPFS-Upload] Total process time: 3500ms
🔗 [IPFS-Upload] IPFS CID: QmX...
🔗 [IPFS-Upload] IPFS URL: https://gateway.pinata.cloud/ipfs/QmX...
```

**Error Logs:**
```
❌ [IPFS-Upload] Validasi gagal: {namaAnak: 'Nama anak wajib diisi'}
❌ [IPFS-Upload] Error dalam 2000ms: [Error details]
❌ [IPFS-Upload] Error stack: [Stack trace]
```

### 5. **📤 [Pinata]** - Pinata IPFS Service
**Fungsi:** `uploadToPinata()`

**Log Messages:**
```
📤 [Pinata] Memulai upload file: permohonan_0_1704067200000.enc
📊 [Pinata] Data size: 2048 characters
🌐 [Pinata] Upload URL: https://api.pinata.cloud/pinning/pinFileToIPFS
🔑 [Pinata] Using JWT token: Bearer eyJhbGciOiJIUzI1...
📡 [Pinata] Response status: 200 (1800ms)
✅ [Pinata] Upload berhasil dalam 1800ms
🔗 [Pinata] IPFS Hash: QmX...
📊 [Pinata] Pin Size: 2048 bytes
```

**Error Logs:**
```
❌ [Pinata] Upload failed: [Error response]
❌ [Pinata] Upload error dalam 5000ms: [Error details]
```

### 6. **🔓 [IPFS-Decrypt]** - IPFS Data Decryption
**Fungsi:** `decryptPermohonanData()`

**Log Messages:**
```
🔓 [IPFS-Decrypt] Memulai decrypt data dari IPFS...
🔗 [IPFS-Decrypt] CID: QmX...
📥 [IPFS-Decrypt] Fetching encrypted data from IPFS...
✅ [IPFS-Decrypt] Data fetched dalam 800ms (2048 characters)
🔐 [IPFS-Decrypt] Decrypting data...
✅ [IPFS-Decrypt] Decryption berhasil dalam 150ms
📋 [IPFS-Decrypt] Decrypted data keys: ['metadata', 'dataKelahiran']
🎉 [IPFS-Decrypt] Decrypt process berhasil dalam 1000ms
```

**Error Logs:**
```
❌ [IPFS-Decrypt] Error dalam 2000ms: [Error details]
❌ [IPFS-Decrypt] Error stack: [Stack trace]
```

### 7. **📥 [IPFS-Fetch]** - IPFS Data Fetching
**Fungsi:** `fetchFromIPFS()`

**Log Messages:**
```
📥 [IPFS-Fetch] Memulai fetch data dari IPFS...
🔗 [IPFS-Fetch] CID: QmX...
🌐 [IPFS-Fetch] Trying Pinata gateway...
🔗 [IPFS-Fetch] Pinata URL: https://gateway.pinata.cloud/ipfs/QmX...
📡 [IPFS-Fetch] Pinata response status: 200
✅ [IPFS-Fetch] Data fetched via Pinata dalam 800ms (2048 characters)
```

**Fallback Logs:**
```
⚠️ [IPFS-Fetch] Pinata gateway failed, trying public IPFS gateway...
🔗 [IPFS-Fetch] Fallback URL: https://ipfs.io/ipfs/QmX...
📡 [IPFS-Fetch] Fallback response status: 200
✅ [IPFS-Fetch] Data fetched via fallback dalam 1200ms (2048 characters)
```

**Error Logs:**
```
❌ [IPFS-Fetch] Error dalam 5000ms: [Error details]
❌ [IPFS-Fetch] Error stack: [Stack trace]
```

## Performance Metrics

### Timing Information
Setiap log category mencatat:
- **Start Time**: Waktu mulai proses
- **Step Timing**: Waktu untuk setiap langkah
- **Total Time**: Total waktu keseluruhan proses
- **Response Time**: Waktu response dari external services

### Data Size Information
- **File Size**: Ukuran file dalam bytes
- **Base64 Size**: Ukuran data setelah konversi base64
- **Encrypted Size**: Ukuran data setelah enkripsi
- **IPFS Pin Size**: Ukuran data yang di-pin di IPFS

## Error Tracking

### Error Information
Setiap error log mencakup:
- **Error Message**: Pesan error yang user-friendly
- **Error Stack**: Stack trace untuk debugging
- **Timing**: Waktu yang dibutuhkan sebelum error terjadi
- **Context**: Informasi konteks saat error terjadi

### Error Categories
1. **Validation Errors**: Error validasi form data
2. **File Upload Errors**: Error saat upload file
3. **Encryption Errors**: Error saat enkripsi data
4. **IPFS Upload Errors**: Error saat upload ke IPFS
5. **Smart Contract Errors**: Error saat submit ke blockchain
6. **Network Errors**: Error koneksi network

## Debugging Tips

### 1. **Mengidentifikasi Bottleneck**
- Cari log dengan waktu terlama
- Perhatikan step yang memakan waktu paling banyak
- Monitor network response times

### 2. **Troubleshooting File Upload**
- Periksa file size dan type
- Monitor base64 conversion time
- Check form state updates

### 3. **Troubleshooting IPFS Issues**
- Monitor Pinata API response
- Check fallback gateway usage
- Verify CID generation

### 4. **Troubleshooting Smart Contract**
- Monitor transaction submission time
- Check gas estimation
- Verify contract interaction

## Log Filtering

### Browser Console Filters
```javascript
// Filter hanya log submit permohonan
console.log.filter = (msg) => msg.includes('[Submit-Permohonan]');

// Filter hanya error logs
console.log.filter = (msg) => msg.includes('❌');

// Filter hanya IPFS related logs
console.log.filter = (msg) => msg.includes('[IPFS-');
```

### Performance Monitoring
```javascript
// Monitor total submission time
const logs = console.logs.filter(msg => msg.includes('[Submit-Permohonan]'));
const totalTime = logs[logs.length - 1].match(/(\d+)ms/)[1];
console.log(`Average submission time: ${totalTime}ms`);
```

## Production Considerations

### 1. **Log Level Control**
- Implement log levels (DEBUG, INFO, WARN, ERROR)
- Disable verbose logging in production
- Keep only essential error logs

### 2. **Performance Impact**
- Logging minimal impact on performance
- Async logging for non-critical information
- Batch logging for high-frequency events

### 3. **Privacy & Security**
- Never log sensitive data (NIK, private keys)
- Sanitize error messages
- Log only necessary context information

### 4. **Monitoring & Alerting**
- Set up alerts for critical errors
- Monitor average submission times
- Track success/failure rates 