import { useState, useEffect, useRef } from 'react';
import { FaBuilding } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { uploadToPinata } from '../utils/pinata';

const sidebarMenus = [
  { key: 'kalurahan', label: 'Kelola Kalurahan', icon: <FaBuilding /> },
];

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
              <p className="dukcapil-subtitle-main">Kelola akses Kalurahan</p>
            </div>
            <div className="tab-content">
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
    </div>
  );
};

export default DukcapilDashboard; 