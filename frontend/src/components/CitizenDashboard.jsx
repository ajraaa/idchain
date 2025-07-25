import { useState, useEffect } from 'react';
import { FaUser, FaFileAlt, FaList, FaDownload, FaPowerOff, FaBell } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { fetchFromIPFS, loadNIKMapping } from '../utils/ipfs.js';
import { uploadToPinata } from '../utils/pinata.js';
import { decryptAes256CbcNodeStyle, encryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';
import { ethers } from 'ethers';
import { 
  processAndUploadPermohonanData, 
  convertFileToBase64,
  validatePermohonanData,
  loadPermohonanDataForDisplay,
  decryptFileData,
  downloadEncryptedFile,
  viewEncryptedFile
} from '../utils/permohonanDataUtils.js';
import CitizenAppHeader from './CitizenAppHeader';

const sidebarMenus = [
  { key: 'profile', label: 'Profile', icon: <FaUser /> },
  { key: 'ajukan', label: 'Ajukan Permohonan', icon: <FaFileAlt /> },
  { key: 'daftar', label: 'Daftar Permohonan', icon: <FaList /> },
  { key: 'dokumen', label: 'Dokumen Resmi', icon: <FaDownload /> },
];

const CitizenDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, onPermohonanSuccess, onPermohonanError, isLoading, onCitizenNameLoaded, citizenName }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoadingLocal, setIsLoading] = useState(false);
  const [citizenData, setCitizenData] = useState(null);
  const [permohonans, setPermohonans] = useState([]);
  const [dokumenResmi, setDokumenResmi] = useState([]);
  const [selectedPermohonan, setSelectedPermohonan] = useState(null);
  const [showPermohonanDetail, setShowPermohonanDetail] = useState(false);
  const [permohonanDetailData, setPermohonanDetailData] = useState(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  
  // Form states for Ajukan Permohonan
  const [jenisPermohonan, setJenisPermohonan] = useState('');
  const [idKalurahanAsal, setIdKalurahanAsal] = useState('');
  const [idKalurahanTujuan, setIdKalurahanTujuan] = useState('');
  const [cidIPFS, setCidIPFS] = useState('');
  
  // Form data states for all permohonan types
  const [formDataKelahiran, setFormDataKelahiran] = useState({
    namaAnak: '',
    tempatLahirAnak: '',
    tanggalLahirAnak: '',
    jamLahirAnak: '',
    nikAyah: '',
    nikIbu: '',
    nikSaksi1: '',
    nikSaksi2: '',
    suratKeteranganLahir: null
  });

  const [formDataKematian, setFormDataKematian] = useState({
    nikAlmarhum: '',
    nikPelapor: '',
    nikSaksi1: '',
    nikSaksi2: '',
    hubunganPelapor: '',
    tempatKematian: '',
    tanggalKematian: '',
    penyebabKematian: '',
    suratKeteranganKematian: null
  });

  const [formDataPerkawinan, setFormDataPerkawinan] = useState({
    nikPria: '',
    nikWanita: '',
    nikSaksi1: '',
    nikSaksi2: '',
    tempatPernikahan: '',
    tanggalPernikahan: '',
    suratKeteranganPernikahan: null,
    fotoPria: null,
    fotoWanita: null
  });

  const [formDataPerceraian, setFormDataPerceraian] = useState({
    nikSuami: '',
    nikIstri: '',
    suratPutusanPengadilan: null
  });

  // Additional form states for Pindah
  const [alasanPindah, setAlasanPindah] = useState('');
  const [alasanPindahLainnya, setAlasanPindahLainnya] = useState('');
  const [pindahSemua, setPindahSemua] = useState(false);
  const [anggotaPindah, setAnggotaPindah] = useState([]);
  const [jenisPindah, setJenisPindah] = useState('');
  const [nikKepalaKeluargaBaru, setNikKepalaKeluargaBaru] = useState('');
  const [nikKepalaKeluargaTujuan, setNikKepalaKeluargaTujuan] = useState('');
  const [alamatBaru, setAlamatBaru] = useState('');

  // Tambahkan state untuk kalurahan
  const [kalurahanBaru, setKalurahanBaru] = useState('');
  const [kecamatanBaru, setKecamatanBaru] = useState('');
  const [kabupatenBaru, setKabupatenBaru] = useState('');
  const [provinsiBaru, setProvinsiBaru] = useState('');

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});
  
  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState({});

  // File viewer modal states
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState('');
  const [fileViewerTitle, setFileViewerTitle] = useState('');
  const [fileViewerLoading, setFileViewerLoading] = useState(false);
  const [fileViewerMimeType, setFileViewerMimeType] = useState('');
  const [fileViewerIsViewable, setFileViewerIsViewable] = useState(false);

  // Load citizen data on component mount
  useEffect(() => {
    if (contractService && walletAddress) {
      loadCitizenData();
      loadDaftarPermohonan();
      loadDokumenResmi();
    }
  }, [contractService, walletAddress]);

  const loadCitizenData = async () => {
    try {
      console.log('🔄 [CitizenDashboard] Loading citizen data for wallet:', walletAddress);
      const data = await contractService.getCitizenData(walletAddress);
      console.log('✅ [CitizenDashboard] Citizen data loaded:', data);
      setCitizenData(data);
      
      // Load KK data from IPFS via smart contract
      const mapping = await loadNIKMapping(contractService);
      const cid = mapping[data.nik];
      console.log('🔍 [CitizenDashboard] Mapping lookup:', { nik: data.nik, cid, mappingKeys: Object.keys(mapping) });
      
      if (cid) {
        console.log('📁 [CitizenDashboard] Loading KK data from IPFS CID:', cid);
        const encryptedData = await fetchFromIPFS(cid);
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log('✅ [CitizenDashboard] KK data decrypted successfully');
        console.log('📋 [CitizenDashboard] Decrypted KK data:', decryptedData);
        
        // Parse JSON jika masih berupa string
        let parsedKKData = decryptedData;
        if (typeof decryptedData === 'string') {
          try {
            parsedKKData = JSON.parse(decryptedData);
            console.log('✅ [CitizenDashboard] KK data parsed from JSON string');
          } catch (error) {
            console.error('❌ [CitizenDashboard] Failed to parse KK data JSON:', error);
            parsedKKData = decryptedData;
          }
        }
        
        setCitizenData(prev => ({ ...prev, kkData: parsedKKData }));
        
        // Extract citizen name from KK data for header
        if (parsedKKData.anggota && parsedKKData.anggota.length > 0) {
          console.log('🔍 [CitizenDashboard] Looking for user with NIK:', data.nik);
          console.log('📋 [CitizenDashboard] Available anggota:', parsedKKData.anggota.map(a => ({ nik: a.nik, nama: a.nama, status: a.statusHubunganKeluarga })));
          
          // Cari anggota yang sesuai dengan NIK user yang sedang login
          const currentUser = parsedKKData.anggota.find(member => 
            member.nik === data.nik
          );
          
          if (currentUser) {
            // Tampilkan nama user yang sedang login
            console.log('✅ [CitizenDashboard] Found current user:', currentUser.nama);
            onCitizenNameLoaded?.(currentUser.nama);
          } else {
            // Fallback ke kepala keluarga jika tidak ditemukan
            console.log('⚠️ [CitizenDashboard] Current user not found, falling back to kepala keluarga');
            const kepalaKeluarga = parsedKKData.anggota.find(member => 
              member.statusHubunganKeluarga === 'KEPALA KELUARGA'
            ) || parsedKKData.anggota[0];
            console.log('👨‍👩‍👧‍👦 [CitizenDashboard] Using kepala keluarga:', kepalaKeluarga.nama);
            onCitizenNameLoaded?.(kepalaKeluarga.nama);
          }
        }
      } else {
        console.log('⚠️ [CitizenDashboard] No CID found for NIK:', data.nik);
      }
    } catch (error) {
      console.error('❌ [CitizenDashboard] Failed to load citizen data:', error);
      onPermohonanError('Gagal memuat data warga');
    }
  };

  const loadDaftarPermohonan = async () => {
    try {
      console.log('📋 [CitizenDashboard] Loading daftar permohonan for wallet:', walletAddress);
      const data = await contractService.getDaftarPermohonan(walletAddress);
      console.log('✅ [CitizenDashboard] Daftar permohonan loaded:', data.length, 'items');
      setPermohonans(data);
    } catch (error) {
      console.log('⚠️ [CitizenDashboard] No permohonan data available, setting empty array');
      setPermohonans([]);
    }
  };

  const loadDokumenResmi = async () => {
    try {
      console.log('📄 [CitizenDashboard] Loading dokumen resmi for wallet:', walletAddress);
      const data = await contractService.getDokumenResmi(walletAddress);
      console.log('✅ [CitizenDashboard] Dokumen resmi loaded:', data.length, 'items');
      console.log('📋 [CitizenDashboard] Dokumen resmi details:', data);
      setDokumenResmi(data);
    } catch (error) {
      console.error('❌ [CitizenDashboard] Error loading dokumen resmi:', error);
      console.log('⚠️ [CitizenDashboard] No dokumen resmi available, setting empty array');
      setDokumenResmi([]);
    }
  };

  const handleSubmitPermohonan = async (e) => {
    e.preventDefault();
    const startTime = Date.now();
    const jenisPermohonanLabels = {
      '0': 'Kelahiran',
      '1': 'Kematian', 
      '2': 'Perkawinan',
      '3': 'Perceraian',
      '4': 'Pindah'
    };
    
    console.log(`🚀 [Submit-Permohonan] Memulai submit permohonan...`);
    console.log(`📋 [Submit-Permohonan] Jenis Permohonan: ${jenisPermohonanLabels[jenisPermohonan]} (${jenisPermohonan})`);
    console.log(`📋 [Submit-Permohonan] Wallet Address: ${walletAddress}`);
    
    if (!jenisPermohonan) {
      console.error(`❌ [Submit-Permohonan] Jenis permohonan tidak dipilih`);
      onPermohonanError('Jenis permohonan wajib diisi');
      return;
    }

    // Check if any files are still uploading
    const isAnyFileUploading = Object.values(uploadingFiles).some(isUploading => isUploading);
    if (isAnyFileUploading) {
      console.error(`❌ [Submit-Permohonan] Masih ada file yang sedang diupload`);
      onPermohonanError('Tunggu sampai semua file selesai diupload');
      return;
    }

    // Check if kalurahan mapping is loaded
    if (kalurahanMapping.length === 0) {
      console.error(`❌ [Submit-Permohonan] Kalurahan mapping belum dimuat`);
      onPermohonanError('Data kalurahan belum dimuat, silakan coba lagi');
      return;
    }

    // Get kalurahan asal ID
    console.log(`🔍 [Submit-Permohonan] Mencari ID Kalurahan asal...`);
    console.log(`📋 [Submit-Permohonan] Citizen Data:`, citizenData);
    console.log(`📋 [Submit-Permohonan] KK Data:`, citizenData?.kkData);
    console.log(`📋 [Submit-Permohonan] Alamat Lengkap:`, citizenData?.kkData?.alamatLengkap);
    console.log(`📋 [Submit-Permohonan] Kalurahan Mapping:`, kalurahanMapping);
    console.log(`📋 [Submit-Permohonan] Available Kalurahan Names:`, kalurahanMapping.map(k => k.nama));
    
    const kelurahanName = citizenData?.kkData?.alamatLengkap?.kelurahan || '';
    console.log(`📋 [Submit-Permohonan] Kelurahan Name from Data: "${kelurahanName}"`);
    
    const idKalurahanAsal = getIdKalurahanByNama(kelurahanName);
    console.log(`📋 [Submit-Permohonan] Kalurahan Asal: "${kelurahanName}" -> ID: ${idKalurahanAsal}`);
    
    if (!idKalurahanAsal) {
      console.error(`❌ [Submit-Permohonan] ID Kalurahan asal tidak ditemukan`);
      console.error(`❌ [Submit-Permohonan] Kelurahan name: "${kelurahanName}"`);
      console.error(`❌ [Submit-Permohonan] Available names:`, kalurahanMapping.map(k => `"${k.nama}"`));
      onPermohonanError('ID Kalurahan asal tidak ditemukan');
      return;
    }

    setIsLoading(true);
    try {
      let cidIPFS;
      let idKalurahanTujuan = 0;

      // Handle permohonan pindah separately
      if (jenisPermohonan === '4') {
        console.log(`🔄 [Submit-Permohonan] Processing permohonan pindah...`);
        
        if (!jenisPindah) {
          console.error(`❌ [Submit-Permohonan] Jenis pindah tidak dipilih`);
          onPermohonanError('Jenis pindah wajib dipilih');
          setIsLoading(false);
          return;
        }

        // Tambahkan validasi dan log untuk nikKepalaKeluargaTujuan pada pindah gabung KK
        if (jenisPindah === '2') {
          console.log('[DEBUG] nikKepalaKeluargaTujuan sebelum submit:', nikKepalaKeluargaTujuan);
          if (!nikKepalaKeluargaTujuan || nikKepalaKeluargaTujuan.trim() === '') {
            onPermohonanError('NIK Kepala Keluarga Tujuan wajib diisi untuk permohonan gabung KK');
            setIsLoading(false);
            return;
          }
        }

        // Get kalurahan tujuan ID for pindah
        let idKalurahanTujuanLocal = '';
        if (jenisPindah === '2') {
          // Gabung KK: ambil nama kalurahan dari KK tujuan berdasarkan NIK
          try {
            const mapping = await loadNIKMapping(contractService);
            const cidKKTujuan = mapping[nikKepalaKeluargaTujuan];
            if (!cidKKTujuan) {
              onPermohonanError('NIK Kepala Keluarga Tujuan tidak ditemukan di sistem');
              setIsLoading(false);
              return;
            }
            const encryptedData = await fetchFromIPFS(cidKKTujuan);
            const kkTujuan = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
            const namaKalurahanTujuan = kkTujuan?.alamatLengkap?.kelurahan;
            if (!namaKalurahanTujuan) {
              onPermohonanError('Data kalurahan tujuan tidak ditemukan di KK tujuan');
              setIsLoading(false);
              return;
            }
            idKalurahanTujuanLocal = getIdKalurahanByNama(namaKalurahanTujuan);
            console.log(`📋 [Submit-Permohonan] Kalurahan Tujuan (Gabung KK): ${namaKalurahanTujuan} -> ID: ${idKalurahanTujuanLocal}`);
            if (!idKalurahanTujuanLocal) {
              onPermohonanError('ID Kalurahan tujuan tidak ditemukan');
              setIsLoading(false);
              return;
            }
            console.log('[Submit-PindahGabungKK] NIK Kepala Keluarga Tujuan:', nikKepalaKeluargaTujuan);
          } catch (e) {
            onPermohonanError('Gagal mengambil data KK tujuan');
            setIsLoading(false);
            return;
          }
        } else {
          idKalurahanTujuanLocal = getIdKalurahanByNama(kalurahanBaru);
          console.log(`📋 [Submit-Permohonan] Kalurahan Tujuan: ${kalurahanBaru} -> ID: ${idKalurahanTujuanLocal}`);
          if (!idKalurahanTujuanLocal) {
            console.error(`❌ [Submit-Permohonan] ID Kalurahan tujuan tidak ditemukan`);
            onPermohonanError('ID Kalurahan tujuan tidak ditemukan');
            setIsLoading(false);
            return;
          }
        }
        idKalurahanTujuan = idKalurahanTujuanLocal;

        // Collect pindah form data
        console.log(`📝 [Submit-Permohonan] Mengumpulkan data form pindah...`);
        const pindahFormData = collectFormData(jenisPermohonan);
        console.log('[DEBUG] Data yang akan dikirim ke IPFS:', pindahFormData);
        if (alasanPindah === 'Lainnya' && alasanPindahLainnya) {
          pindahFormData.alasanPindahLainnya = alasanPindahLainnya;
        }
        if (jenisPindah === '1' && nikKepalaKeluargaBaru) {
          pindahFormData.nikKepalaKeluargaBaru = nikKepalaKeluargaBaru;
        }
        console.log('[Submit-PindahGabungKK] NIK Kepala Keluarga Tujuan:', nikKepalaKeluargaTujuan);
        console.log('[Submit-PindahGabungKK] Data yang dikirim:', pindahFormData);
        console.log(`📋 [Submit-Permohonan] Pindah Form Data:`, pindahFormData);

        // Process and upload pindah data
        console.log(`☁️ [Submit-Permohonan] Memulai upload data pindah ke IPFS...`);
        cidIPFS = await processAndUploadPermohonanData(
          jenisPermohonan, 
          pindahFormData, 
          walletAddress, 
          jenisPindah
        );
        console.log(`✅ [Submit-Permohonan] IPFS upload berhasil, CID: ${cidIPFS}`);

        // Submit to smart contract
        console.log(`📜 [Submit-Permohonan] Submitting ke smart contract...`);
        const contractStartTime = Date.now();
        const result = await contractService.submitPermohonanPindah(
          cidIPFS,
          idKalurahanAsal,
          idKalurahanTujuan,
          parseInt(jenisPindah)
        );
        const contractEndTime = Date.now();
        console.log(`✅ [Submit-Permohonan] Smart contract submission berhasil dalam ${contractEndTime - contractStartTime}ms`);
        console.log(`🔗 [Submit-Permohonan] Transaction Hash: ${result.transactionHash}`);

        onPermohonanSuccess(`Permohonan pindah berhasil diajukan! Transaction: ${result.transactionHash}`);
        
        // Reset pindah form
        console.log(`🔄 [Submit-Permohonan] Resetting form...`);
        resetFormData('4');
        setJenisPermohonan('');
        setJenisPindah('');
      } else {
        console.log(`🔄 [Submit-Permohonan] Processing permohonan ${jenisPermohonanLabels[jenisPermohonan]}...`);
        
        // Handle other permohonan types
        console.log(`📝 [Submit-Permohonan] Mengumpulkan data form...`);
        const formData = collectFormData(jenisPermohonan);
        console.log(`📋 [Submit-Permohonan] Form Data Keys:`, Object.keys(formData));
        
        // Process and upload data
        console.log(`☁️ [Submit-Permohonan] Memulai upload data ke IPFS...`);
        cidIPFS = await processAndUploadPermohonanData(
          jenisPermohonan, 
          formData, 
          walletAddress,
          jenisPindah
        );
        console.log(`✅ [Submit-Permohonan] IPFS upload berhasil, CID: ${cidIPFS}`);

        // Submit to smart contract
        console.log(`📜 [Submit-Permohonan] Submitting ke smart contract...`);
        const contractStartTime = Date.now();
        const result = await contractService.submitPermohonan(
          parseInt(jenisPermohonan),
          cidIPFS,
          idKalurahanAsal,
          idKalurahanTujuan,
          0 // jenisPindah default for non-pindah permohonan
        );
        const contractEndTime = Date.now();
        console.log(`✅ [Submit-Permohonan] Smart contract submission berhasil dalam ${contractEndTime - contractStartTime}ms`);
        console.log(`🔗 [Submit-Permohonan] Transaction Hash: ${result.transactionHash}`);

        onPermohonanSuccess(`Permohonan berhasil diajukan! Transaction: ${result.transactionHash}`);
        
        // Reset form
        console.log(`🔄 [Submit-Permohonan] Resetting form...`);
        resetFormData(jenisPermohonan);
        setJenisPermohonan('');
      }

      // Reload data
      console.log(`🔄 [Submit-Permohonan] Reloading daftar permohonan...`);
      loadDaftarPermohonan();
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [Submit-Permohonan] Submit permohonan berhasil dalam ${totalTime}ms!`);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [Submit-Permohonan] Error dalam ${totalTime}ms:`, error);
      console.error(`❌ [Submit-Permohonan] Error stack:`, error.stack);
      const errorMessage = error.message || handleContractError(error);
      onPermohonanError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermohonanClick = async (id) => {
    try {
      const detail = await contractService.getPermohonanDetail(id);
      setSelectedPermohonan(detail);
      setShowPermohonanDetail(true);
      
      // Load detailed data from IPFS
      if (detail.cidIPFS && detail.cidIPFS !== 'dummy-cid') {
        setLoadingDetailData(true);
        try {
          const detailData = await loadPermohonanDataForDisplay(detail.cidIPFS);
          setPermohonanDetailData(detailData);
        } catch (error) {
          console.error('Failed to load IPFS data:', error);
          setPermohonanDetailData(null);
        } finally {
          setLoadingDetailData(false);
        }
      } else {
        setPermohonanDetailData(null);
      }
    } catch (error) {
      console.error('Failed to get permohonan detail:', error);
      onPermohonanError('Gagal memuat detail permohonan');
    }
  };

  const closePermohonanDetail = () => {
    setShowPermohonanDetail(false);
    setSelectedPermohonan(null);
    setPermohonanDetailData(null);
    setLoadingDetailData(false);
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
      onPermohonanError('Gagal memuat file untuk ditampilkan');
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

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getJenisPermohonanLabel = (jenis) => {
    const jenisMap = {
      '0': 'Kelahiran',
      '1': 'Kematian', 
      '2': 'Perkawinan',
      '3': 'Perceraian',
      '4': 'Pindah'
    };
    return jenisMap[jenis] || jenis;
  };

  // Tambahkan helper untuk label jenis pindah
  const getJenisPindahLabel = (jenisPindah) => {
    if (jenisPindah === undefined || jenisPindah === null) return '';
    if (jenisPindah === 0 || jenisPindah === '0') return 'Pindah Seluruh Keluarga';
    if (jenisPindah === 1 || jenisPindah === '1') return 'Pindah Mandiri';
    if (jenisPindah === 2 || jenisPindah === '2') return 'Pindah Gabung KK';
    return '';
  };

  // Helper function untuk cek apakah file sedang diupload
  const isFileUploading = (jenisPermohonan, fieldName) => {
    const uploadKey = `${jenisPermohonan}_${fieldName}`;
    return uploadingFiles[uploadKey] || false;
  };

  const [parentNames, setParentNames] = useState({ ayah: '-', ibu: '-' });
  const [parentLoading, setParentLoading] = useState(false);

  // Cari anggota dan anggotaArr di level atas agar bisa dipakai useEffect
  const kkData = citizenData?.kkData;
  const nikUser = citizenData?.nik;
  const anggotaArr = Array.isArray(kkData?.anggota) ? kkData.anggota : [];
  const anggota = anggotaArr.find(member => member.nik === nikUser) || null;
  
  // Debug logging
  console.log('🔍 [CitizenDashboard] Debug data:', {
    citizenData,
    nikUser,
    kkData,
    anggotaArr: anggotaArr.length,
    anggota,
    anggotaNIKs: anggotaArr.map(a => a.nik)
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchParents() {
      if (!anggota) {
        console.log('⚠️ [CitizenDashboard] No anggota data available for parent lookup');
        setParentNames({ ayah: '-', ibu: '-' });
        return;
      }
      
      console.log('🔍 [CitizenDashboard] Looking up parents for:', anggota.nama);
      console.log('📋 [CitizenDashboard] NIK Ayah:', anggota.nikAyah);
      console.log('📋 [CitizenDashboard] NIK Ibu:', anggota.nikIbu);
      
      setParentLoading(true);
      const mapping = await loadNIKMapping(contractService);
      console.log('📋 [CitizenDashboard] NIK mapping loaded, available NIKs:', Object.keys(mapping).length);
      async function lookupParentName(nik) {
        if (!nik) return '-';
        const cid = mapping[nik];
        if (!cid) return '-';
        try {
          const encrypted = await fetchFromIPFS(cid);
          const data = await decryptAes256CbcNodeStyle(encrypted, CRYPTO_CONFIG.SECRET_KEY);
          
          // Parse JSON jika masih berupa string
          let parsedData = data;
          if (typeof data === 'string') {
            try {
              parsedData = JSON.parse(data);
            } catch (error) {
              console.error('❌ [CitizenDashboard] Failed to parse parent data JSON:', error);
              return '-';
            }
          }
          
          const arr = Array.isArray(parsedData?.anggota) ? parsedData.anggota : [];
          const found = arr.find(m => m.nik === nik);
          return found?.nama || '-';
        } catch (error) {
          console.error('❌ [CitizenDashboard] Error looking up parent name for NIK:', nik, error);
          return '-';
        }
      }
      const [ayah, ibu] = await Promise.all([
        lookupParentName(anggota.nikAyah),
        lookupParentName(anggota.nikIbu)
      ]);
      
      console.log('✅ [CitizenDashboard] Parent lookup results:');
      console.log('👨 Ayah:', ayah);
      console.log('👩 Ibu:', ibu);
      
      if (!cancelled) setParentNames({ ayah, ibu });
      setParentLoading(false);
    }
    fetchParents();
    return () => { cancelled = true; };
  }, [anggota?.nikAyah, anggota?.nikIbu, kkData]);

  // Tambahkan state untuk mapping kalurahan
  const [kalurahanMapping, setKalurahanMapping] = useState([]);
  const [isLoadingKalurahan, setIsLoadingKalurahan] = useState(false);

  // Fetch mapping kalurahan dari IPFS via CID di smart contract
  useEffect(() => {
    async function fetchKalurahanMapping() {
      console.log(`🔄 [Kalurahan-Mapping] Starting to fetch kalurahan mapping...`);
      if (!contractService || !contractService.contract) {
        console.log(`❌ [Kalurahan-Mapping] Contract service not available`);
        return;
      }
      setIsLoadingKalurahan(true);
      try {
        // Ambil CID dari smart contract
        console.log(`🔍 [Kalurahan-Mapping] Getting CID from smart contract...`);
        const cid = await contractService.contract.getKalurahanMappingCID();
        console.log(`📋 [Kalurahan-Mapping] CID from contract: ${cid}`);
        
        if (!cid) {
          console.log(`⚠️ [Kalurahan-Mapping] No CID found in contract`);
          setKalurahanMapping([]);
          return;
        }
        
        // Fetch file dari IPFS
        console.log(`🌐 [Kalurahan-Mapping] Fetching from IPFS: https://ipfs.io/ipfs/${cid}`);
        const url = `https://ipfs.io/ipfs/${cid}`;
        const resp = await fetch(url);
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        // Ambil data terenkripsi dari IPFS
        const encryptedData = await resp.text();
        console.log(`🔐 [Kalurahan-Mapping] Encrypted data fetched from IPFS`);
        
        // Dekripsi data
        console.log(`🔓 [Kalurahan-Mapping] Decrypting kalurahan mapping...`);
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log(`✅ [Kalurahan-Mapping] Mapping decrypted successfully`);
        
        // Parse JSON dari data yang sudah didekripsi
        const data = JSON.parse(decryptedData);
        console.log(`✅ [Kalurahan-Mapping] Successfully loaded ${data.length} kalurahan mappings:`, data);
        setKalurahanMapping(data);
      } catch (e) {
        console.error(`❌ [Kalurahan-Mapping] Error fetching kalurahan mapping:`, e);
        setKalurahanMapping([]);
      } finally {
        setIsLoadingKalurahan(false);
      }
    }
    fetchKalurahanMapping();
  }, [contractService]);

  // Helper: dapatkan id dari nama kalurahan
  const getIdKalurahanByNama = (nama) => {
    if (!nama || !kalurahanMapping || kalurahanMapping.length === 0) {
      return '';
    }
    
    const cleanNama = nama.trim();
    console.log(`🔍 [Kalurahan-Lookup] Looking for: "${cleanNama}"`);
    
    // Try exact match first
    let found = kalurahanMapping.find(k => k.nama === cleanNama);
    if (found) {
      console.log(`✅ [Kalurahan-Lookup] Exact match found: ${found.nama} -> ID: ${found.id}`);
      return found.id;
    }
    
    // Try case-insensitive match
    found = kalurahanMapping.find(k => k.nama.toLowerCase() === cleanNama.toLowerCase());
    if (found) {
      console.log(`✅ [Kalurahan-Lookup] Case-insensitive match found: ${found.nama} -> ID: ${found.id}`);
      return found.id;
    }
    
    // Try partial match (contains)
    found = kalurahanMapping.find(k => k.nama.toLowerCase().includes(cleanNama.toLowerCase()) || cleanNama.toLowerCase().includes(k.nama.toLowerCase()));
    if (found) {
      console.log(`✅ [Kalurahan-Lookup] Partial match found: ${found.nama} -> ID: ${found.id}`);
      return found.id;
    }
    
    console.log(`❌ [Kalurahan-Lookup] No match found for: "${cleanNama}"`);
    console.log(`📋 [Kalurahan-Lookup] Available names:`, kalurahanMapping.map(k => `"${k.nama}"`));
    return '';
  };

  // Helper: collect form data based on jenis permohonan
  const collectFormData = (jenisPermohonan) => {
    // Helper function to extract CID from file info
    const getCID = (fileInfo) => {
      if (!fileInfo) return null;
      if (typeof fileInfo === 'string') return fileInfo; // Backward compatibility
      return fileInfo.cid;
    };

    switch(jenisPermohonan) {
      case '0': return {
        namaAnak: formDataKelahiran.namaAnak,
        tempatLahirAnak: formDataKelahiran.tempatLahirAnak,
        tanggalLahirAnak: formDataKelahiran.tanggalLahirAnak,
        jamLahirAnak: formDataKelahiran.jamLahirAnak,
        nikAyah: formDataKelahiran.nikAyah,
        nikIbu: formDataKelahiran.nikIbu,
        nikSaksi1: formDataKelahiran.nikSaksi1,
        nikSaksi2: formDataKelahiran.nikSaksi2,
        suratKeteranganLahir: getCID(formDataKelahiran.suratKeteranganLahir)
      };
      case '1': return {
        nikAlmarhum: formDataKematian.nikAlmarhum,
        nikPelapor: formDataKematian.nikPelapor,
        nikSaksi1: formDataKematian.nikSaksi1,
        nikSaksi2: formDataKematian.nikSaksi2,
        hubunganPelapor: formDataKematian.hubunganPelapor,
        tempatKematian: formDataKematian.tempatKematian,
        tanggalKematian: formDataKematian.tanggalKematian,
        penyebabKematian: formDataKematian.penyebabKematian,
        suratKeteranganKematian: getCID(formDataKematian.suratKeteranganKematian)
      };
      case '2': return {
        nikPria: formDataPerkawinan.nikPria,
        nikWanita: formDataPerkawinan.nikWanita,
        nikSaksi1: formDataPerkawinan.nikSaksi1,
        nikSaksi2: formDataPerkawinan.nikSaksi2,
        tempatPernikahan: formDataPerkawinan.tempatPernikahan,
        tanggalPernikahan: formDataPerkawinan.tanggalPernikahan,
        suratKeteranganPernikahan: getCID(formDataPerkawinan.suratKeteranganPernikahan),
        fotoPria: getCID(formDataPerkawinan.fotoPria),
        fotoWanita: getCID(formDataPerkawinan.fotoWanita)
      };
      case '3': return {
        nikSuami: formDataPerceraian.nikSuami,
        nikIstri: formDataPerceraian.nikIstri,
        suratPutusanPengadilan: getCID(formDataPerceraian.suratPutusanPengadilan)
      };
      case '4':
        // Untuk pindah seluruh keluarga, mandiri, atau gabung KK, kirim alamatTujuan sebagai objek lengkap
        if (jenisPindah === '0' || jenisPindah === '1' || jenisPindah === '2') {
          return {
            alamatTujuan: {
              alamat: alamatBaru,
              kalurahan: kalurahanBaru,
              kecamatan: kecamatanBaru,
              kabupaten: kabupatenBaru,
              provinsi: provinsiBaru
            },
            kalurahanTujuan: kalurahanBaru,
            alasanPindah,
            alasanPindahLainnya,
            anggotaPindah,
            nikKepalaKeluargaBaru,
            nikKepalaKeluargaTujuan
          };
        }
        // Default: tetap seperti sebelumnya
        return {
          alamatTujuan: alamatBaru,
          kalurahanTujuan: kalurahanBaru,
          alasanPindah,
          alasanPindahLainnya,
          anggotaPindah,
          nikKepalaKeluargaBaru,
          nikKepalaKeluargaTujuan
        };
      default: return {};
    }
  };

  // Helper: reset form data
  const resetFormData = (jenisPermohonan) => {
    switch(jenisPermohonan) {
      case '0':
        setFormDataKelahiran({
          namaAnak: '', tempatLahirAnak: '', tanggalLahirAnak: '', jamLahirAnak: '',
          nikAyah: '', nikIbu: '', nikSaksi1: '', nikSaksi2: '', suratKeteranganLahir: null
        });
        break;
      case '1':
        setFormDataKematian({
          nikAlmarhum: '', nikPelapor: '', nikSaksi1: '', nikSaksi2: '',
          hubunganPelapor: '', tempatKematian: '', tanggalKematian: '',
          penyebabKematian: '', suratKeteranganKematian: null
        });
        break;
      case '2':
        setFormDataPerkawinan({
          nikPria: '', nikWanita: '', nikSaksi1: '', nikSaksi2: '',
          tempatPernikahan: '', tanggalPernikahan: '',
          suratKeteranganPernikahan: null, fotoPria: null, fotoWanita: null
        });
        break;
      case '3':
        setFormDataPerceraian({
          nikSuami: '', nikIstri: '', suratPutusanPengadilan: null
        });
        break;
      case '4':
        setAlamatBaru('');
        setKalurahanBaru('');
        setKecamatanBaru('');
        setKabupatenBaru('');
        setProvinsiBaru('');
        setAlasanPindah('');
        setAlasanPindahLainnya('');
        setAnggotaPindah([]);
        setNikKepalaKeluargaBaru('');
        setNikKepalaKeluargaTujuan('');
        setJenisPindah('');
        break;
    }
    setFormErrors({});
  };

  // Helper: handle file upload
  const handleFileUpload = async (file, jenisPermohonan, fieldName) => {
    const startTime = Date.now();
    const jenisPermohonanLabels = {
      '0': 'Kelahiran',
      '1': 'Kematian', 
      '2': 'Perkawinan',
      '3': 'Perceraian',
      '4': 'Pindah'
    };
    
    const uploadKey = `${jenisPermohonan}_${fieldName}`;
    
    console.log(`📁 [File-Upload] Memulai upload file...`);
    console.log(`📋 [File-Upload] File: ${file.name} (${file.size} bytes)`);
    console.log(`📋 [File-Upload] Type: ${file.type}`);
    console.log(`📋 [File-Upload] Jenis Permohonan: ${jenisPermohonanLabels[jenisPermohonan]}`);
    console.log(`📋 [File-Upload] Field: ${fieldName}`);
    
    // Set uploading state
    setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));
    
    try {
      // Convert file to base64 first
      console.log(`🔄 [File-Upload] Converting file to base64...`);
      const base64 = await convertFileToBase64(file);
      console.log(`✅ [File-Upload] Base64 conversion berhasil (${base64.length} characters)`);
      
      // Encrypt the base64 data
      console.log(`🔐 [File-Upload] Encrypting file data...`);
      const encryptStartTime = Date.now();
      const encryptedData = await encryptAes256CbcNodeStyle(base64, CRYPTO_CONFIG.SECRET_KEY);
      const encryptEndTime = Date.now();
      console.log(`✅ [File-Upload] Encryption berhasil dalam ${encryptEndTime - encryptStartTime}ms`);
      console.log(`📊 [File-Upload] Encrypted data size: ${encryptedData.length} characters`);
      
      // Generate random UUID filename
      console.log(`🆔 [File-Upload] Generating random UUID filename...`);
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
      
      const filename = `${generateUUID()}.enc`;
      console.log(`📁 [File-Upload] Generated filename: ${filename}`);
      
      // Upload encrypted data to IPFS
      console.log(`☁️ [File-Upload] Uploading encrypted data to IPFS...`);
      const uploadStartTime = Date.now();
      const cidIPFS = await uploadToPinata(encryptedData, filename);
      const uploadEndTime = Date.now();
      
      console.log(`✅ [File-Upload] IPFS upload berhasil dalam ${uploadEndTime - uploadStartTime}ms`);
      console.log(`🔗 [File-Upload] IPFS CID: ${cidIPFS}`);
      console.log(`🔗 [File-Upload] IPFS URL: https://ipfs.io/ipfs/${cidIPFS}`);
      
      // Save CID to form state with file extension info
      console.log(`💾 [File-Upload] Saving CID to form state...`);
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const fileInfo = {
        cid: cidIPFS,
        originalName: file.name,
        extension: fileExtension
      };
      
      switch(jenisPermohonan) {
        case '0':
          setFormDataKelahiran(prev => ({ ...prev, [fieldName]: fileInfo }));
          break;
        case '1':
          setFormDataKematian(prev => ({ ...prev, [fieldName]: fileInfo }));
          break;
        case '2':
          setFormDataPerkawinan(prev => ({ ...prev, [fieldName]: fileInfo }));
          break;
        case '3':
          setFormDataPerceraian(prev => ({ ...prev, [fieldName]: fileInfo }));
          break;
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [File-Upload] File upload berhasil dalam ${totalTime}ms`);
      onPermohonanSuccess(`File ${file.name} berhasil dienkripsi dan diupload ke IPFS!`);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [File-Upload] Error dalam ${totalTime}ms:`, error);
      console.error(`❌ [File-Upload] Error stack:`, error.stack);
      onPermohonanError('Gagal mengupload file ke IPFS');
    } finally {
      // Clear uploading state
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const renderProfile = () => {
    if (!citizenData) {
      return <div className="loading">Memuat data warga...</div>;
    }

    // Gunakan parentNames dan parentLoading di sini
    // Gabungkan alamat lengkap
    let alamatLengkap = '';
    if (kkData && kkData.alamatLengkap) {
      const a = kkData.alamatLengkap;
      alamatLengkap = `${a.alamat}, RT ${a.rt}/RW ${a.rw}, ${a.kelurahan}, ${a.kecamatan}, ${a.kabupaten}, ${a.provinsi}, ${a.kodePos}`;
    }

    // Gabungkan tempat dan tanggal lahir
    let tempatTanggalLahir = '-';
    if (anggota?.tempatLahir && anggota?.tanggalLahir) {
      const tanggal = new Date(anggota.tanggalLahir);
      const tanggalStr = tanggal.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      tempatTanggalLahir = `${anggota.tempatLahir}, ${tanggalStr}`;
    }

    // Konversi jenis kelamin
    let jenisKelamin = anggota?.jenisKelamin || '-';
    if (jenisKelamin === 'L') jenisKelamin = 'Laki-Laki';
    else if (jenisKelamin === 'P') jenisKelamin = 'Perempuan';

    return (
      <div className="profile-section">
        <div className="management-card">
          <div className="profile-info-2col">
            <div className="profile-col profile-col-left">
              <div className="info-pair"><span className="info-label">Nomor KK</span><span className="info-value">{kkData?.kk || '-'}</span></div>
              <div className="info-pair"><span className="info-label">NIK</span><span className="info-value">{nikUser}</span></div>
              <div className="info-pair"><span className="info-label">Nama</span><span className="info-value">{anggota?.nama || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Tempat, Tanggal Lahir</span><span className="info-value">{tempatTanggalLahir}</span></div>
              <div className="info-pair"><span className="info-label">Jenis Kelamin</span><span className="info-value">{jenisKelamin}</span></div>
              <div className="info-pair"><span className="info-label">Pendidikan</span><span className="info-value">{anggota?.pendidikan || '-'}</span></div>
            </div>
            <div className="profile-divider" />
            <div className="profile-col profile-col-right">
              <div className="info-pair"><span className="info-label">Jenis Pekerjaan</span><span className="info-value">{anggota?.jenisPekerjaan || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Kewarganegaraan</span><span className="info-value">{anggota?.kewarganegaraan || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Hubungan Keluarga</span><span className="info-value">{anggota?.statusHubunganKeluarga || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Nama Ayah</span><span className="info-value">{parentLoading ? 'Memuat...' : parentNames.ayah}</span></div>
              <div className="info-pair"><span className="info-label">Nama Ibu</span><span className="info-value">{parentLoading ? 'Memuat...' : parentNames.ibu}</span></div>
              <div className="info-pair"><span className="info-label">Alamat Wallet</span><span className="info-value">{formatAddress(citizenData.walletAddress)}</span></div>
            </div>
          </div>
          <div className="profile-address-row">
            <span className="info-label">Alamat Lengkap</span>
            <span className="info-value" style={{textAlign: 'left'}}>{alamatLengkap || '-'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAjukanPermohonan = () => {
    return (
      <div className="ajukan-section">
        <div className="management-card">
          <form onSubmit={handleSubmitPermohonan} className="management-form">
            <div className="form-group">
              <label htmlFor="jenisPermohonan">Jenis Permohonan:</label>
              <select
                id="jenisPermohonan"
                value={jenisPermohonan}
                onChange={(e) => setJenisPermohonan(e.target.value)}
                className="form-input"
                disabled={isLoading}
                required
              >
                <option value="">Pilih jenis permohonan</option>
                <option value="0">Kelahiran</option>
                <option value="1">Kematian</option>
                <option value="2">Perkawinan</option>
                <option value="3">Perceraian</option>
                <option value="4">Pindah</option>
              </select>
            </div>

            {jenisPermohonan === '0' && (
              <>
                <div className="form-group">
                  <label htmlFor="namaAnak">Nama Lengkap Anak</label>
                  <input
                    type="text"
                    id="namaAnak"
                    value={formDataKelahiran.namaAnak}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, namaAnak: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.namaAnak && <span className="error">{formErrors.namaAnak}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tempatLahirAnak">Tempat Lahir</label>
                  <input
                    type="text"
                    id="tempatLahirAnak"
                    value={formDataKelahiran.tempatLahirAnak}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, tempatLahirAnak: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.tempatLahirAnak && <span className="error">{formErrors.tempatLahirAnak}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalLahirAnak">Tanggal Lahir</label>
                  <input
                    type="date"
                    id="tanggalLahirAnak"
                    value={formDataKelahiran.tanggalLahirAnak}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, tanggalLahirAnak: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.tanggalLahirAnak && <span className="error">{formErrors.tanggalLahirAnak}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="jamLahirAnak">Jam Lahir</label>
                  <input
                    type="time"
                    id="jamLahirAnak"
                    value={formDataKelahiran.jamLahirAnak}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, jamLahirAnak: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.jamLahirAnak && <span className="error">{formErrors.jamLahirAnak}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikAyah">NIK Ayah</label>
                  <input
                    type="text"
                    id="nikAyah"
                    value={formDataKelahiran.nikAyah}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, nikAyah: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikAyah && <span className="error">{formErrors.nikAyah}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikIbu">NIK Ibu</label>
                  <input
                    type="text"
                    id="nikIbu"
                    value={formDataKelahiran.nikIbu}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, nikIbu: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikIbu && <span className="error">{formErrors.nikIbu}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    value={formDataKelahiran.nikSaksi1}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, nikSaksi1: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi1 && <span className="error">{formErrors.nikSaksi1}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    value={formDataKelahiran.nikSaksi2}
                    onChange={(e) => setFormDataKelahiran(prev => ({ ...prev, nikSaksi2: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi2 && <span className="error">{formErrors.nikSaksi2}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganLahir">Surat Keterangan Lahir</label>
                  <input
                    type="file"
                    id="suratKeteranganLahir"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '0', 'suratKeteranganLahir');
                      }
                    }}
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                    disabled={isFileUploading('0', 'suratKeteranganLahir')}
                  />
                  {isFileUploading('0', 'suratKeteranganLahir') && (
                    <span className="upload-status">📤 Mengupload file...</span>
                  )}
                  {formDataKelahiran.suratKeteranganLahir && !isFileUploading('0', 'suratKeteranganLahir') && (
                    <span className="upload-status success">✅ File berhasil diupload</span>
                  )}
                  {formErrors.suratKeteranganLahir && <span className="error">{formErrors.suratKeteranganLahir}</span>}
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '1' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikAlmarhum">NIK Almarhum/Almarhumah</label>
                  <input
                    type="text"
                    id="nikAlmarhum"
                    value={formDataKematian.nikAlmarhum}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, nikAlmarhum: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikAlmarhum && <span className="error">{formErrors.nikAlmarhum}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikPelapor">NIK Pelapor</label>
                  <input
                    type="text"
                    id="nikPelapor"
                    value={formDataKematian.nikPelapor}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, nikPelapor: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikPelapor && <span className="error">{formErrors.nikPelapor}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    value={formDataKematian.nikSaksi1}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, nikSaksi1: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi1 && <span className="error">{formErrors.nikSaksi1}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    value={formDataKematian.nikSaksi2}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, nikSaksi2: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi2 && <span className="error">{formErrors.nikSaksi2}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="hubunganPelapor">Hubungan Pelapor</label>
                  <input
                    type="text"
                    id="hubunganPelapor"
                    value={formDataKematian.hubunganPelapor}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, hubunganPelapor: e.target.value }))}
                    className="form-input"
                    placeholder="Contoh: Anak, Suami, Istri, dll"
                    required
                  />
                  {formErrors.hubunganPelapor && <span className="error">{formErrors.hubunganPelapor}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tempatKematian">Tempat Kematian</label>
                  <input
                    type="text"
                    id="tempatKematian"
                    value={formDataKematian.tempatKematian}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, tempatKematian: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.tempatKematian && <span className="error">{formErrors.tempatKematian}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalKematian">Tanggal Kematian</label>
                  <input
                    type="date"
                    id="tanggalKematian"
                    value={formDataKematian.tanggalKematian}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, tanggalKematian: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.tanggalKematian && <span className="error">{formErrors.tanggalKematian}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="penyebabKematian">Penyebab Kematian</label>
                  <textarea
                    id="penyebabKematian"
                    value={formDataKematian.penyebabKematian}
                    onChange={(e) => setFormDataKematian(prev => ({ ...prev, penyebabKematian: e.target.value }))}
                    className="form-input"
                    rows="3"
                    placeholder="Jelaskan penyebab kematian"
                    required
                  />
                  {formErrors.penyebabKematian && <span className="error">{formErrors.penyebabKematian}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganKematian">Surat Keterangan Kematian</label>
                  <input
                    type="file"
                    id="suratKeteranganKematian"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '1', 'suratKeteranganKematian');
                      }
                    }}
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                  {formErrors.suratKeteranganKematian && <span className="error">{formErrors.suratKeteranganKematian}</span>}
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '2' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikPria">NIK Calon Pengantin Pria</label>
                  <input
                    type="text"
                    id="nikPria"
                    value={formDataPerkawinan.nikPria}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, nikPria: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikPria && <span className="error">{formErrors.nikPria}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikWanita">NIK Calon Pengantin Wanita</label>
                  <input
                    type="text"
                    id="nikWanita"
                    value={formDataPerkawinan.nikWanita}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, nikWanita: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikWanita && <span className="error">{formErrors.nikWanita}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    value={formDataPerkawinan.nikSaksi1}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, nikSaksi1: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi1 && <span className="error">{formErrors.nikSaksi1}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    value={formDataPerkawinan.nikSaksi2}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, nikSaksi2: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSaksi2 && <span className="error">{formErrors.nikSaksi2}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tempatPernikahan">Tempat Pernikahan</label>
                  <input
                    type="text"
                    id="tempatPernikahan"
                    value={formDataPerkawinan.tempatPernikahan}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, tempatPernikahan: e.target.value }))}
                    className="form-input"
                    placeholder="Contoh: Masjid, Kantor Catatan Sipil, dll"
                    required
                  />
                  {formErrors.tempatPernikahan && <span className="error">{formErrors.tempatPernikahan}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalPernikahan">Tanggal Pernikahan</label>
                  <input
                    type="date"
                    id="tanggalPernikahan"
                    value={formDataPerkawinan.tanggalPernikahan}
                    onChange={(e) => setFormDataPerkawinan(prev => ({ ...prev, tanggalPernikahan: e.target.value }))}
                    className="form-input"
                    required
                  />
                  {formErrors.tanggalPernikahan && <span className="error">{formErrors.tanggalPernikahan}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganPernikahan">Surat Keterangan Pernikahan</label>
                  <input
                    type="file"
                    id="suratKeteranganPernikahan"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '2', 'suratKeteranganPernikahan');
                      }
                    }}
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                  {formErrors.suratKeteranganPernikahan && <span className="error">{formErrors.suratKeteranganPernikahan}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="fotoPria">Pas Foto Calon Pengantin Pria</label>
                  <input
                    type="file"
                    id="fotoPria"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '2', 'fotoPria');
                      }
                    }}
                    className="form-input"
                    accept=".jpg,.jpeg,.png"
                    required
                  />
                  {formErrors.fotoPria && <span className="error">{formErrors.fotoPria}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="fotoWanita">Pas Foto Calon Pengantin Wanita</label>
                  <input
                    type="file"
                    id="fotoWanita"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '2', 'fotoWanita');
                      }
                    }}
                    className="form-input"
                    accept=".jpg,.jpeg,.png"
                    required
                  />
                  {formErrors.fotoWanita && <span className="error">{formErrors.fotoWanita}</span>}
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '3' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikSuami">NIK Suami</label>
                  <input
                    type="text"
                    id="nikSuami"
                    value={formDataPerceraian.nikSuami}
                    onChange={(e) => setFormDataPerceraian(prev => ({ ...prev, nikSuami: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikSuami && <span className="error">{formErrors.nikSuami}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="nikIstri">NIK Istri</label>
                  <input
                    type="text"
                    id="nikIstri"
                    value={formDataPerceraian.nikIstri}
                    onChange={(e) => setFormDataPerceraian(prev => ({ ...prev, nikIstri: e.target.value }))}
                    className="form-input"
                    maxLength={16}
                    required
                  />
                  {formErrors.nikIstri && <span className="error">{formErrors.nikIstri}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="suratPutusanPengadilan">Surat Putusan Pengadilan</label>
                  <input
                    type="file"
                    id="suratPutusanPengadilan"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFileUpload(file, '3', 'suratPutusanPengadilan');
                      }
                    }}
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                  {formErrors.suratPutusanPengadilan && <span className="error">{formErrors.suratPutusanPengadilan}</span>}
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '4' && (
              <>
                <div className="form-group">
                  <label htmlFor="jenisPindah">Jenis Pindah</label>
                  <select
                    id="jenisPindah"
                    value={jenisPindah}
                    onChange={e => {
                      setJenisPindah(e.target.value);
                      setAnggotaPindah([]);
                      setPindahSemua(false);
                      setNikKepalaKeluargaBaru('');
                      setNikKepalaKeluargaTujuan('');
                      setAlamatBaru('');
                      setKalurahanBaru('');
                      setKecamatanBaru('');
                      setKabupatenBaru('');
                      setProvinsiBaru('');
                      setAlasanPindah('');
                      setAlasanPindahLainnya('');
                    }}
                    className="form-input"
                    required
                  >
                    <option value="">Pilih Jenis Pindah</option>
                    <option value="0">Pindah Seluruh Keluarga</option>
                    <option value="1">Pindah Mandiri (Buat KK Baru)</option>
                    <option value="2">Pindah Gabung KK</option>
                  </select>
                </div>

                {/* Alur A: Seluruh keluarga */}
                {jenisPindah === '0' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="alamatBaru">Alamat Tujuan</label>
                      <input
                        type="text"
                        id="alamatBaru"
                        value={alamatBaru}
                        onChange={e => setAlamatBaru(e.target.value)}
                        className="form-input"
                        placeholder="Masukkan alamat tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="kalurahanBaru">Kalurahan Tujuan</label>
                      <select
                        id="kalurahanBaru"
                        value={kalurahanBaru}
                        onChange={e => setKalurahanBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kalurahan</option>
                        {kalurahanMapping.map(k => (
                          <option key={k.id} value={k.nama}>{k.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kecamatanBaru">Kecamatan Tujuan</label>
                      <select
                        id="kecamatanBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Gamping">Gamping</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kabupatenBaru">Kabupaten Tujuan</label>
                      <select
                        id="kabupatenBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Sleman">Sleman</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="provinsiBaru">Provinsi Tujuan</label>
                      <select
                        id="provinsiBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Daerah Istimewa Yogyakarta">Daerah Istimewa Yogyakarta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div className="info-text">Seluruh anggota keluarga akan ikut pindah.</div>
                      <ul>
                        {anggotaArr.map(a => (
                          <li key={a.nik}>{a.nama} ({a.nik})</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Alur B: Mandiri */}
                {jenisPindah === '1' && (
                  <>
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div style={{overflowX: 'auto'}}>
                        <table className="anggota-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Nama</th>
                              <th>Hubungan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anggotaArr.map((a, idx) => (
                              <tr key={a.nik || idx}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={anggotaPindah.includes(a.nik)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setAnggotaPindah(prev => [...prev, a.nik]);
                                      } else {
                                        setAnggotaPindah(prev => prev.filter(nik => nik !== a.nik));
                                      }
                                    }}
                                  />
                                </td>
                                <td>{a.nama}</td>
                                <td>{a.statusHubunganKeluarga}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="nikKepalaKeluargaBaru">Pilih Kepala Keluarga Baru</label>
                      <select
                        id="nikKepalaKeluargaBaru"
                        value={nikKepalaKeluargaBaru}
                        onChange={e => setNikKepalaKeluargaBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kepala Keluarga Baru</option>
                        {anggotaArr.filter(a => anggotaPindah.includes(a.nik)).map(a => (
                          <option key={a.nik} value={a.nik}>{a.nama} ({a.nik})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alamatBaru">Alamat Tujuan</label>
                      <input
                        type="text"
                        id="alamatBaru"
                        value={alamatBaru}
                        onChange={e => setAlamatBaru(e.target.value)}
                        className="form-input"
                        placeholder="Masukkan alamat tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="kalurahanBaru">Kalurahan Tujuan</label>
                      <select
                        id="kalurahanBaru"
                        value={kalurahanBaru}
                        onChange={e => setKalurahanBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kalurahan</option>
                        {kalurahanMapping.map(k => (
                          <option key={k.id} value={k.nama}>{k.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kecamatanBaru">Kecamatan Tujuan</label>
                      <select
                        id="kecamatanBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Gamping">Gamping</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kabupatenBaru">Kabupaten Tujuan</label>
                      <select
                        id="kabupatenBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Sleman">Sleman</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="provinsiBaru">Provinsi Tujuan</label>
                      <select
                        id="provinsiBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Daerah Istimewa Yogyakarta">Daerah Istimewa Yogyakarta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Alur C: Gabung KK */}
                {jenisPindah === '2' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="nikKepalaKeluargaTujuan">NIK Kepala Keluarga Tujuan</label>
                      <input
                        type="text"
                        id="nikKepalaKeluargaTujuan"
                        value={nikKepalaKeluargaTujuan}
                        onChange={async (e) => {
                          setNikKepalaKeluargaTujuan(e.target.value);
                          // Ambil alamat & kalurahan tujuan dari data KK tujuan (IPFS)
                          const mapping = await loadNIKMapping(contractService);
                          const cidKKTujuan = mapping[e.target.value];
                          if (cidKKTujuan) {
                            const encryptedData = await fetchFromIPFS(cidKKTujuan);
                            const kkTujuan = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
                            setAlamatBaru(kkTujuan?.alamatLengkap?.alamat || '');
                            setKalurahanBaru(kkTujuan?.alamatLengkap?.kelurahan || '');
                            // Tambahan: simpan kecamatan, kabupaten, provinsi ke state
                            setKecamatanBaru(kkTujuan?.alamatLengkap?.kecamatan || '');
                            setKabupatenBaru(kkTujuan?.alamatLengkap?.kabupaten || '');
                            setProvinsiBaru(kkTujuan?.alamatLengkap?.provinsi || '');
                          } else {
                            setAlamatBaru('');
                            setKalurahanBaru('');
                            setKecamatanBaru('');
                            setKabupatenBaru('');
                            setProvinsiBaru('');
                          }
                        }}
                        className="form-input"
                        placeholder="Masukkan NIK kepala keluarga tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="alamatBaru">Alamat Tujuan</label>
                      <input
                        type="text"
                        id="alamatBaru"
                        value={alamatBaru}
                        className="form-input"
                        placeholder="Alamat tujuan akan terisi otomatis"
                        readOnly
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="kalurahanBaru">Kalurahan Tujuan</label>
                      <input
                        type="text"
                        id="kalurahanBaru"
                        value={kalurahanBaru}
                        className="form-input"
                        placeholder="Kalurahan tujuan akan terisi otomatis"
                        readOnly
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div style={{overflowX: 'auto'}}>
                        <table className="anggota-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Nama</th>
                              <th>NIK</th>
                              <th>Hubungan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anggotaArr.map((a, idx) => (
                              <tr key={a.nik || idx}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={anggotaPindah.includes(a.nik)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setAnggotaPindah(prev => [...prev, a.nik]);
                                      } else {
                                        setAnggotaPindah(prev => prev.filter(nik => nik !== a.nik));
                                      }
                                    }}
                                  />
                                </td>
                                <td>{a.nama}</td>
                                <td>{a.nik}</td>
                                <td>{a.statusHubunganKeluarga}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    );
  };

  const renderDaftarPermohonan = () => {
    if (permohonans.length === 0) {
      return (
        <div className="daftar-section">
          <div className="management-card">
            <div className="empty-state">
              <p>Anda belum mengajukan permohonan apapun.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="daftar-section">
        <div className="management-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jenis Permohonan</th>
                  <th>Status</th>
                  <th>Jenis Pindah</th>
                  <th>Waktu Pengajuan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {permohonans.map((permohonan) => (
                  <tr key={permohonan.id}>
                    <td>{permohonan.id}</td>
                    <td>{getJenisPermohonanLabel(permohonan.jenis)}</td>
                    <td>
                      <span className={`status-badge status-${permohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {permohonan.status}
                      </span>
                    </td>
                                          <td>
                        {permohonan.jenis === '4' && permohonan.jenisPindah !== undefined
                          ? getJenisPindahLabel(permohonan.jenisPindah)
                          : '-'}
                      </td>
                    <td>{formatDate(permohonan.waktuPengajuan)}</td>
                    <td>
                      <button
                        className="detail-button"
                        onClick={() => handlePermohonanClick(permohonan.id)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDokumenResmi = () => {
    if (dokumenResmi.length === 0) {
      return (
        <div className="dokumen-section">
          <div className="management-card">
            <div className="empty-state">
              <p>Anda belum memiliki dokumen resmi apapun.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dokumen-section">
        <div className="management-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CID Dokumen Resmi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokumenResmi.map((dokumen) => (
                  <tr key={dokumen.id}>
                    <td>{dokumen.id}</td>
                    <td>{dokumen.cidDokumen}</td>
                    <td>
                      <button
                        className="download-button"
                        onClick={() => window.open(`https://ipfs.io/ipfs/${dokumen.cidDokumen}`, '_blank')}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Judul dinamis sesuai menu
  const getCardTitle = () => {
    switch (activeTab) {
      case 'profile':
        return 'Profile Warga';
      case 'ajukan':
        return 'Ajukan Permohonan';
      case 'daftar':
        return 'Daftar Permohonan';
      case 'dokumen':
        return 'Dokumen Resmi';
      default:
        return '';
    }
  };

  const [permohonanGabungKK, setPermohonanGabungKK] = useState([]);
  const [showKonfirmasiModal, setShowKonfirmasiModal] = useState(false);
  const [permohonanUntukKonfirmasi, setPermohonanUntukKonfirmasi] = useState(null);

  // Cek permohonan gabung KK yang menunggu konfirmasi jika user adalah kepala keluarga
  useEffect(() => {
    async function cekGabungKK() {
      console.log('[NotifGabungKK] Mulai cek notifikasi gabung KK...');
      if (!contractService) {
        console.log('[NotifGabungKK] contractService belum tersedia');
        return;
      }
      if (!citizenData?.nik) {
        console.log('[NotifGabungKK] citizenData.nik belum tersedia');
        return;
      }
      console.log('[NotifGabungKK] NIK kepala keluarga yang login:', citizenData.nik);
      try {
        const ids = await contractService.contract.getPermohonanMenungguKonfirmasiKK(citizenData.nik);
        console.log('[NotifGabungKK] Hasil getPermohonanMenungguKonfirmasiKK:', ids);
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          console.log(`[NotifGabungKK] Detail permohonan id ${id}:`, detail);
          list.push(detail);
        }
        setPermohonanGabungKK(list);
        console.log('[NotifGabungKK] permohonanGabungKK terisi:', list);
      } catch (e) {
        console.log('[NotifGabungKK] Error saat ambil notifikasi gabung KK:', e);
        setPermohonanGabungKK([]);
      }
    }
    cekGabungKK();
  }, [contractService, citizenData?.nik]);

  // Handler aksi konfirmasi
  const handleKonfirmasiGabungKK = async (id, isSetuju) => {
    setIsLoading(true);
    try {
      console.log(`[NotifGabungKK] Konfirmasi permohonan gabung KK id ${id}, setuju: ${isSetuju}`);
      console.log('[NotifGabungKK] NIK kepala keluarga yang login (untuk konfirmasi):', citizenData.nik);
      await contractService.contract.konfirmasiPindahGabungKK(id, isSetuju, citizenData.nik);
      onPermohonanSuccess(isSetuju ? 'Permohonan gabung KK disetujui.' : 'Permohonan gabung KK ditolak.');
      setShowKonfirmasiModal(false);
      setPermohonanUntukKonfirmasi(null);
      // Refresh daftar
      const ids = await contractService.contract.getPermohonanMenungguKonfirmasiKK(citizenData.nik);
      console.log('[NotifGabungKK] (refresh) Hasil getPermohonanMenungguKonfirmasiKK:', ids);
      const list = [];
      for (let id of ids) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        console.log(`[NotifGabungKK] (refresh) Detail permohonan id ${id}:`, detail);
        list.push(detail);
      }
      setPermohonanGabungKK(list);
      console.log('[NotifGabungKK] (refresh) permohonanGabungKK terisi:', list);
      loadDaftarPermohonan();
    } catch (e) {
      console.log('[NotifGabungKK] Error saat konfirmasi gabung KK:', e);
      onError('Gagal konfirmasi gabung KK');
    } finally {
      setIsLoading(false);
    }
  };

  // Cek apakah user adalah kepala keluarga
  const isKepalaKeluarga = anggota?.statusHubunganKeluarga === 'KEPALA KELUARGA';
  console.log('[NotifGabungKK] Status user kepala keluarga:', isKepalaKeluarga, '| NIK:', anggota?.nik, '| Status:', anggota?.statusHubunganKeluarga);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Pindahkan bell ke header
  const handleBellClick = () => setShowNotifPanel(v => !v);

  return (
    <div className="dukcapil-app-root">
      <div className="dukcapil-app-body">
        <Sidebar
          menus={sidebarMenus}
          activeMenu={activeTab}
          onMenuClick={setActiveTab}
        />
        <main className="dukcapil-main-area">
         <CitizenAppHeader
           walletAddress={walletAddress}
           citizenName={citizenName}
           onDisconnect={onDisconnect}
           isLoading={isLoading}
           notificationBadge={isKepalaKeluarga && permohonanGabungKK.length > 0}
           onBellClick={handleBellClick}
         />
          <div className="dukcapil-main-card">
            {/* Judul dinamis */}
            <div className="card-title-dynamic">
              <h2 style={{margin: 0, fontWeight: 700, fontSize: '1.35rem'}}>{getCardTitle()}</h2>
            </div>
            <div className="dukcapil-header-main">
              {/* Subjudul tetap */}
              {activeTab === 'profile' && <p className="dukcapil-subtitle-main">Kelola data dan identitas warga</p>}
              {activeTab === 'ajukan' && <p className="dukcapil-subtitle-main">Ajukan permohonan baru sesuai kebutuhan Anda</p>}
              {activeTab === 'daftar' && <p className="dukcapil-subtitle-main">Lihat riwayat permohonan yang pernah diajukan</p>}
              {activeTab === 'dokumen' && <p className="dukcapil-subtitle-main">Daftar dokumen resmi yang Anda miliki</p>}
            </div>
            <div className="tab-content">
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'ajukan' && renderAjukanPermohonan()}
              {activeTab === 'daftar' && renderDaftarPermohonan()}
              {activeTab === 'dokumen' && renderDokumenResmi()}
            </div>
          </div>
        </main>
      </div>

      {/* Panel Notifikasi Gabung KK (pindah ke bawah header kanan) */}
      {showNotifPanel && (
        <div style={{
          position: 'fixed',
          top: 68,
          right: 48,
          zIndex: 1000,
          width: 400,
          maxWidth: '90vw',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
          padding: 0,
          overflow: 'hidden',
        }}>
          <div style={{padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            Notifikasi Gabung KK
            <button onClick={() => setShowNotifPanel(false)} style={{background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888'}}>×</button>
          </div>
          <div style={{maxHeight: 350, overflowY: 'auto', padding: '8px 0'}}>
            {isKepalaKeluarga && permohonanGabungKK.length > 0 ? (
              permohonanGabungKK.filter(p => p.status === 'Menunggu Konfirmasi KK Tujuan').map((p) => (
                <div key={p.id} style={{borderBottom: '1px solid #eee', padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}} onClick={() => { setPermohonanUntukKonfirmasi(p); setShowKonfirmasiModal(true); setShowNotifPanel(false); }}>
                  <div>
                    <div style={{fontWeight: 700, fontSize: 18, marginBottom: 6}}>Permohonan Bergabung KK</div>
                    <div style={{fontSize: 15, marginBottom: 2}}>Nama Pemohon: <b>{p.namaPemohon || p.pemohon}</b></div>
                    <div style={{fontSize: 15, marginBottom: 2}}>NIK: <b>{p.nikPemohon || '-'}</b></div>
                    <div style={{fontSize: 15}}>Alasan Pindah: <b>{p.alasanPindah || '-'}</b></div>
                  </div>
                  <div style={{fontSize: 13, color: '#444', minWidth: 120, textAlign: 'right'}}>
                    Waktu Pengajuan<br/>{formatDate(p.waktuPengajuan)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{padding: '32px 0', textAlign: 'center', color: '#888', fontSize: 16}}>Tidak ada notifikasi yang masuk</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detail Permohonan */}
      {showPermohonanDetail && selectedPermohonan && (
        <div className="modal-overlay" onClick={closePermohonanDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Permohonan #{selectedPermohonan.id}</h3>
              <button className="modal-close" onClick={closePermohonanDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label">Jenis Permohonan:</span>
                  <span className="info-value">{getJenisPermohonanLabel(selectedPermohonan.jenis)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tanggal Permohonan:</span>
                  <span className="info-value">{formatDate(selectedPermohonan.waktuPengajuan)}</span>
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
                      <span className="info-value">{getJenisPindahLabel(selectedPermohonan.jenisPindah)}</span>
                    </div>

                    {selectedPermohonan.jenisPindah === 2 && (
                      <div className="info-row">
                        <span className="info-label">Status Konfirmasi KK Tujuan:</span>
                        <span className="info-value">
                          {selectedPermohonan.status === 'Menunggu Konfirmasi KK Tujuan' && 'Menunggu Konfirmasi'}
                          {selectedPermohonan.status === 'Dikonfirmasi KK Tujuan' && 'Disetujui'}
                          {selectedPermohonan.status === 'Ditolak KK Tujuan' && 'Ditolak'}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">
                    <span className={`status-badge status-${selectedPermohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedPermohonan.status}
                    </span>
                  </span>
                </div>
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
          </div>
        </div>
      )}

      {/* Modal konfirmasi gabung KK */}
      {showKonfirmasiModal && permohonanUntukKonfirmasi && (
        <div className="modal-overlay" onClick={() => setShowKonfirmasiModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Konfirmasi Permohonan Gabung KK #{permohonanUntukKonfirmasi.id}</h3>
              <button className="modal-close" onClick={() => setShowKonfirmasiModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Card detail permohonan seperti desain user */}
              <div style={{fontWeight: 700, fontSize: 20, marginBottom: 10}}>Permohonan Bergabung KK</div>
              <div style={{marginBottom: 6}}>Nama Pemohon: <b>{permohonanUntukKonfirmasi.namaPemohon || permohonanUntukKonfirmasi.pemohon}</b></div>
              <div style={{marginBottom: 6}}>NIK: <b>{permohonanUntukKonfirmasi.nikPemohon || '-'}</b></div>
              <div style={{marginBottom: 6}}>Alasan Pindah: <b>{permohonanUntukKonfirmasi.alasanPindah || '-'}</b></div>
              <div style={{marginBottom: 6, color: '#444'}}>Waktu Pengajuan: {formatDate(permohonanUntukKonfirmasi.waktuPengajuan)}</div>
              <div className="info-row"><span className="info-label">Anggota yang Gabung:</span> <span className="info-value">Data tersimpan di IPFS</span></div>
              <div className="info-row"><span className="info-label">Pemohon:</span> <span className="info-value">{permohonanUntukKonfirmasi.pemohon}</span></div>
              <div style={{marginTop: 18, display: 'flex', gap: 12}}>
                <button className="add-button" disabled={isLoading} onClick={() => handleKonfirmasiGabungKK(permohonanUntukKonfirmasi.id, true)}>Setujui</button>
                <button className="remove-button" disabled={isLoading} onClick={() => handleKonfirmasiGabungKK(permohonanUntukKonfirmasi.id, false)}>Tolak</button>
              </div>
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

export default CitizenDashboard;

// Inline CSS untuk error messages dan upload status
const styles = `
  .error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }
  
  .upload-status {
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
    color: #6b7280;
  }
  
  .upload-status.success {
    color: #059669;
  }
`;

// Inject styles
if (!document.getElementById('citizen-dashboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'citizen-dashboard-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 