import { useState, useEffect } from 'react';
import { FaInbox, FaExchangeAlt, FaHistory, FaHome } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import KalurahanAppHeader from './KalurahanAppHeader';
import { loadPermohonanDataForDisplay } from '../utils/permohonanDataUtils.js';

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
        const url = `https://ipfs.io/ipfs/${cid}`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        setKalurahanMapping(data);
      } catch (e) {}
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
        const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          // Filter status DisetujuiKalurahanAsal (menunggu verifikasi tujuan)
          if (detail.status === 'DisetujuiKalurahanAsal') list.push(detail);
        }
        setPermohonanPindah(list);
      } catch (e) {
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
          const detailData = await loadPermohonanDataForDisplay(permohonan.cidIPFS);
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

  // Fungsi untuk verifikasi permohonan
  const handleVerifikasi = async (isSetuju, alasanPenolakan = '') => {
    if (!selectedPermohonan) return;
    
    setIsVerifying(true);
    try {
      console.log(`🔄 [Kalurahan-Verifikasi] Memulai verifikasi permohonan ${selectedPermohonan.id}...`);
      console.log(`📋 [Kalurahan-Verifikasi] Status: ${isSetuju ? 'Setuju' : 'Tolak'}`);
      console.log(`📋 [Kalurahan-Verifikasi] Alasan: ${alasanPenolakan}`);
      
      const startTime = Date.now();
      
      if (isSetuju) {
        // Verifikasi setuju
        const result = await contractService.contract.verifikasiPermohonan(selectedPermohonan.id, true, '');
        await result.wait();
        console.log(`✅ [Kalurahan-Verifikasi] Verifikasi setuju berhasil dalam ${Date.now() - startTime}ms`);
        onSuccess(`Permohonan ${selectedPermohonan.id} berhasil diverifikasi!`);
      } else {
        // Verifikasi tolak
        const result = await contractService.contract.verifikasiPermohonan(selectedPermohonan.id, false, alasanPenolakan);
        await result.wait();
        console.log(`✅ [Kalurahan-Verifikasi] Verifikasi tolak berhasil dalam ${Date.now() - startTime}ms`);
        onSuccess(`Permohonan ${selectedPermohonan.id} ditolak.`);
      }
      
      // Reload data
      if (activeTab === 'masuk') {
        const ids = await contractService.contract.getPermohonanByKalurahanAsal();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (detail.status === 'Diajukan') list.push(detail);
        }
        setPermohonanMasuk(list);
      } else if (activeTab === 'pindah') {
        const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (detail.status === 'DisetujuiKalurahanAsal') list.push(detail);
        }
        setPermohonanPindah(list);
      }
      
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
                <td>{p.pemohon}</td>
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
                <td>{p.pemohon}</td>
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
                <td>{p.pemohon}</td>
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
                        {permohonanDetailData.jenis}
                        {permohonanDetailData.jenisPindah && ` - ${permohonanDetailData.jenisPindah}`}
                      </span>
                    </div>
                    
                    {Object.entries(permohonanDetailData.data).map(([key, value]) => (
                      <div key={key} className="info-row">
                        <span className="info-label">{key}:</span>
                        <span className="info-value">
                          {typeof value === 'string' && value.startsWith('https://ipfs.io/ipfs/') ? (
                            <a 
                              href={value} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="document-link"
                            >
                              📄 Download Dokumen
                            </a>
                          ) : (
                            value
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
            {selectedPermohonan.status === 'Diajukan' || selectedPermohonan.status === 'DisetujuiKalurahanAsal' ? (
              <div className="modal-footer">
                <div className="action-buttons">
                  <button 
                    className="btn-reject" 
                    onClick={() => {
                      const alasan = prompt('Masukkan alasan penolakan (opsional):');
                      if (alasan !== null) {
                        handleVerifikasi(false, alasan);
                      }
                    }}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Memproses...' : 'Tolak'}
                  </button>
                  <button 
                    className="btn-approve" 
                    onClick={() => handleVerifikasi(true)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Memproses...' : 'Setujui'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-footer">
                <div className="info-message">
                  Permohonan ini sudah diproses dan tidak dapat diverifikasi lagi.
                </div>
              </div>
            )}
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