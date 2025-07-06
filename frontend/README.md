# IDChain Frontend

Frontend aplikasi IDChain - Sistem Identitas Digital Terdesentralisasi berbasis blockchain untuk pencatatan sipil.

## Fitur

- 🔗 Integrasi wallet Ethereum (MetaMask)
- 📝 Form verifikasi identitas dengan NIK dan tanggal lahir
- 🔐 Dekripsi data terenkripsi AES-256-CBC
- 🌐 Integrasi IPFS untuk penyimpanan data terdesentralisasi
- ⛓️ Interaksi dengan smart contract blockchain
- 🎨 UI/UX modern dan responsif
- 📱 Dukungan mobile dan desktop

## Alur Aplikasi

1. **Hubungkan Wallet**: Pengguna menghubungkan wallet Ethereum melalui MetaMask
2. **Input Data**: Pengguna mengisi form NIK (16 digit) dan tanggal lahir
3. **Load Mapping**: Aplikasi memuat file `nikToCidKK.json` yang berisi mapping NIK → CID IPFS
4. **Fetch Data**: Jika NIK ditemukan, aplikasi mengambil file `.enc` dari IPFS
5. **Dekripsi**: File terenkripsi didekripsi menggunakan AES-256-CBC dan secret key
6. **Verifikasi**: Aplikasi memverifikasi kecocokan NIK dan tanggal lahir dengan data keluarga
7. **Registrasi**: Jika valid, frontend memanggil smart contract `registerWarga(nik)`
8. **Simpan**: Smart contract menyimpan hubungan wallet ↔ NIK sebagai identitas sah
9. **Notifikasi**: Aplikasi menampilkan status keberhasilan atau kegagalan

## Teknologi

- **React 19.1.0** - Framework frontend
- **Vite** - Build tool dan development server
- **Ethers.js 6.15.0** - Interaksi dengan Ethereum blockchain
- **CryptoJS** - Dekripsi AES-256-CBC
- **IPFS** - Penyimpanan data terdesentralisasi

## Setup dan Instalasi

### Prerequisites

- Node.js 18+ dan npm
- MetaMask browser extension
- Smart contract yang sudah di-deploy

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Setup Konfigurasi

#### 2.1 Konfigurasi Crypto (Secret Key)
```bash
# Copy template file
cp src/config/crypto.example.js src/config/crypto.js

# Edit file dan isi SECRET_KEY dengan nilai yang sesuai
```

#### 2.2 Konfigurasi Pinata (IPFS)
```bash
# Buat file pinata.js dengan JWT token dari Pinata
echo 'export const PINATA_JWT = "Bearer YOUR_JWT_TOKEN_HERE";' > src/config/pinata.js
```

#### 2.3 Konfigurasi Contract
Edit file `src/config/contract.js`:

```javascript
export const CONTRACT_CONFIG = {
  ADDRESS: "0x...", // Ganti dengan alamat contract yang sudah di-deploy
  // ... konfigurasi lainnya
};
```

**⚠️ PENTING**: File `crypto.js` dan `pinata.js` tidak termasuk dalam git karena berisi secret key dan token.
Lihat `src/config/README.md` untuk detail lebih lanjut tentang keamanan konfigurasi.

### 3. Setup Data

1. Buat file `public/data/nikToCidKK.json` dengan mapping NIK ke CID IPFS:
```json
{
  "1234567890123456": "QmSampleCID1ForNIK1234567890123456",
  "2345678901234567": "QmSampleCID2ForNIK2345678901234567"
}
```

2. Upload file keluarga terenkripsi ke IPFS dan dapatkan CID

### 4. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## Struktur File

```
frontend/
├── src/
│   ├── components/
│   │   ├── WalletConnect.jsx      # Komponen koneksi wallet
│   │   ├── IdentityForm.jsx       # Form verifikasi identitas
│   │   └── Notification.jsx       # Komponen notifikasi
│   ├── utils/
│   │   ├── contract.js            # Utilitas interaksi contract
│   │   ├── crypto.js              # Utilitas dekripsi
│   │   └── ipfs.js                # Utilitas IPFS
│   ├── config/
│   │   └── contract.js            # Konfigurasi contract
│   ├── App.jsx                    # Komponen utama
│   └── App.css                    # Styling
├── public/
│   └── data/
│       └── nikToCidKK.json        # Mapping NIK ke CID
└── package.json
```

## Smart Contract Integration

Aplikasi ini terintegrasi dengan smart contract `PencatatanSipil.sol` yang memiliki fungsi:

- `registerWarga(string memory _nik)` - Mendaftarkan NIK ke wallet
- `nikByWallet(address wallet)` - Mendapatkan NIK berdasarkan wallet
- `walletByNik(string memory nik)` - Mendapatkan wallet berdasarkan NIK

## Keamanan

- Data keluarga dienkripsi menggunakan AES-256-CBC
- Secret key disimpan di file konfigurasi terpisah (tidak di-commit ke git)
- Verifikasi dilakukan di browser untuk privasi
- Smart contract memastikan satu NIK per wallet
- File konfigurasi sensitif di-ignore dari git repository

### Praktik Keamanan yang Diterapkan

1. **Secret Management**: Secret key dan token API disimpan di file terpisah
2. **Git Ignore**: File sensitif tidak masuk ke repository
3. **Template Files**: File contoh disediakan untuk setup
4. **Documentation**: Panduan keamanan tersedia di `src/config/README.md`

### Rekomendasi untuk Production

1. **Environment Variables**: Gunakan environment variables untuk secret key
2. **Backend Storage**: Pertimbangkan menyimpan secret key di backend server
3. **Key Rotation**: Ganti secret key secara berkala
4. **Access Control**: Batasi akses ke file konfigurasi

## Deployment

### Build untuk Production

```bash
npm run build
```

### Deploy ke Static Hosting

File hasil build dapat di-deploy ke:
- Vercel
- Netlify
- GitHub Pages
- IPFS (via Fleek)

## Troubleshooting

### MetaMask tidak terdeteksi
- Pastikan MetaMask terinstall dan aktif
- Refresh halaman setelah install MetaMask

### Contract tidak terhubung
- Periksa alamat contract di `src/config/contract.js`
- Pastikan network yang benar di MetaMask
- Periksa console browser untuk error

### IPFS data tidak ditemukan
- Periksa CID di file `nikToCidKK.json`
- Pastikan file terenkripsi sudah di-upload ke IPFS
- Coba gateway IPFS alternatif

## Kontribusi

1. Fork repository
2. Buat feature branch
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## License

MIT License - lihat file LICENSE untuk detail.
