import { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaInbox, FaHistory } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { uploadToPinata } from '../utils/pinata';
import { loadPermohonanDataForDisplay } from '../utils/permohonanDataUtils.js';

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
  'Selesai': 9
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
      } catch (e) {
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
        const statusIntPindah = STATUS_ENUM['Disetujui Kalurahan Tujuan'];
        const statusIntNonPindah = STATUS_ENUM['Disetujui Kalurahan'];
        const idsPindah = await contractService.contract.getPermohonanForDukcapil(statusIntPindah);
        const idsNonPindah = await contractService.contract.getPermohonanForDukcapil(statusIntNonPindah);
        const allIds = Array.from(new Set([
          ...idsPindah.map(id => Number(id)),
          ...idsNonPindah.map(id => Number(id))
        ]));
        console.log(`[Dukcapil] Found ${allIds.length} permohonan masuk`, allIds);
        const list = [];
        for (let id of allIds) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          if (
            detail.status === 'Disetujui Kalurahan Tujuan' ||
            detail.status === 'Disetujui Kalurahan'
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
    if (activeTab === 'permohonan') fetchPermohonanMasuk();
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
          'Disetujui Kalurahan Tujuan',
          'Disetujui Kalurahan',
          'Ditolak Kalurahan',
          'Ditolak Kalurahan Tujuan',
          'Diajukan',
          'Selesai'
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
      // 1. Tambah ke smart contract
      const result = await contractService.tambahKalurahanById(parseInt(kalurahanId), kalurahanAddress.trim());
      onSuccess(`Kalurahan berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      // 2. Update mapping lokal
      const newMapping = [...kalurahanMapping, { id: Number(kalurahanId), nama: kalurahanName, address: kalurahanAddress.trim() }];
      setKalurahanMapping(newMapping);
      // 3. Upload ke IPFS
      const jsonString = JSON.stringify(newMapping, null, 2);
      const cid = await uploadToPinata(jsonString, 'kalurahan.json');
      // 4. Update CID di smart contract
      await contractService.contract.setKalurahanMappingCID(cid);
      onSuccess('Mapping kalurahan berhasil diupload ke IPFS dan CID diupdate di smart contract!');
      setKalurahanName('');
      setKalurahanId('');
      setKalurahanAddress('');
    } catch (error) {
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKalurahan = async (addressToRemove) => {
    if (!addressToRemove.trim()) {
      onError('Alamat wallet Kalurahan wajib diisi');
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
      // 1. Hapus dari smart contract
      const result = await contractService.contract.hapusKalurahan(addressToRemove.trim());
      onSuccess(`Kalurahan berhasil dihapus! Transaction: ${result.hash || result.transactionHash}`);
      // 2. Update mapping lokal
      const newMapping = kalurahanMapping.filter(k => k.address.toLowerCase() !== addressToRemove.trim().toLowerCase());
      setKalurahanMapping(newMapping);
      // 3. Upload ke IPFS
      const jsonString = JSON.stringify(newMapping, null, 2);
      const cid = await uploadToPinata(jsonString, 'kalurahan.json');
      // 4. Update CID di smart contract
      await contractService.contract.setKalurahanMappingCID(cid);
      onSuccess('Mapping kalurahan berhasil diupdate di IPFS dan CID di smart contract!');
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

  // Handler verifikasi Dukcapil
  const handleVerifikasiDukcapil = async (isSetuju, alasanPenolakan = '') => {
    if (!selectedPermohonan) return;
    setIsVerifying(true);
    try {
      const result = await contractService.contract.verifikasiDukcapil(
        selectedPermohonan.id,
        isSetuju,
        alasanPenolakan || ''
      );
      await result.wait();
      onSuccess(`Permohonan ${selectedPermohonan.id} ${isSetuju ? 'disetujui' : 'ditolak'} oleh Dukcapil!`);
      // Reload daftar permohonan masuk (gabungan status)
      const statusIntPindah = STATUS_ENUM['Disetujui Kalurahan Tujuan'];
      const statusIntNonPindah = STATUS_ENUM['Disetujui Kalurahan'];
      const idsPindah = await contractService.contract.getPermohonanForDukcapil(statusIntPindah);
      const idsNonPindah = await contractService.contract.getPermohonanForDukcapil(statusIntNonPindah);
      const allIds = Array.from(new Set([
        ...idsPindah.map(id => Number(id)),
        ...idsNonPindah.map(id => Number(id))
      ]));
      const list = [];
      for (let id of allIds) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        if (
          detail.status === 'Disetujui Kalurahan Tujuan' ||
          (detail.status === 'Disetujui Kalurahan' && detail.jenis !== '4' && detail.jenis !== 'Pindah')
        ) {
          list.push(detail);
        }
      }
      setPermohonanMasuk(list);
      closeDetailModal();
    } catch (error) {
      const errorMessage = error.message || handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Render daftar permohonan masuk
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
                    <h3>Tambah Kalurahan</h3>
                    <form onSubmit={handleAddKalurahan} className="management-form">
                      <div className="form-group">
                        <label htmlFor="kalurahanName">Nama Kalurahan:</label>
                        <input
                          type="text"
                          id="kalurahanName"
                          value={kalurahanName}
                          onChange={(e) => setKalurahanName(e.target.value)}
                          placeholder="Nama Kalurahan"
                          className="form-input"
                          disabled={isLoadingLocal}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="kalurahanId">ID Kalurahan:</label>
                        <input
                          type="number"
                          id="kalurahanId"
                          value={kalurahanId}
                          onChange={(e) => setKalurahanId(e.target.value)}
                          placeholder="1, 2, 3, ..."
                          className="form-input"
                          disabled={isLoadingLocal}
                          min="1"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="kalurahanAddress">Alamat Wallet Kalurahan:</label>
                        <input
                          type="text"
                          id="kalurahanAddress"
                          value={kalurahanAddress}
                          onChange={(e) => setKalurahanAddress(e.target.value)}
                          placeholder="0x..."
                          className="form-input"
                          disabled={isLoadingLocal}
                        />
                      </div>
                      <button
                        type="submit"
                        className="add-button"
                        disabled={isLoadingLocal || !kalurahanName.trim() || !kalurahanId.trim() || !kalurahanAddress.trim()}
                      >
                        {isLoadingLocal ? 'Menambahkan...' : 'Tambah Kalurahan'}
                      </button>
                    </form>
                  </div>
                  <div className="management-card">
                    <h3>Hapus Kalurahan</h3>
                    <form onSubmit={onRemoveSubmit} className="management-form">
                      <div className="form-group">
                        <label htmlFor="removeKalurahanAddress">Alamat Wallet Kalurahan:</label>
                        <input
                          type="text"
                          id="removeKalurahanAddress"
                          value={removeKalurahanAddress}
                          onChange={(e) => setRemoveKalurahanAddress(e.target.value)}
                          placeholder="0x..."
                          className="form-input"
                          disabled={isLoadingLocal}
                        />
                      </div>
                      <button
                        type="submit"
                        className="remove-button"
                        disabled={isLoadingLocal || !removeKalurahanAddress.trim()}
                      >
                        {isLoadingLocal ? 'Menghapus...' : 'Hapus Kalurahan'}
                      </button>
                    </form>
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
            <h3>Konfirmasi Hapus Kalurahan</h3>
            <p>Apakah Anda yakin ingin menghapus kalurahan berikut?</p>
            <ul style={{margin:'12px 0 20px 0', paddingLeft:20}}>
              <li><b>Nama:</b> {kalurahanMapping.find(k => k.address.toLowerCase() === pendingRemoveAddress.toLowerCase())?.nama || '-'}</li>
              <li><b>ID:</b> {kalurahanMapping.find(k => k.address.toLowerCase() === pendingRemoveAddress.toLowerCase())?.id || '-'}</li>
              <li><b>Address:</b> {kalurahanMapping.find(k => k.address.toLowerCase() === pendingRemoveAddress.toLowerCase())?.address || pendingRemoveAddress}</li>
            </ul>
            <div style={{display:'flex', gap:16, marginTop:24}}>
              <button className="remove-button" onClick={confirmRemove} disabled={isLoading}>Ya, Hapus</button>
              <button className="cancel-button" onClick={cancelRemove} disabled={isLoading}>Batal</button>
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
            {(
              selectedPermohonan.status === 'Disetujui Kalurahan Tujuan' ||
              (selectedPermohonan.status === 'Disetujui Kalurahan' && selectedPermohonan.jenis !== '4' && selectedPermohonan.jenis !== 'Pindah')
            ) && (
              <div className="modal-footer">
                <div className="action-buttons">
                  <button 
                    className="btn-reject" 
                    onClick={() => {
                      const alasan = prompt('Masukkan alasan penolakan (opsional):');
                      if (alasan !== null) handleVerifikasiDukcapil(false, alasan);
                    }}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Memproses...' : 'Tolak'}
                  </button>
                  <button 
                    className="btn-approve" 
                    onClick={() => handleVerifikasiDukcapil(true)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Memproses...' : 'Setujui'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DukcapilDashboard; 