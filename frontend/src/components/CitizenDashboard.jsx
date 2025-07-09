import { useState, useEffect } from 'react';
import { FaUser, FaFileAlt, FaList, FaDownload, FaPowerOff } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { fetchFromIPFS, loadNIKMapping } from '../utils/ipfs.js';
import { decryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

const sidebarMenus = [
  { key: 'profile', label: 'Profile', icon: <FaUser /> },
  { key: 'ajukan', label: 'Ajukan Permohonan', icon: <FaFileAlt /> },
  { key: 'daftar', label: 'Daftar Permohonan', icon: <FaList /> },
  { key: 'dokumen', label: 'Dokumen Resmi', icon: <FaDownload /> },
];

const CitizenDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading, onCitizenNameLoaded }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoadingLocal, setIsLoading] = useState(false);
  const [citizenData, setCitizenData] = useState(null);
  const [permohonans, setPermohonans] = useState([]);
  const [dokumenResmi, setDokumenResmi] = useState([]);
  const [selectedPermohonan, setSelectedPermohonan] = useState(null);
  const [showPermohonanDetail, setShowPermohonanDetail] = useState(false);
  
  // Form states for Ajukan Permohonan
  const [jenisPermohonan, setJenisPermohonan] = useState('');
  const [idKalurahanAsal, setIdKalurahanAsal] = useState('');
  const [idKalurahanTujuan, setIdKalurahanTujuan] = useState('');
  const [cidIPFS, setCidIPFS] = useState('');

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
      
      // Load KK data from IPFS
      const mapping = await loadNIKMapping();
      const cid = mapping[data.nik];
      if (cid) {
        console.log('📁 [CitizenDashboard] Loading KK data from IPFS CID:', cid);
        const encryptedData = await fetchFromIPFS(cid);
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log('✅ [CitizenDashboard] KK data decrypted successfully');
        setCitizenData(prev => ({ ...prev, kkData: decryptedData }));
        
        // Extract citizen name from KK data for header
        if (decryptedData.anggota && decryptedData.anggota.length > 0) {
          const kepalaKeluarga = decryptedData.anggota.find(member => 
            member.statusHubunganKeluarga === 'Kepala Keluarga'
          ) || decryptedData.anggota[0];
          onCitizenNameLoaded?.(kepalaKeluarga.nama);
        }
      } else {
        console.log('⚠️ [CitizenDashboard] No CID found for NIK:', data.nik);
      }
    } catch (error) {
      console.error('❌ [CitizenDashboard] Failed to load citizen data:', error);
      onError('Gagal memuat data warga');
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
      setDokumenResmi(data);
    } catch (error) {
      console.log('⚠️ [CitizenDashboard] No dokumen resmi available, setting empty array');
      setDokumenResmi([]);
    }
  };

  const handleSubmitPermohonan = async (e) => {
    e.preventDefault();
    if (!jenisPermohonan || !idKalurahanAsal || !cidIPFS) {
      onError('Semua field wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📝 [CitizenDashboard] Submitting permohonan:', {
        jenis: jenisPermohonan,
        idKalurahanAsal,
        idKalurahanTujuan,
        cidIPFS
      });
      
      const result = await contractService.submitPermohonan(
        parseInt(jenisPermohonan),
        cidIPFS,
        parseInt(idKalurahanAsal),
        jenisPermohonan === '4' ? parseInt(idKalurahanTujuan) : 0
      );
      
      console.log('✅ [CitizenDashboard] Permohonan submitted successfully:', result);
      onSuccess(`Permohonan berhasil diajukan! Transaction: ${result.transactionHash}`);
      
      // Reset form
      setJenisPermohonan('');
      setIdKalurahanAsal('');
      setIdKalurahanTujuan('');
      setCidIPFS('');
      
      // Reload data
      loadDaftarPermohonan();
    } catch (error) {
      console.error('❌ [CitizenDashboard] Failed to submit permohonan:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermohonanClick = async (id) => {
    try {
      const detail = await contractService.getPermohonanDetail(id);
      setSelectedPermohonan(detail);
      setShowPermohonanDetail(true);
    } catch (error) {
      console.error('Failed to get permohonan detail:', error);
      onError('Gagal memuat detail permohonan');
    }
  };

  const closePermohonanDetail = () => {
    setShowPermohonanDetail(false);
    setSelectedPermohonan(null);
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

  const [parentNames, setParentNames] = useState({ ayah: '-', ibu: '-' });
  const [parentLoading, setParentLoading] = useState(false);

  // Cari anggota dan anggotaArr di level atas agar bisa dipakai useEffect
  const kkData = citizenData?.kkData;
  const nikUser = citizenData?.nik;
  const anggotaArr = Array.isArray(kkData?.anggota) ? kkData.anggota : [];
  const anggota = anggotaArr.find(member => member.nik === nikUser) || null;

  useEffect(() => {
    let cancelled = false;
    async function fetchParents() {
      if (!anggota) {
        setParentNames({ ayah: '-', ibu: '-' });
        return;
      }
      setParentLoading(true);
      const mapping = await loadNIKMapping();
      async function lookupParentName(nik) {
        if (!nik) return '-';
        const cid = mapping[nik];
        if (!cid) return '-';
        try {
          const encrypted = await fetchFromIPFS(cid);
          const data = await decryptAes256CbcNodeStyle(encrypted, CRYPTO_CONFIG.SECRET_KEY);
          const arr = Array.isArray(data?.anggota) ? data.anggota : [];
          const found = arr.find(m => m.nik === nik);
          return found?.nama || '-';
        } catch {
          return '-';
        }
      }
      const [ayah, ibu] = await Promise.all([
        lookupParentName(anggota.nikAyah),
        lookupParentName(anggota.nikIbu)
      ]);
      if (!cancelled) setParentNames({ ayah, ibu });
      setParentLoading(false);
    }
    fetchParents();
    return () => { cancelled = true; };
  }, [anggota?.nikAyah, anggota?.nikIbu, kkData]);

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
          <h3>Ajukan Permohonan</h3>
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

            <div className="form-group">
              <label htmlFor="idKalurahanAsal">ID Kalurahan Asal:</label>
              <input
                type="number"
                id="idKalurahanAsal"
                value={idKalurahanAsal}
                onChange={(e) => setIdKalurahanAsal(e.target.value)}
                placeholder="1, 2, 3, ..."
                className="form-input"
                disabled={isLoading}
                required
                min="1"
              />
            </div>

            {jenisPermohonan === '4' && (
              <div className="form-group">
                <label htmlFor="idKalurahanTujuan">ID Kalurahan Tujuan:</label>
                <input
                  type="number"
                  id="idKalurahanTujuan"
                  value={idKalurahanTujuan}
                  onChange={(e) => setIdKalurahanTujuan(e.target.value)}
                  placeholder="1, 2, 3, ..."
                  className="form-input"
                  disabled={isLoading}
                  required
                  min="1"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="cidIPFS">CID Dokumen IPFS:</label>
              <input
                type="text"
                id="cidIPFS"
                value={cidIPFS}
                onChange={(e) => setCidIPFS(e.target.value)}
                placeholder="Qm..."
                className="form-input"
                disabled={isLoading}
                required
              />
            </div>

            <button 
              type="submit" 
              className="add-button"
              disabled={isLoading || !jenisPermohonan || !idKalurahanAsal || !cidIPFS}
            >
              {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
            </button>
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
            <h3>Daftar Permohonan</h3>
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
          <h3>Daftar Permohonan</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jenis Permohonan</th>
                  <th>Status</th>
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
            <h3>Dokumen Resmi</h3>
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
          <h3>Dokumen Resmi</h3>
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

  return (
    <div className="dukcapil-app-root">
      <div className="dukcapil-app-body">
        <Sidebar
          menus={sidebarMenus}
          activeMenu={activeTab}
          onMenuClick={setActiveTab}
          walletAddress={walletAddress}
        />
        <main className="dukcapil-main-area">
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
                  <div className="info-row">
                    <span className="info-label">Kalurahan Tujuan:</span>
                    <span className="info-value">ID {selectedPermohonan.idKalurahanTujuan}</span>
                  </div>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard; 