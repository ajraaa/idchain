# Konfigurasi Aplikasi

Direktori ini berisi file-file konfigurasi untuk aplikasi IDChain.

## File Konfigurasi

### 1. `crypto.js` (TIDAK TERMASUK DALAM GIT)
File ini berisi konfigurasi untuk enkripsi/dekripsi data:
- `SECRET_KEY`: Secret key untuk AES-256-CBC encryption
- `SALT`: Salt untuk scrypt key derivation
- `SCRYPT_PARAMS`: Parameter untuk scrypt algorithm

**⚠️ PENTING**: File ini tidak termasuk dalam git karena berisi secret key. 
Copy `crypto.example.js` ke `crypto.js` dan isi dengan nilai yang sesuai.

### 2. `pinata.js` (TIDAK TERMASUK DALAM GIT)
File ini berisi JWT token untuk akses ke Pinata IPFS API.

### 3. `contract.js`
File ini berisi konfigurasi smart contract:
- Address kontrak yang sudah di-deploy
- Konfigurasi network
- Parameter blockchain

## Setup Konfigurasi

### Langkah 1: Setup Crypto Config
```bash
# Copy template file
cp src/config/crypto.example.js src/config/crypto.js

# Edit file dan isi SECRET_KEY dengan nilai yang sesuai
```

### Langkah 2: Setup Pinata Config
```bash
# Buat file pinata.js dengan JWT token dari Pinata
echo 'export const PINATA_JWT = "Bearer YOUR_JWT_TOKEN_HERE";' > src/config/pinata.js
```

### Langkah 3: Update Contract Address
Edit `src/config/contract.js` dan ganti `ADDRESS` dengan address kontrak yang sudah di-deploy.

## Keamanan

### ⚠️ PERINGATAN KEAMANAN

1. **Secret Key**: Jangan pernah commit secret key ke repository git
2. **Environment Variables**: Dalam production, gunakan environment variables
3. **Backend Storage**: Pertimbangkan menyimpan secret key di backend server
4. **Access Control**: Batasi akses ke file konfigurasi

### Best Practices

1. **Development**: Gunakan file konfigurasi lokal (sudah di-ignore git)
2. **Production**: Gunakan environment variables atau secret management service
3. **Rotation**: Ganti secret key secara berkala
4. **Monitoring**: Monitor akses ke file konfigurasi

## Troubleshooting

### Error: "Cannot find module '../config/crypto'"
- Pastikan file `crypto.js` sudah dibuat dari template
- Periksa path import di file yang menggunakan konfigurasi

### Error: "Invalid secret key"
- Periksa nilai `SECRET_KEY` di `crypto.js`
- Pastikan secret key sama dengan yang digunakan untuk enkripsi data

### Error: "Pinata API error"
- Periksa JWT token di `pinata.js`
- Pastikan token masih valid dan memiliki permission yang cukup 