import { useState, useEffect } from 'react';
import { FaInbox, FaExchangeAlt, FaHistory, FaHome } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import KalurahanAppHeader from './KalurahanAppHeader';
import { loadPermohonanDataForDisplay, downloadEncryptedFile, viewEncryptedFile } from '../utils/permohonanDataUtils.js';
import { decryptPermohonanData } from '../utils/permohonanDataUtils.js';
import { decryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

const sidebarMenus = [
  { key: 'masuk', label: 'Permohonan Masuk', icon: <FaInbox /> },
  { key: 'pindah', label: 'Permohonan Pindah Masuk', icon: <FaExchangeAlt /> },
  { key: 'riwayat', label: 'Riwayat Permohonan', icon: <FaHistory /> },
  { key: 'profile', label: 'Profile Kalurahan', icon: <FaHome /> },
];

const KalurahanDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('masuk');
  const [isLoadingLocal, setIsLoading] = useState(false);
  const [permohonanMasuk, setPermohonanMasuk] = useState([]);
  const [permohonanPindah, setPermohonanPindah] = useState([]);
  const [riwayatPermohonan, setRiwayatPermohonan] = useState([]);
  const [kalurahanMapping, setKalurahanMapping] = useState([]);
  const [profile, setProfile] = useState({ id: '', nama: '', address: '' });
  
  // State untuk modal detail permohonan
  const [selectedPermohonan, setSelectedPermohonan] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [permohonanDetailData, setPermohonanDetailData] = useState(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  // Tambahkan state baru untuk data mentah
  const [permohonanDetailRaw, setPermohonanDetailRaw] = useState(null);

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

  // Judul dan subjudul dinamis
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'masuk':
        return 'Permohonan Masuk';
      case 'pindah':
        return 'Permohonan Pindah Masuk';
      case 'riwayat':
        return 'Riwayat Permohonan';
      case 'profile':
        return 'Profile Kalurahan';
      default:
        return 'Dashboard Kalurahan';
    }
  };
  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'masuk':
        return 'Kelola permohonan masuk yang membutuhkan verifikasi.';
      case 'pindah':
        return 'Kelola permohonan pindah masuk ke kalurahan Anda.';
      case 'riwayat':
        return 'Riwayat semua permohonan yang pernah diproses.';
      case 'profile':
        return 'Lihat dan kelola profil kalurahan Anda.';
      default:
        return 'Kelola permohonan dan data kalurahan Anda';
    }
  };

  // Fetch mapping kalurahan dari IPFS
  useEffect(() => {
    async function fetchKalurahanMapping() {
      if (!contractService || !contractService.contract) return;
      try {
        const cid = await contractService.contract.getKalurahanMappingCID();
        if (!cid) return;
        
        console.log('[Kalurahan-Fetch] Fetching kalurahan mapping from IPFS:', cid);
        const url = `https://ipfs.io/ipfs/${cid}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error('[Kalurahan-Fetch] Failed to fetch from IPFS:', resp.status);
          return;
        }
        
        // Ambil data terenkripsi dari IPFS
        const encryptedData = await resp.text();
        console.log('[Kalurahan-Fetch] Encrypted data fetched from IPFS');
        
        // Dekripsi data
        console.log('[Kalurahan-Fetch] Decrypting kalurahan mapping...');
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log('[Kalurahan-Fetch] Mapping decrypted successfully');
        
        // Parse JSON dari data yang sudah didekripsi
        const data = JSON.parse(decryptedData);
        console.log('[Kalurahan-Fetch] Parsed mapping data:', data);
        setKalurahanMapping(data);
      } catch (e) {
        console.error('[Kalurahan-Fetch] Error fetching kalurahan mapping:', e);
      }
    }
    fetchKalurahanMapping();
  }, [contractService]);

  // Fetch profile kalurahan
  useEffect(() => {
    async function fetchProfile() {
      if (!contractService || !contractService.contract || !walletAddress) return;
      try {
        const id = await contractService.contract.idKalurahanByAddress(walletAddress);
        let nama = '';
        if (kalurahanMapping.length > 0) {
          const found = kalurahanMapping.find(k => k.address.toLowerCase() === walletAddress.toLowerCase());
          if (found) nama = found.nama;
        }
        setProfile({ id, nama, address: walletAddress });
      } catch (e) {
        setProfile({ id: '', nama: '', address: walletAddress });
      }
    }
    fetchProfile();
  }, [contractService, walletAddress, kalurahanMapping]);

  // Fetch permohonan masuk (asal)
  useEffect(() => {
    async function fetchPermohonanMasuk() {
      if (!contractService || !contractService.contract) return;
      try {
        const ids = await contractService.contract.getPermohonanByKalurahanAsal();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          // Filter status Diajukan (butuh verifikasi)
          if (detail.status === 'Diajukan') list.push(detail);
        }
        setPermohonanMasuk(list);
      } catch (e) {
        setPermohonanMasuk([]);
      }
    }
    fetchPermohonanMasuk();
  }, [contractService]);

  // Fetch permohonan pindah masuk (tujuan)
  useEffect(() => {
    async function fetchPermohonanPindah() {
      if (!contractService || !contractService.contract) return;
      try {
        console.log('🔄 [Kalurahan-Pindah] Fetching permohonan pindah...');
        const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
        console.log(`📋 [Kalurahan-Pindah] Found ${ids.length} permohonan di kalurahan tujuan`);
        
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          console.log(`📋 [Kalurahan-Pindah] Permohonan ${id}: status = "${detail.status}"`);
          // Filter status Disetujui Kalurahan Asal (menunggu verifikasi tujuan)
          if (detail.status === 'Disetujui Kalurahan Asal') {
            list.push(detail);
            console.log(`✅ [Kalurahan-Pindah] Added permohonan ${id} to list`);
          }
        }
        console.log(`📋 [Kalurahan-Pindah] Final list: ${list.length} permohonan`);
        setPermohonanPindah(list);
      } catch (e) {
        console.error('❌ [Kalurahan-Pindah] Error:', e);
        setPermohonanPindah([]);
      }
    }
    fetchPermohonanPindah();
  }, [contractService]);

  // Fetch riwayat permohonan (asal + tujuan, semua status)
  useEffect(() => {
    async function fetchRiwayat() {
      if (!contractService || !contractService.contract) return;
      try {
        const asalIds = await contractService.contract.getPermohonanByKalurahanAsal();
        const tujuanIds = await contractService.contract.getPermohonanByKalurahanTujuan();
        const allIds = Array.from(new Set([...asalIds, ...tujuanIds]));
        const list = [];
        for (let id of allIds) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          list.push(detail);
        }
        setRiwayatPermohonan(list);
      } catch (e) {
        setRiwayatPermohonan([]);
      }
    }
    fetchRiwayat();
  }, [contractService]);

  // Fungsi untuk menangani klik detail permohonan
  const handlePermohonanClick = async (permohonan) => {
    try {
      setSelectedPermohonan(permohonan);
      setShowDetailModal(true);
      // Load detailed data from IPFS
      if (permohonan.cidIPFS && permohonan.cidIPFS !== 'dummy-cid') {
        setLoadingDetailData(true);
        try {
          const rawData = await decryptPermohonanData(permohonan.cidIPFS);
          setPermohonanDetailRaw(rawData);
          const detailData = await loadPermohonanDataForDisplay(permohonan.cidIPFS);
          setPermohonanDetailData(detailData);
        } catch (error) {
          console.error('Failed to load IPFS data:', error);
          setPermohonanDetailRaw(null);
          setPermohonanDetailData(null);
        } finally {
          setLoadingDetailData(false);
        }
      } else {
        setPermohonanDetailRaw(null);
        setPermohonanDetailData(null);
      }
    } catch (error) {
      console.error('Failed to get permohonan detail:', error);
      onError('Gagal memuat detail permohonan');
    }
  };

  // Fungsi untuk menutup modal detail
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

  // Fungsi untuk verifikasi permohonan
  const handleVerifikasi = async (isSetuju, alasanPenolakan = '') => {
    if (!selectedPermohonan) return;
    
    setIsVerifying(true);
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [Kalurahan-Verifikasi] Memulai verifikasi permohonan ${selectedPermohonan.id}...`);
      console.log(`📋 [Kalurahan-Verifikasi] Status: ${isSetuju ? 'Setuju' : 'Tolak'}`);
      console.log(`📋 [Kalurahan-Verifikasi] Alasan: ${alasanPenolakan}`);
      console.log(`📋 [Kalurahan-Verifikasi] Active Tab: ${activeTab}`);
      console.log(`📋 [Kalurahan-Verifikasi] Contract Service:`, contractService);
      
      // Cek apakah ini permohonan pindah
      const isPermohonanPindah = selectedPermohonan.jenis === '4' || selectedPermohonan.jenis === 'Pindah';
      console.log(`📋 [Kalurahan-Verifikasi] Jenis Permohonan: ${selectedPermohonan.jenis} (${isPermohonanPindah ? 'Pindah' : 'Biasa'})`);
      
      if (isSetuju) {
        if (isPermohonanPindah) {
          // Verifikasi setuju untuk permohonan pindah
          console.log(`🔄 [Kalurahan-Verifikasi] Menggunakan verifikasiKalurahanAsalPindah...`);
          const result = await contractService.contract.verifikasiKalurahanAsalPindah(
            selectedPermohonan.id, 
            true, 
            '', 
            selectedPermohonan.idKalurahanTujuan
          );
          await result.wait();
          console.log(`✅ [Kalurahan-Verifikasi] Verifikasi pindah setuju berhasil dalam ${Date.now() - startTime}ms`);
          onSuccess(`Permohonan pindah ${selectedPermohonan.id} berhasil diverifikasi!`);
        } else {
          // Verifikasi setuju untuk permohonan biasa
          console.log(`🔄 [Kalurahan-Verifikasi] Menggunakan verifikasiKalurahan...`);
          const result = await contractService.contract.verifikasiKalurahan(selectedPermohonan.id, true, '');
          await result.wait();
          console.log(`✅ [Kalurahan-Verifikasi] Verifikasi setuju berhasil dalam ${Date.now() - startTime}ms`);
          onSuccess(`Permohonan ${selectedPermohonan.id} berhasil diverifikasi!`);
        }
      } else {
        if (isPermohonanPindah) {
          // Verifikasi tolak untuk permohonan pindah
          console.log(`🔄 [Kalurahan-Verifikasi] Menggunakan verifikasiKalurahanAsalPindah...`);
          const result = await contractService.contract.verifikasiKalurahanAsalPindah(
            selectedPermohonan.id, 
            false, 
            alasanPenolakan, 
            selectedPermohonan.idKalurahanTujuan
          );
          await result.wait();
          console.log(`✅ [Kalurahan-Verifikasi] Verifikasi pindah tolak berhasil dalam ${Date.now() - startTime}ms`);
          onSuccess(`Permohonan pindah ${selectedPermohonan.id} ditolak.`);
        } else {
          // Verifikasi tolak untuk permohonan biasa
          console.log(`🔄 [Kalurahan-Verifikasi] Menggunakan verifikasiKalurahan...`);
          const result = await contractService.contract.verifikasiKalurahan(selectedPermohonan.id, false, alasanPenolakan);
          await result.wait();
          console.log(`✅ [Kalurahan-Verifikasi] Verifikasi tolak berhasil dalam ${Date.now() - startTime}ms`);
          onSuccess(`Permohonan ${selectedPermohonan.id} ditolak.`);
        }
              }
        
        // Cek status permohonan setelah verifikasi
        const updatedPermohonan = await contractService.getPermohonanDetail(selectedPermohonan.id);
        console.log(`📋 [Kalurahan-Verifikasi] Status setelah verifikasi: ${updatedPermohonan.status}`);
        
        // Reload data berdasarkan active tab
      console.log(`🔄 [Kalurahan-Verifikasi] Reloading data untuk tab: ${activeTab}`);
      
      if (activeTab === 'masuk') {
        const ids = await contractService.contract.getPermohonanByKalurahanAsal();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (detail.status === 'Diajukan') list.push(detail);
        }
        console.log(`📋 [Kalurahan-Verifikasi] Reloaded ${list.length} permohonan masuk`);
        setPermohonanMasuk(list);
      } else if (activeTab === 'pindah') {
        const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (detail.status === 'Disetujui Kalurahan Asal') list.push(detail);
        }
        console.log(`📋 [Kalurahan-Verifikasi] Reloaded ${list.length} permohonan pindah`);
        setPermohonanPindah(list);
      }
      
      // Reload riwayat juga
      const asalIds = await contractService.contract.getPermohonanByKalurahanAsal();
      const tujuanIds = await contractService.contract.getPermohonanByKalurahanTujuan();
      const allIds = Array.from(new Set([...asalIds, ...tujuanIds]));
      const riwayatList = [];
      for (let id of allIds) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        riwayatList.push(detail);
      }
      setRiwayatPermohonan(riwayatList);
      
      closeDetailModal();
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [Kalurahan-Verifikasi] Error dalam ${totalTime}ms:`, error);
      const errorMessage = error.message || handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Tambahkan handler baru untuk verifikasi kalurahan tujuan
  const handleVerifikasiTujuan = async (isSetuju, alasanPenolakan = '') => {
    if (!selectedPermohonan) return;
    setIsVerifying(true);
    const startTime = Date.now();
    try {
      console.log(`🔄 [Kalurahan-VerifikasiTujuan] Memulai verifikasi permohonan ${selectedPermohonan.id}...`);
      console.log('[DEBUG] permohonanDetailRaw.dataPindah:', permohonanDetailRaw?.dataPindah);
      
      // Cek jenis pindah dari smart contract
      const jenisPindah = selectedPermohonan.jenisPindah;
      console.log(`📋 [Kalurahan-VerifikasiTujuan] Jenis Pindah: ${jenisPindah}`);
      
      let result;
      
      // Convert jenisPindah to string for comparison (handle both string and number types)
      const jenisPindahStr = String(jenisPindah);
      console.log(`🔍 [Kalurahan-VerifikasiTujuan] Jenis Pindah (original): ${jenisPindah} (type: ${typeof jenisPindah})`);
      console.log(`🔍 [Kalurahan-VerifikasiTujuan] Jenis Pindah (converted): ${jenisPindahStr} (type: ${typeof jenisPindahStr})`);
      
      if (jenisPindahStr === '2') {
        // Pindah Gabung KK - memerlukan NIK kepala keluarga tujuan
        console.log(`🔄 [Kalurahan-VerifikasiTujuan] Jenis Pindah: Gabung KK (${jenisPindahStr}) - memerlukan NIK kepala keluarga tujuan`);
        
        let nikKepalaKeluargaTujuan = '';
        if (
          permohonanDetailRaw &&
          permohonanDetailRaw.dataPindah &&
          permohonanDetailRaw.dataPindah.nikKepalaKeluargaTujuan
        ) {
          nikKepalaKeluargaTujuan = permohonanDetailRaw.dataPindah.nikKepalaKeluargaTujuan;
        }
        
        console.log('[VerifikasiKalurahanTujuan] NIK Kepala Keluarga Tujuan:', nikKepalaKeluargaTujuan);
        
        if (!nikKepalaKeluargaTujuan) {
          console.error('[VerifikasiKalurahanTujuan] ERROR: NIK Kepala Keluarga Tujuan tidak ditemukan untuk Pindah Gabung KK!');
          setIsVerifying(false);
          onError('NIK Kepala Keluarga Tujuan tidak ditemukan di data permohonan untuk Pindah Gabung KK.');
          return;
        }
        
        result = await contractService.contract.verifikasiKalurahanTujuanPindah(
          selectedPermohonan.id,
          isSetuju,
          alasanPenolakan || '',
          nikKepalaKeluargaTujuan
        );
      } else if (jenisPindahStr === '0') {
        // Pindah Seluruh Keluarga - tidak memerlukan NIK kepala keluarga tujuan
        console.log(`🔄 [Kalurahan-VerifikasiTujuan] Jenis Pindah: Seluruh Keluarga (${jenisPindahStr}) - tidak memerlukan NIK kepala keluarga tujuan`);
        
        result = await contractService.contract.verifikasiKalurahanTujuanPindah(
          selectedPermohonan.id,
          isSetuju,
          alasanPenolakan || '',
          '' // NIK kepala keluarga tujuan kosong untuk pindah seluruh keluarga
        );
      } else if (jenisPindahStr === '1') {
        // Pindah Mandiri - tidak memerlukan NIK kepala keluarga tujuan
        console.log(`🔄 [Kalurahan-VerifikasiTujuan] Jenis Pindah: Mandiri (${jenisPindahStr}) - tidak memerlukan NIK kepala keluarga tujuan`);
        
        result = await contractService.contract.verifikasiKalurahanTujuanPindah(
          selectedPermohonan.id,
          isSetuju,
          alasanPenolakan || '',
          '' // NIK kepala keluarga tujuan kosong untuk pindah mandiri
        );
      } else {
        // Fallback untuk jenis pindah yang tidak dikenal
        console.error(`❌ [Kalurahan-VerifikasiTujuan] Jenis Pindah tidak dikenal: ${jenisPindah} (type: ${typeof jenisPindah})`);
        setIsVerifying(false);
        onError(`Jenis pindah tidak dikenal: ${jenisPindah}`);
        return;
      }
      
      console.log('[VerifikasiKalurahanTujuan] TX result:', result);
      await result.wait();
      const updatedPermohonan = await contractService.getPermohonanDetail(selectedPermohonan.id);
      console.log('[VerifikasiKalurahanTujuan] Status permohonan setelah verifikasi:', updatedPermohonan.status);
      console.log(`✅ [Kalurahan-VerifikasiTujuan] Verifikasi tujuan ${isSetuju ? 'setuju' : 'tolak'} berhasil dalam ${Date.now() - startTime}ms`);
      onSuccess(`Permohonan ${selectedPermohonan.id} ${isSetuju ? 'disetujui' : 'ditolak'} oleh kalurahan tujuan!`);
      
      // Reload data
      const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
      const list = [];
      for (let id of ids) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        if (detail.status === 'Disetujui Kalurahan Asal') list.push(detail);
      }
      setPermohonanPindah(list);
      closeDetailModal();
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [Kalurahan-VerifikasiTujuan] Error dalam ${totalTime}ms:`, error);
      const errorMessage = error.message || handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper function untuk format tanggal
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function untuk get jenis permohonan label
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

  // Helper function untuk get status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'Diajukan': 'Menunggu Verifikasi',
      'DisetujuiKalurahanAsal': 'Disetujui Kalurahan Asal',
      'DitolakKalurahanAsal': 'Ditolak Kalurahan Asal',
      'DisetujuiKalurahanTujuan': 'Disetujui Kalurahan Tujuan',
      'DitolakKalurahanTujuan': 'Ditolak Kalurahan Tujuan',
      'Selesai': 'Selesai'
    };
    return statusMap[status] || status;
  };

  // Helper function untuk format address
  const formatAddress = (address) => {
    if (!address) return '-';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Renderers
  const renderPermohonanMasuk = () => (
    <div className="management-card">
      {permohonanMasuk.length === 0 ? <div>Tidak ada permohonan masuk.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {permohonanMasuk.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{getJenisPermohonanLabel(p.jenis)}</td>
                <td>{getStatusLabel(p.status)}</td>
                <td>{formatAddress(p.pemohon)}</td>
                <td><button className="detail-button" onClick={() => handlePermohonanClick(p)}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderPermohonanPindah = () => (
    <div className="management-card">
      {permohonanPindah.length === 0 ? <div>Tidak ada permohonan pindah masuk.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {permohonanPindah.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{getJenisPermohonanLabel(p.jenis)}</td>
                <td>{getStatusLabel(p.status)}</td>
                <td>{formatAddress(p.pemohon)}</td>
                <td><button className="detail-button" onClick={() => handlePermohonanClick(p)}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

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
                <td>{formatAddress(p.pemohon)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="management-card">
      <div><b>ID:</b> {profile.id}</div>
      <div><b>Nama:</b> {profile.nama}</div>
      <div><b>Wallet:</b> {profile.address}</div>
    </div>
  );

  return (
    <>
      {/* Header fixed di paling atas, di luar root layout */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 100 }}>
        <KalurahanAppHeader
          walletAddress={walletAddress}
          kalurahanName={profile.nama}
          kalurahanId={profile.id}
          onDisconnect={onDisconnect}
          isLoading={isLoadingLocal}
        />
      </div>
      {/* Root layout di bawah header */}
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
                <h2 className="dukcapil-title-main">{getHeaderTitle()}</h2>
                <p className="dukcapil-subtitle-main">{getHeaderSubtitle()}</p>
              </div>
              <div className="tab-content">
                {activeTab === 'masuk' && renderPermohonanMasuk()}
                {activeTab === 'pindah' && renderPermohonanPindah()}
                {activeTab === 'riwayat' && renderRiwayat()}
                {activeTab === 'profile' && renderProfile()}
              </div>
            </div>
          </main>
        </div>
      </div>

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
                  <span className="info-value">{getJenisPermohonanLabel(selectedPermohonan.jenis)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pemohon:</span>
                  <span className="info-value">{formatAddress(selectedPermohonan.pemohon)}</span>
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
                      <span className="info-value">{selectedPermohonan.jenisPindah}</span>
                    </div>
                  </>
                )}
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">
                    <span className={`status-badge status-${selectedPermohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {getStatusLabel(selectedPermohonan.status)}
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
                        {permohonanDetailData.jenis || permohonanDetailData.metadata?.jenisPermohonan}
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

            {/* Tombol Aksi */}
            {(() => {
              const isKalurahanAsal = profile.id && selectedPermohonan.idKalurahanAsal && profile.id.toString() === selectedPermohonan.idKalurahanAsal.toString();
              const isKalurahanTujuan = profile.id && selectedPermohonan.idKalurahanTujuan && profile.id.toString() === selectedPermohonan.idKalurahanTujuan.toString();
              const status = selectedPermohonan.status;
              // Tombol hanya muncul jika:
              // - Kalurahan asal & status Diajukan
              // - Kalurahan tujuan & status Disetujui Kalurahan Asal
              if ((isKalurahanAsal && status === 'Diajukan') || (isKalurahanTujuan && status === 'Disetujui Kalurahan Asal')) {
                return (
                  <div className="modal-footer" style={{
                    position: 'sticky',
                    bottom: 0,
                    background: 'white',
                    zIndex: 10,
                    padding: '16px 0 0 0',
                    display: 'flex',
                    justifyContent: 'center',
                  }}>
                    <div className="action-buttons" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button 
                        className="btn-reject" 
                        onClick={() => setShowAlasanInput(!showAlasanInput)}
                        disabled={isVerifying}
                      >
                        {isVerifying ? 'Memproses...' : (showAlasanInput ? 'Batal' : 'Tolak')}
                      </button>
                      <button 
                        className="btn-approve" 
                        onClick={() => {
                          setShowAlasanInput(false);
                          setAlasanPenolakan('');
                          setAlasanError('');
                          if (isKalurahanAsal && status === 'Diajukan') {
                            handleVerifikasi(true);
                          } else if (isKalurahanTujuan && status === 'Disetujui Kalurahan Asal') {
                            handleVerifikasiTujuan(true);
                          }
                        }}
                        disabled={isVerifying}
                      >
                        {isVerifying ? 'Memproses...' : 'Setujui'}
                      </button>
                    </div>
                    {showAlasanInput && (
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          if (!alasanPenolakan.trim()) {
                            setAlasanError('Alasan penolakan wajib diisi.');
                            return;
                          }
                          setAlasanError('');
                          setShowAlasanInput(false);
                          if (isKalurahanAsal && status === 'Diajukan') {
                            handleVerifikasi(false, alasanPenolakan);
                          } else if (isKalurahanTujuan && status === 'Disetujui Kalurahan Asal') {
                            handleVerifikasiTujuan(false, alasanPenolakan);
                          }
                          setAlasanPenolakan('');
                        }}
                        style={{ marginTop: 16, textAlign: 'center' }}
                      >
                        <input
                          type="text"
                          className="input-alasan"
                          placeholder="Masukkan alasan penolakan"
                          value={alasanPenolakan}
                          onChange={e => setAlasanPenolakan(e.target.value)}
                          disabled={isVerifying}
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
                        <button
                          type="submit"
                          className="btn-reject"
                          disabled={isVerifying}
                          style={{ width: '100%' }}
                        >
                          {isVerifying ? 'Memproses...' : 'Submit Penolakan'}
                        </button>
                      </form>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="modal-footer">
                    <div className="info-message">
                      Permohonan ini sudah diproses dan tidak dapat diverifikasi lagi.
                    </div>
                  </div>
                );
              }
            })()}
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
    </>
  );
};

export default KalurahanDashboard;

// Inline CSS untuk status badges dan styling
const styles = `
  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .status-diajukan {
    background-color: #fef3c7;
    color: #92400e;
  }
  
  .status-disetujuikalurahanasal {
    background-color: #dbeafe;
    color: #1e40af;
  }
  
  .status-ditolakkalurahanasal {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  .status-disetujuikalurahantujuan {
    background-color: #d1fae5;
    color: #065f46;
  }
  
  .status-ditolakkalurahantujuan {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  .status-selesai {
    background-color: #d1fae5;
    color: #065f46;
  }
  
  .document-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }
  
  .document-link:hover {
    text-decoration: underline;
  }
  
  .info-message {
    color: #6b7280;
    font-style: italic;
    text-align: center;
    padding: 1rem;
  }
`;

// Inject styles
if (!document.getElementById('kalurahan-dashboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'kalurahan-dashboard-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 