import { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaInbox, FaHistory } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { uploadToPinata } from '../utils/pinata';
import { loadPermohonanDataForDisplay, downloadEncryptedFile, viewEncryptedFile } from '../utils/permohonanDataUtils.js';
import { encryptAes256CbcNodeStyle, decryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';
import { createKKUpdateManager } from '../utils/kkUpdateManager.js';
import { fetchFromIPFS } from '../utils/ipfs.js';

const sidebarMenus = [
  { key: 'kalurahan', label: 'Kelola Kalurahan', icon: <FaBuilding /> },
  { key: 'permohonan', label: 'Permohonan Masuk', icon: <FaInbox /> },
  { key: 'riwayat', label: 'Riwayat Permohonan', icon: <FaHistory /> },
];

// Mapping status string ke integer enum sesuai smart contract
const STATUS_ENUM = {
  'Diajukan': 0,
  'Disetujui Kalurahan': 1,
  'Ditolak Kalurahan': 2,
  'Disetujui Dukcapil': 3,
  'Ditolak Dukcapil': 4,
  'Disetujui Kalurahan Asal': 5,
  'Ditolak Kalurahan Asal': 6,
  'Disetujui Kalurahan Tujuan': 7,
  'Ditolak Kalurahan Tujuan': 8,
  'Dibatalkan oleh Pemohon': 9,
  'Menunggu Konfirmasi KK Tujuan': 10,
  'Dikonfirmasi KK Tujuan': 11,
  'Ditolak KK Tujuan': 12
};

const DukcapilDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('kalurahan');
  // Tambahkan state untuk nama kalurahan
  const [kalurahanName, setKalurahanName] = useState('');
  const [kalurahanId, setKalurahanId] = useState('');
  const [kalurahanAddress, setKalurahanAddress] = useState('');
  const [isLoadingLocal, setIsLoading] = useState(false);
  
  // Form states for Kalurahan
  const [removeKalurahanAddress, setRemoveKalurahanAddress] = useState('');
  const [useKalurahanId, setUseKalurahanId] = useState(false);
  const [kalurahanMapping, setKalurahanMapping] = useState([]); // state untuk mapping lokal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRemoveAddress, setPendingRemoveAddress] = useState('');
  const removeFormRef = useRef();

  // State untuk permohonan
  const [permohonanMasuk, setPermohonanMasuk] = useState([]);
  const [riwayatPermohonan, setRiwayatPermohonan] = useState([]);
  const [selectedPermohonan, setSelectedPermohonan] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [permohonanDetailData, setPermohonanDetailData] = useState(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // State untuk upload dokumen resmi
  const [uploadingDokumen, setUploadingDokumen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // State untuk input alasan penolakan (global di komponen)
  const [showAlasanInput, setShowAlasanInput] = useState(false);
  const [alasanPenolakan, setAlasanPenolakan] = useState('');
  const [alasanError, setAlasanError] = useState('');

  // File viewer modal states
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState('');
  const [fileViewerTitle, setFileViewerTitle] = useState('');
  const [fileViewerLoading, setFileViewerLoading] = useState(false);
  const [fileViewerMimeType, setFileViewerMimeType] = useState('');
  const [fileViewerIsViewable, setFileViewerIsViewable] = useState(false);

  // Tambahkan state di atas komponen
  const [showUploadInput, setShowUploadInput] = useState(false);

  // State untuk modal tambah kalurahan
  const [showAddKalurahanModal, setShowAddKalurahanModal] = useState(false);

  // State untuk pencarian kalurahan
  const [searchKalurahan, setSearchKalurahan] = useState('');

  // Helper function untuk generate UUID (sama seperti di IdentityForm)
  const generateUUID = () => {
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

  useEffect(() => {
    async function fetchKalurahanMapping() {
      if (!contractService || !contractService.contract) return;
      try {
        const cid = await contractService.contract.getKalurahanMappingCID();
        if (!cid) return;
        
        console.log('[Dukcapil-Fetch] Fetching kalurahan mapping from IPFS:', cid);
        const url = `https://ipfs.io/ipfs/${cid}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error('[Dukcapil-Fetch] Failed to fetch from IPFS:', resp.status);
          return;
        }
        
        // Ambil data terenkripsi dari IPFS
        const encryptedData = await resp.text();
        console.log('[Dukcapil-Fetch] Encrypted data fetched from IPFS');
        
        // Dekripsi data
        console.log('[Dukcapil-Fetch] Decrypting kalurahan mapping...');
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log('[Dukcapil-Fetch] Mapping decrypted successfully');
        
        // Parse JSON dari data yang sudah didekripsi
        const data = JSON.parse(decryptedData);
        console.log('[Dukcapil-Fetch] Parsed mapping data:', data);
        setKalurahanMapping(data);
      } catch (e) {
        console.error('[Dukcapil-Fetch] Error fetching kalurahan mapping:', e);
        // Biarkan mapping lokal tetap jika fetch gagal
      }
    }
    fetchKalurahanMapping();
  }, [contractService]);

  // Fetch permohonan masuk (butuh verifikasi Dukcapil, baik pindah maupun non-pindah)
  useEffect(() => {
    async function fetchPermohonanMasuk() {
      if (!contractService || !contractService.contract) return;
      try {
        console.log('[Dukcapil] Fetching permohonan masuk (pindah & non-pindah)...');
        console.log('[Dukcapil] Wallet address:', walletAddress);
        console.log('[Dukcapil] Contract address:', contractService.contract.target);
        
        const statusIntPindah = STATUS_ENUM['Disetujui Kalurahan Tujuan'];
        const statusIntNonPindah = STATUS_ENUM['Disetujui Kalurahan'];
        const statusIntGabungKK = STATUS_ENUM['Dikonfirmasi KK Tujuan'];
        
        console.log('[Dukcapil] Status enum values:', {
          'Disetujui Kalurahan Tujuan': statusIntPindah,
          'Disetujui Kalurahan': statusIntNonPindah,
          'Dikonfirmasi KK Tujuan': statusIntGabungKK
        });
        
        console.log('[Dukcapil] Calling getPermohonanForDukcapil for status Disetujui Kalurahan Tujuan...');
        const idsPindah = await contractService.contract.getPermohonanForDukcapil(statusIntPindah);
        console.log('[Dukcapil] Result for Disetujui Kalurahan Tujuan:', idsPindah);
        
        console.log('[Dukcapil] Calling getPermohonanForDukcapil for status Disetujui Kalurahan...');
        const idsNonPindah = await contractService.contract.getPermohonanForDukcapil(statusIntNonPindah);
        console.log('[Dukcapil] Result for Disetujui Kalurahan:', idsNonPindah);
        
        console.log('[Dukcapil] Calling getPermohonanForDukcapil for status Dikonfirmasi KK Tujuan...');
        const idsGabungKK = await contractService.contract.getPermohonanForDukcapil(statusIntGabungKK);
        console.log('[Dukcapil] Result for Dikonfirmasi KK Tujuan:', idsGabungKK);
        
        // Cek juga status Diajukan untuk debugging
        console.log('[Dukcapil] Calling getPermohonanForDukcapil for status Diajukan...');
        const idsDiajukan = await contractService.contract.getPermohonanForDukcapil(STATUS_ENUM['Diajukan']);
        console.log('[Dukcapil] Result for Diajukan:', idsDiajukan);
        
        const allIds = Array.from(new Set([
          ...idsPindah.map(id => Number(id)),
          ...idsNonPindah.map(id => Number(id)),
          ...idsGabungKK.map(id => Number(id))
        ]));
        console.log(`[Dukcapil] Found ${allIds.length} permohonan masuk`, allIds);
        const list = [];
        for (let id of allIds) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (
            detail.status === 'Disetujui Kalurahan Tujuan' ||
            detail.status === 'Disetujui Kalurahan' ||
            detail.status === 'Dikonfirmasi KK Tujuan'
          ) {
            list.push(detail);
          }
        }
        setPermohonanMasuk(list);
      } catch (e) {
        console.error('[Dukcapil] Error fetching permohonan masuk:', e);
        setPermohonanMasuk([]);
      }
    }
    // Pastikan fetchPermohonanMasuk dipanggil setiap kali tab 'permohonan' aktif
    if (activeTab === 'permohonan') {
      fetchPermohonanMasuk();
    }
  }, [contractService, activeTab]);

  // Fetch riwayat permohonan (semua status utama Dukcapil)
  useEffect(() => {
    async function fetchRiwayat() {
      if (!contractService || !contractService.contract) return;
      try {
        console.log('[Dukcapil] Fetching riwayat permohonan (loop status)...');
        const statusList = [
          'Disetujui Dukcapil',
          'Ditolak Dukcapil',
          'Ditolak Kalurahan',
          'Ditolak Kalurahan Tujuan',
          'Diajukan',
          'Dibatalkan oleh Pemohon'
          // Hapus status yang masih menunggu verifikasi Dukcapil:
          // 'Disetujui Kalurahan Tujuan', 'Disetujui Kalurahan', 'Dikonfirmasi KK Tujuan'
        ];
        let allIds = [];
        for (const status of statusList) {
          try {
            const statusInt = STATUS_ENUM[status];
            const ids = await contractService.contract.getPermohonanForDukcapil(statusInt);
            console.log(`[Dukcapil] Status ${status} (${statusInt}): ${ids.length} permohonan`, ids);
            allIds = allIds.concat(ids.map(id => Number(id)));
          } catch (e) {
            console.warn(`[Dukcapil] Error fetching status ${status}:`, e);
          }
        }
        // Hilangkan duplikat
        allIds = Array.from(new Set(allIds));
        console.log(`[Dukcapil] Total unique permohonan in riwayat: ${allIds.length}`, allIds);
        const list = [];
        for (let id of allIds) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          console.log(`[Dukcapil] Riwayat Permohonan ${id}: status = "${detail.status}"`);
          list.push(detail);
        }
        setRiwayatPermohonan(list);
      } catch (e) {
        console.error('[Dukcapil] Error fetching riwayat permohonan:', e);
        setRiwayatPermohonan([]);
      }
    }
    if (activeTab === 'riwayat') fetchRiwayat();
  }, [contractService, activeTab]);

  const handleAddKalurahan = async (e) => {
    e.preventDefault();
    if (!kalurahanName.trim()) {
      onError('Nama Kalurahan wajib diisi');
      return;
    }
    if (!kalurahanId.trim()) {
      onError('ID Kalurahan wajib diisi');
      return;
    }
    if (!kalurahanAddress.trim()) {
      onError('Alamat wallet Kalurahan wajib diisi');
      return;
    }
    // Validasi duplikasi di mapping lokal
    if (kalurahanMapping.find(k => k.id == kalurahanId)) {
      onError('ID kalurahan sudah ada di mapping lokal.');
      return;
    }
    if (kalurahanMapping.find(k => k.address.toLowerCase() === kalurahanAddress.trim().toLowerCase())) {
      onError('Address kalurahan sudah ada di mapping lokal.');
      return;
    }
    setIsLoading(true);
    try {
      // 1. Update mapping lokal terlebih dahulu
      const newMapping = [...kalurahanMapping, { id: Number(kalurahanId), nama: kalurahanName, address: kalurahanAddress.trim() }];
      
      // 2. Enkripsi mapping dengan AES-256-CBC
      console.log('[Dukcapil-Add] Encrypting kalurahan mapping...');
      const jsonString = JSON.stringify(newMapping, null, 2);
      const encryptedMapping = await encryptAes256CbcNodeStyle(jsonString, CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Dukcapil-Add] Mapping encrypted successfully');
      
      // 3. Upload mapping terenkripsi ke IPFS dengan nama random UUID
      console.log('[Dukcapil-Add] Uploading encrypted mapping to IPFS...');
      const fileName = `${generateUUID()}.json.enc`;
      const cid = await uploadToPinata(encryptedMapping, fileName);
      console.log('[Dukcapil-Add] Encrypted mapping uploaded to IPFS:', cid);
      
      // 4. Tambah ke smart contract dengan CID baru dalam satu transaksi
      const result = await contractService.contract.tambahKalurahanById(
        parseInt(kalurahanId), 
        kalurahanAddress.trim(),
        cid
      );
      
      onSuccess(`Kalurahan berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setKalurahanMapping(newMapping);
      resetAddKalurahanForm();
    } catch (error) {
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKalurahan = async (addressToRemove) => {
    if (!addressToRemove.trim()) {
      onError('Alamat wallet Kalurahan wajib diisi!');
      return;
    }
    // Validasi: address harus ada di mapping
    const kal = kalurahanMapping.find(k => k.address.toLowerCase() === addressToRemove.trim().toLowerCase());
    if (!kal) {
      onError('Alamat wallet tidak ditemukan di mapping.');
      return;
    }
    setIsLoading(true);
    try {
      // 1. Update mapping lokal terlebih dahulu
      const newMapping = kalurahanMapping.filter(k => k.address.toLowerCase() !== addressToRemove.trim().toLowerCase());
      
      // 2. Enkripsi mapping dengan AES-256-CBC
      console.log('[Dukcapil-Remove] Encrypting kalurahan mapping...');
      const jsonString = JSON.stringify(newMapping, null, 2);
      const encryptedMapping = await encryptAes256CbcNodeStyle(jsonString, CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Dukcapil-Remove] Mapping encrypted successfully');
      
      // 3. Upload mapping terenkripsi ke IPFS dengan nama random UUID
      console.log('[Dukcapil-Remove] Uploading encrypted mapping to IPFS...');
      const fileName = `${generateUUID()}.json.enc`;
      const cid = await uploadToPinata(encryptedMapping, fileName);
      console.log('[Dukcapil-Remove] Encrypted mapping uploaded to IPFS:', cid);
      
      // 4. Hapus dari smart contract dengan CID baru dalam satu transaksi
      const result = await contractService.contract.hapusKalurahan(
        addressToRemove.trim(),
        cid
      );
      
      onSuccess(`Kalurahan berhasil dihapus! Transaction: ${result.hash || result.transactionHash}`);
      setKalurahanMapping(newMapping);
      setRemoveKalurahanAddress('');
      setPendingRemoveAddress('');
      setShowConfirmModal(false);
    } catch (error) {
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onRemoveSubmit = (e) => {
    e.preventDefault();
    if (!removeKalurahanAddress.trim()) {
      onError('Alamat wallet Kalurahan wajib diisi');
      return;
    }
    setPendingRemoveAddress(removeKalurahanAddress.trim());
    setShowConfirmModal(true);
  };

  const confirmRemove = () => {
    handleRemoveKalurahan(pendingRemoveAddress);
  };

  const cancelRemove = () => {
    setShowConfirmModal(false);
    setPendingRemoveAddress('');
  };

  const resetAddKalurahanForm = () => {
    setKalurahanName('');
    setKalurahanId('');
    setKalurahanAddress('');
    setShowAddKalurahanModal(false);
  };

  // Filter kalurahan berdasarkan pencarian
  const filteredKalurahan = kalurahanMapping.filter(kalurahan => {
    const searchTerm = searchKalurahan.toLowerCase();
    return (
      kalurahan.id.toString().includes(searchTerm) ||
      kalurahan.nama.toLowerCase().includes(searchTerm) ||
      kalurahan.address.toLowerCase().includes(searchTerm)
    );
  });

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handler untuk klik detail permohonan
  const handlePermohonanClick = async (permohonan) => {
    setSelectedPermohonan(permohonan);
    setShowDetailModal(true);
    if (permohonan.cidIPFS && permohonan.cidIPFS !== 'dummy-cid') {
      setLoadingDetailData(true);
      try {
        const detailData = await loadPermohonanDataForDisplay(permohonan.cidIPFS);
        setPermohonanDetailData(detailData);
      } catch (error) {
        setPermohonanDetailData(null);
      } finally {
        setLoadingDetailData(false);
      }
    } else {
      setPermohonanDetailData(null);
    }
  };
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPermohonan(null);
    setPermohonanDetailData(null);
    setLoadingDetailData(false);
    setIsVerifying(false);
  };

  const handleViewFile = async (cid, filename) => {
    try {
      setFileViewerLoading(true);
      setFileViewerTitle(filename);
      const result = await viewEncryptedFile(cid, filename);
      setFileViewerUrl(result.url);
      setFileViewerMimeType(result.mimeType);
      setFileViewerIsViewable(result.isViewable);
      setShowFileViewer(true);
    } catch (error) {
      console.error('Error viewing file:', error);
      onError('Gagal memuat file untuk ditampilkan');
    } finally {
      setFileViewerLoading(false);
    }
  };

  const closeFileViewer = () => {
    setShowFileViewer(false);
    if (fileViewerUrl) {
      window.URL.revokeObjectURL(fileViewerUrl);
      setFileViewerUrl('');
    }
    setFileViewerTitle('');
    setFileViewerMimeType('');
    setFileViewerIsViewable(false);
  };

  // Handler verifikasi Dukcapil
  const handleVerifikasiDukcapil = async (isSetuju, alasanPenolakan = '') => {
    if (!selectedPermohonan) return;
    setIsVerifying(true);
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [Dukcapil-Verifikasi] Memulai verifikasi permohonan ${selectedPermohonan.id}...`);
      console.log(`📋 [Dukcapil-Verifikasi] Status: ${isSetuju ? 'Setuju' : 'Tolak'}`);
      console.log(`📋 [Dukcapil-Verifikasi] Alasan: ${alasanPenolakan}`);
      
      if (isSetuju) {
        // ===== ALUR UNTUK PERMOHONAN DISETUJUI =====
        
        // 1. Validasi file dokumen resmi
        const fileInput = document.getElementById('dokumen-resmi-file');
        if (!fileInput.files || fileInput.files.length === 0) {
          console.error('❌ [Dukcapil-Verifikasi] File dokumen resmi tidak dipilih!');
          onError('File dokumen resmi wajib diupload untuk persetujuan!');
          setIsVerifying(false);
          return;
        }
        
        const file = fileInput.files[0];
        console.log(`📁 [Dukcapil-Verifikasi] File dokumen: ${file.name} (${file.size} bytes)`);
        
        // Validasi file dokumen resmi (harus PDF)
        const validateDokumenResmi = (file) => {
          if (file.type !== 'application/pdf') {
            return 'File harus berformat PDF';
          }
          if (!file.name.toLowerCase().endsWith('.pdf')) {
            return 'File harus berekstensi .pdf';
          }
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            return 'Ukuran file maksimal 10MB';
          }
          return null; // File valid
        };
        
        const validationError = validateDokumenResmi(file);
        if (validationError) {
          console.error(`❌ [Dukcapil-Verifikasi] ${validationError}`);
          onError(validationError);
          setIsVerifying(false);
          return;
        }
        
        console.log(`✅ [Dukcapil-Verifikasi] File valid: PDF dokumen resmi`);
        
        // 2. Proses update KK (jika gagal, STOP)
        console.log(`🔄 [Dukcapil-Verifikasi] Memproses update KK...`);
        let kkUpdateResult;
        try {
          const kkUpdateManager = createKKUpdateManager(contractService);
          
          // Tentukan jenis permohonan
          let jenisPermohonan = selectedPermohonan.jenis;
          if (typeof selectedPermohonan.jenis === 'number' || !isNaN(parseInt(selectedPermohonan.jenis))) {
            const jenisPermohonanMap = {
              '0': 'Kelahiran', '1': 'Kematian', '2': 'Perkawinan', '3': 'Perceraian', '4': 'Pindah',
              0: 'Kelahiran', 1: 'Kematian', 2: 'Perkawinan', 3: 'Perceraian', 4: 'Pindah'
            };
            jenisPermohonan = jenisPermohonanMap[selectedPermohonan.jenis];
          }
          
          if (!jenisPermohonan) {
            throw new Error(`Jenis permohonan tidak valid: ${selectedPermohonan.jenis}`);
          }
          
          kkUpdateResult = await kkUpdateManager.validateAndUpdateKK(
            selectedPermohonan.cidIPFS,
            jenisPermohonan
          );
          
          if (!kkUpdateResult.success) {
            throw new Error(`Gagal update KK: ${kkUpdateResult.error}`);
          }
          
          console.log(`✅ [Dukcapil-Verifikasi] KK berhasil diupdate`);
        } catch (kkError) {
          console.error(`❌ [Dukcapil-Verifikasi] Gagal update KK:`, kkError);
          onError(`Gagal update KK: ${kkError.message}`);
          setIsVerifying(false);
          return;
        }
        
        // 3. Ambil CID mapping NIK dari hasil KK update
        console.log(`🔄 [Dukcapil-Verifikasi] Mengambil CID mapping NIK dari hasil update...`);
        let mappingNIKCID;
        try {
          // Ambil CID mapping NIK dari hasil kkUpdateManager
          if (kkUpdateResult.result && kkUpdateResult.result.mappingCID) {
            mappingNIKCID = kkUpdateResult.result.mappingCID;
            console.log(`✅ [Dukcapil-Verifikasi] CID mapping NIK dari kkUpdateManager: ${mappingNIKCID}`);
          } else {
            // Fallback: ambil dari smart contract jika tidak ada di result
            const mappingCID = await contractService.getNikMappingCID();
            mappingNIKCID = mappingCID;
            console.log(`✅ [Dukcapil-Verifikasi] CID mapping NIK dari smart contract: ${mappingNIKCID}`);
          }
        } catch (mappingError) {
          console.error(`❌ [Dukcapil-Verifikasi] Gagal mengambil CID mapping NIK:`, mappingError);
          onError(`Gagal mengambil CID mapping NIK: ${mappingError.message}`);
          setIsVerifying(false);
          return;
        }
        
        // 4. Upload dokumen resmi (jika gagal, STOP)
        console.log(`🔄 [Dukcapil-Verifikasi] Upload dokumen resmi...`);
        let cidDokumen;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const binaryString = String.fromCharCode.apply(null, uint8Array);
          const base64Data = btoa(binaryString);
          const encrypted = await encryptAes256CbcNodeStyle(base64Data, CRYPTO_CONFIG.SECRET_KEY);
          const fileName = `${generateUUID()}.enc`;
          cidDokumen = await uploadToPinata(encrypted, fileName);
          
          console.log(`✅ [Dukcapil-Verifikasi] Dokumen resmi berhasil diupload`);
        } catch (dokumenError) {
          console.error(`❌ [Dukcapil-Verifikasi] Gagal upload dokumen resmi:`, dokumenError);
          onError(`Gagal upload dokumen resmi: ${dokumenError.message}`);
          setIsVerifying(false);
          return;
        }
        
        // 5. Panggil smart contract dengan semua CID
        console.log(`📜 [Dukcapil-Verifikasi] Panggil smart contract...`);
        try {
          const result = await contractService.verifikasiDukcapil(
            Number(selectedPermohonan.id),
            isSetuju,
            alasanPenolakan || '',
            cidDokumen,
            mappingNIKCID
          );
          
          console.log(`✅ [Dukcapil-Verifikasi] Smart contract berhasil dipanggil`);
          onSuccess(`Permohonan ${selectedPermohonan.id} disetujui dan KK berhasil diupdate!`);
        } catch (contractError) {
          console.error(`❌ [Dukcapil-Verifikasi] Gagal panggil smart contract:`, contractError);
          onError(`Gagal panggil smart contract: ${contractError.message}`);
          setIsVerifying(false);
          return;
        }
        
      } else {
        // ===== ALUR UNTUK PERMOHONAN DITOLAK =====
        console.log(`📜 [Dukcapil-Verifikasi] Panggil smart contract untuk penolakan...`);
        
        try {
          const result = await contractService.verifikasiDukcapil(
            Number(selectedPermohonan.id),
            isSetuju,
            alasanPenolakan || '',
            '',  // Empty string untuk dokumen resmi
            ''   // Empty string untuk mapping CID
          );
          
          console.log(`✅ [Dukcapil-Verifikasi] Smart contract berhasil dipanggil`);
          onSuccess(`Permohonan ${selectedPermohonan.id} ditolak oleh Dukcapil!`);
        } catch (contractError) {
          console.error(`❌ [Dukcapil-Verifikasi] Gagal panggil smart contract:`, contractError);
          onError(`Gagal panggil smart contract: ${contractError.message}`);
          setIsVerifying(false);
          return;
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [Dukcapil-Verifikasi] Verifikasi berhasil dalam ${totalTime}ms`);
      
      // Reload daftar permohonan masuk (gabungan status)
      console.log(`🔄 [Dukcapil-Verifikasi] Reloading data...`);
      const statusIntPindah = STATUS_ENUM['Disetujui Kalurahan Tujuan'];
      const statusIntNonPindah = STATUS_ENUM['Disetujui Kalurahan'];
      const statusIntGabungKK = STATUS_ENUM['Dikonfirmasi KK Tujuan'];
      const idsPindah = await contractService.contract.getPermohonanForDukcapil(statusIntPindah);
      const idsNonPindah = await contractService.contract.getPermohonanForDukcapil(statusIntNonPindah);
      const idsGabungKK = await contractService.contract.getPermohonanForDukcapil(statusIntGabungKK);
      const allIds = Array.from(new Set([
        ...idsPindah.map(id => Number(id)),
        ...idsNonPindah.map(id => Number(id)),
        ...idsGabungKK.map(id => Number(id))
      ]));
      const list = [];
      for (let id of allIds) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        if (
          detail.status === 'Disetujui Kalurahan Tujuan' ||
          (detail.status === 'Disetujui Kalurahan' && detail.jenis !== '4' && detail.jenis !== 'Pindah') ||
          detail.status === 'Dikonfirmasi KK Tujuan'
        ) {
          list.push(detail);
        }
      }
      setPermohonanMasuk(list);
      closeDetailModal();
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [Dukcapil-Verifikasi] Error dalam ${totalTime}ms:`, error);
      const errorMessage = error.message || handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };



  // Render daftar permohonan masuk
  const renderPermohonanMasuk = () => {
    const permohonanUntukDukcapil = permohonanMasuk.filter(p => {
      return p.status === 'Disetujui Kalurahan Tujuan' ||
        p.status === 'Disetujui Kalurahan' ||
        p.status === 'Dikonfirmasi KK Tujuan';
    });
    return (
      <div className="management-card">
        {permohonanUntukDukcapil.length === 0 ? <div>Tidak ada permohonan masuk.</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {permohonanUntukDukcapil.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.jenis}</td>
                  <td>{p.status}</td>
                  <td>{p.pemohon}</td>
                  <td><button className="detail-button" onClick={() => handlePermohonanClick(p)}>Detail</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Render riwayat permohonan
  const renderRiwayat = () => (
    <div className="management-card">
      {riwayatPermohonan.length === 0 ? <div>Tidak ada riwayat permohonan.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th>
            </tr>
          </thead>
          <tbody>
            {riwayatPermohonan.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.jenis}</td>
                <td>{p.status}</td>
                <td>{p.pemohon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="dukcapil-app-root">
      <div className="dukcapil-app-body">
        <Sidebar
          menus={sidebarMenus}
          activeMenu={activeTab}
          onMenuClick={setActiveTab}
        />
        <main className="dukcapil-main-area">
          <div className="dukcapil-main-card">
            <div className="dukcapil-header-main">
              <h2 className="dukcapil-title-main">Dashboard Dukcapil</h2>
              <p className="dukcapil-subtitle-main">Kelola akses Kalurahan dan permohonan</p>
            </div>
            <div className="tab-content">
              {activeTab === 'kalurahan' && (
                <div className="kalurahan-section">
                  <div className="management-card">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Cari kalurahan berdasarkan ID, nama, atau alamat wallet..."
                        value={searchKalurahan}
                        onChange={(e) => setSearchKalurahan(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '14px',
                          minWidth: '300px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          backgroundColor: 'white',
                          color: 'black'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                      />
                    </div>
                    <button
                      className="add-button"
                      onClick={() => setShowAddKalurahanModal(true)}
                      disabled={isLoadingLocal}
                    >
                      + Tambah Kalurahan
                    </button>
                  </div>
                    
                    {kalurahanMapping.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Belum ada kalurahan terdaftar
                      </div>
                    ) : filteredKalurahan.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        Tidak ada kalurahan yang cocok dengan pencarian
                      </div>
                    ) : (
                      <>
                        {searchKalurahan && (
                          <div style={{ 
                            marginBottom: '12px', 
                            fontSize: '14px', 
                            color: '#666',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>
                              Menampilkan {filteredKalurahan.length} dari {kalurahanMapping.length} kalurahan
                              {searchKalurahan && ` untuk pencarian "${searchKalurahan}"`}
                            </span>
                            <button
                              onClick={() => setSearchKalurahan('')}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '14px',
                                textDecoration: 'underline'
                              }}
                            >
                              Bersihkan pencarian
                            </button>
                          </div>
                        )}
                        <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Nama Kalurahan</th>
                            <th>Alamat Wallet</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredKalurahan.map(kalurahan => (
                            <tr key={kalurahan.id}>
                              <td>{kalurahan.id}</td>
                              <td>{kalurahan.nama}</td>
                              <td>{formatAddress(kalurahan.address)}</td>
                              <td>
                                <button
                                  className="remove-button"
                                  onClick={() => {
                                    setPendingRemoveAddress(kalurahan.address);
                                    setShowConfirmModal(true);
                                  }}
                                  disabled={isLoadingLocal}
                                  style={{ padding: '6px 12px', fontSize: '0.9em' }}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                        </>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'permohonan' && renderPermohonanMasuk()}
              {activeTab === 'riwayat' && renderRiwayat()}
            </div>
          </div>
        </main>
      </div>
      {showConfirmModal && (
        <div className="modal-overlay" onClick={cancelRemove}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Konfirmasi Hapus Kalurahan</h3>
              <button className="modal-close" onClick={cancelRemove}>×</button>
            </div>
            <div className="modal-body">
              <p>Apakah Anda yakin ingin menghapus kalurahan berikut?</p>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px', 
                margin: '16px 0',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Nama:</strong> {kalurahanMapping.find(k => k.address.toLowerCase() === pendingRemoveAddress.toLowerCase())?.nama || '-'}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>ID:</strong> {kalurahanMapping.find(k => k.address.toLowerCase() === pendingRemoveAddress.toLowerCase())?.id || '-'}
                </div>
                <div>
                  <strong>Alamat Wallet:</strong> {formatAddress(pendingRemoveAddress)}
                </div>
              </div>
              <div style={{display:'flex', gap:16, justifyContent: 'flex-end', marginTop:24}}>
                <button className="cancel-button" onClick={cancelRemove} disabled={isLoading}>Batal</button>
                <button className="remove-button" onClick={confirmRemove} disabled={isLoading}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Detail Permohonan */}
      {showDetailModal && selectedPermohonan && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Permohonan #{selectedPermohonan.id}</h3>
              <button className="modal-close" onClick={closeDetailModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label">Jenis Permohonan:</span>
                  <span className="info-value">{selectedPermohonan.jenis}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pemohon:</span>
                  <span className="info-value">{selectedPermohonan.pemohon}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tanggal Permohonan:</span>
                  <span className="info-value">{new Date(selectedPermohonan.waktuPengajuan).toLocaleString('id-ID')}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kalurahan Asal:</span>
                  <span className="info-value">ID {selectedPermohonan.idKalurahanAsal}</span>
                </div>
                {selectedPermohonan.jenis === '4' && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Kalurahan Tujuan:</span>
                      <span className="info-value">ID {selectedPermohonan.idKalurahanTujuan}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Jenis Pindah:</span>
                      <span className="info-value">{selectedPermohonan.jenisPindah}</span>
                    </div>
                  </>
                )}
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">
                    <span className={`status-badge status-${selectedPermohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>{selectedPermohonan.status}</span>
                  </span>
                </div>
                {/* (Hapus form upload dan tombol aksi dari sini) */}
                {selectedPermohonan.alasanPenolakan && (
                  <div className="info-row">
                    <span className="info-label">Alasan Penolakan:</span>
                    <span className="info-value">{selectedPermohonan.alasanPenolakan}</span>
                  </div>
                )}
                {/* Detail Data dari IPFS */}
                {loadingDetailData && (
                  <div className="info-row">
                    <span className="info-label">Data Detail:</span>
                    <span className="info-value">Memuat data dari IPFS...</span>
                  </div>
                )}
                {permohonanDetailData && !loadingDetailData && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Data Detail:</span>
                      <span className="info-value">
                        {permohonanDetailData.jenis}
                      </span>
                    </div>
                    {permohonanDetailData.data && Object.entries(permohonanDetailData.data).map(([key, value]) => (
                      <div key={key} className="info-row" style={{marginBottom: 8}}>
                        <span className="info-label">{key}:</span>
                        <span className="info-value">
                          {value && value !== '' ? (
                            typeof value === 'object' && value.type === 'encrypted_file' ? (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button 
                                  className="view-button"
                                  onClick={() => handleViewFile(value.cid, `${key.replace(/\s+/g, '_')}.${value.originalExtension || 'pdf'}`)}
                                  style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {value.viewLabel}
                                </button>
                                <button 
                                  className="download-button"
                                  onClick={() => downloadEncryptedFile(value.cid, `${key.replace(/\s+/g, '_')}.${value.originalExtension || 'pdf'}`)}
                                  style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {value.downloadLabel}
                                </button>
                              </div>
                            ) : (
                              value
                            )
                          ) : (
                            '-'
                          )}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {!permohonanDetailData && !loadingDetailData && selectedPermohonan.cidIPFS && selectedPermohonan.cidIPFS !== 'dummy-cid' && (
                  <div className="info-row">
                    <span className="info-label">Data Detail:</span>
                    <span className="info-value">Gagal memuat data dari IPFS</span>
                  </div>
                )}
              </div>
            </div>
            {(
              selectedPermohonan.status === 'Disetujui Kalurahan Tujuan' ||
              selectedPermohonan.status === 'Disetujui Kalurahan' ||
              selectedPermohonan.status === 'Dikonfirmasi KK Tujuan'
            ) && (
              <div className="modal-footer" style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16}}>
                {showUploadInput ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', marginBottom: 12 }}>
                      <label htmlFor="dokumen-resmi-file" style={{ fontWeight: 500, marginBottom: 6 }}>Upload Dokumen Resmi (PDF):</label>
                      <input
                        type="file"
                        id="dokumen-resmi-file"
                        accept=".pdf,application/pdf"
                        disabled={uploadingDokumen}
                        style={{
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.7)',
                          border: '1px solid #d1d5db',
                          padding: '10px 12px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          color: '#222',
                          cursor: uploadingDokumen ? 'not-allowed' : 'pointer',
                          maxWidth: '100%',
                          width: '100%',
                        }}
                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                        onBlur={e => e.target.style.borderColor = '#d1d5db'}
                      />
                      {uploadingDokumen && (
                        <span style={{ 
                          marginTop: '8px', 
                          fontSize: '14px', 
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          📤 Mengupload dokumen resmi...
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="add-button" disabled={isVerifying || uploadingDokumen} onClick={() => handleVerifikasiDukcapil(true)}>Setujui</button>
                      <button className="remove-button" disabled={isVerifying || uploadingDokumen} onClick={() => setShowUploadInput(false)}>Batal</button>
                    </div>
                  </>
                ) : showAlasanInput ? (
                  <>
                    <div style={{ marginTop: 8, width: '100%', textAlign: 'center' }}>
                      <input
                        type="text"
                        className="input-alasan"
                        placeholder="Masukkan alasan penolakan"
                        value={alasanPenolakan}
                        onChange={e => setAlasanPenolakan(e.target.value)}
                        disabled={isVerifying || uploadingDokumen}
                        style={{
                          width: '100%',
                          marginBottom: 8,
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.7)',
                          border: '1px solid #d1d5db',
                          padding: '10px 12px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          color: '#222',
                        }}
                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                        onBlur={e => e.target.style.borderColor = '#d1d5db'}
                      />
                      {alasanError && <div style={{ color: '#dc2626', fontSize: '0.9em', marginBottom: 8 }}>{alasanError}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button className="remove-button" disabled={isVerifying || uploadingDokumen} onClick={() => {
                        if (!alasanPenolakan.trim()) {
                          setAlasanError('Alasan penolakan wajib diisi.');
                          return;
                        }
                        setAlasanError('');
                        setShowAlasanInput(false);
                        handleVerifikasiDukcapil(false, alasanPenolakan);
                        setAlasanPenolakan('');
                      }}>Tolak</button>
                      <button className="add-button" disabled={isVerifying || uploadingDokumen} onClick={() => setShowAlasanInput(false)}>Batal</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="add-button" disabled={isVerifying || uploadingDokumen} onClick={() => setShowUploadInput(true)}>Upload & Setujui</button>
                    <button className="remove-button" disabled={isVerifying || uploadingDokumen} onClick={() => setShowAlasanInput(true)}>Tolak</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Kalurahan */}
      {showAddKalurahanModal && (
        <div className="modal-overlay" onClick={resetAddKalurahanForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Kalurahan Baru</h3>
              <button className="modal-close" onClick={resetAddKalurahanForm}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddKalurahan} className="management-form">
                <div className="form-group">
                  <label htmlFor="modalKalurahanName">Nama Kalurahan:</label>
                  <input
                    type="text"
                    id="modalKalurahanName"
                    value={kalurahanName}
                    onChange={(e) => setKalurahanName(e.target.value)}
                    placeholder="Nama Kalurahan"
                    className="form-input"
                    disabled={isLoadingLocal}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modalKalurahanId">ID Kalurahan:</label>
                  <input
                    type="number"
                    id="modalKalurahanId"
                    value={kalurahanId}
                    onChange={(e) => setKalurahanId(e.target.value)}
                    placeholder="1, 2, 3, ..."
                    className="form-input"
                    disabled={isLoadingLocal}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modalKalurahanAddress">Alamat Wallet Kalurahan:</label>
                  <input
                    type="text"
                    id="modalKalurahanAddress"
                    value={kalurahanAddress}
                    onChange={(e) => setKalurahanAddress(e.target.value)}
                    placeholder="0x..."
                    className="form-input"
                    disabled={isLoadingLocal}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={resetAddKalurahanForm}
                    disabled={isLoadingLocal}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="add-button"
                    disabled={isLoadingLocal || !kalurahanName.trim() || !kalurahanId.trim() || !kalurahanAddress.trim()}
                  >
                    {isLoadingLocal ? 'Menambahkan...' : 'Tambah Kalurahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal File Viewer */}
      {showFileViewer && (
        <div className="modal-overlay" onClick={closeFileViewer}>
          <div className="modal-content file-viewer-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto' }}>
            <div className="modal-header">
              <h3>{fileViewerTitle}</h3>
              <button className="modal-close" onClick={closeFileViewer}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 0, overflow: 'hidden' }}>
              {fileViewerLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div>Memuat dokumen...</div>
                </div>
              ) : fileViewerIsViewable ? (
                fileViewerMimeType.startsWith('image/') ? (
                  <img
                    src={fileViewerUrl}
                    alt={fileViewerTitle}
                    style={{
                      width: '100%',
                      height: '70vh',
                      objectFit: 'contain',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  />
                ) : fileViewerMimeType === 'application/pdf' ? (
                  <iframe
                    src={fileViewerUrl}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    title={fileViewerTitle}
                  />
                ) : (
                  <iframe
                    src={fileViewerUrl}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    title={fileViewerTitle}
                  />
                )
              ) : (
                <div style={{ width: '100%', height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>File berhasil dimuat!</p>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                      File: {fileViewerTitle}
                    </p>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                      MIME Type: {fileViewerMimeType}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={() => window.open(fileViewerUrl, '_blank')}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      📄 Buka di Tab Baru
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = fileViewerUrl;
                        link.download = fileViewerTitle;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      📥 Download File
                    </button>
                  </div>
                  <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '6px', maxWidth: '400px' }}>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0, textAlign: 'center' }}>
                      💡 <strong>Tips:</strong> File ini tidak dapat ditampilkan langsung di browser. Gunakan tombol di atas untuk membuka atau download file.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DukcapilDashboard; 