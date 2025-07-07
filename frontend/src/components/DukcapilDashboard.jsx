import { useState } from 'react';
import { FaBuilding } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';

const sidebarMenus = [
  { key: 'kalurahan', label: 'Kelola Kalurahan', icon: <FaBuilding /> },
];

const DukcapilDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('kalurahan');
  const [isLoadingLocal, setIsLoading] = useState(false);
  
  // Form states for Kalurahan
  const [kalurahanAddress, setKalurahanAddress] = useState('');
  const [kalurahanId, setKalurahanId] = useState('');
  const [removeKalurahanAddress, setRemoveKalurahanAddress] = useState('');
  const [useKalurahanId, setUseKalurahanId] = useState(false);

  const handleAddKalurahan = async (e) => {
    e.preventDefault();
    if (!kalurahanAddress.trim()) {
      console.log('[DukcapilDashboard] Error: Alamat wallet Kalurahan kosong');
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    if (useKalurahanId && !kalurahanId.trim()) {
      console.log('[DukcapilDashboard] Error: ID Kalurahan kosong');
      onError('ID Kalurahan tidak boleh kosong');
      return;
    }

    const kalurahanData = {
      address: kalurahanAddress.trim(),
      useId: useKalurahanId,
      id: useKalurahanId ? parseInt(kalurahanId) : null
    };
    
    console.log('[DukcapilDashboard] Menambahkan Kalurahan:', kalurahanData);
    setIsLoading(true);
    try {
      let result;
      if (useKalurahanId) {
        result = await contractService.tambahKalurahanById(parseInt(kalurahanId), kalurahanAddress.trim());
        console.log('[DukcapilDashboard] Kalurahan berhasil ditambahkan dengan ID:', {
          address: kalurahanAddress.trim(),
          id: parseInt(kalurahanId),
          transactionHash: result.transactionHash
        });
      } else {
        result = await contractService.tambahKalurahan(kalurahanAddress.trim());
        console.log('[DukcapilDashboard] Kalurahan berhasil ditambahkan tanpa ID:', {
          address: kalurahanAddress.trim(),
          transactionHash: result.transactionHash
        });
      }
      onSuccess(`Kalurahan berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setKalurahanAddress('');
      setKalurahanId('');
    } catch (error) {
      console.error('[DukcapilDashboard] Error menambahkan Kalurahan:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKalurahan = async (e) => {
    e.preventDefault();
    if (!removeKalurahanAddress.trim()) {
      console.log('[DukcapilDashboard] Error: Alamat wallet Kalurahan kosong');
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    console.log('[DukcapilDashboard] Menghapus Kalurahan:', removeKalurahanAddress.trim());
    setIsLoading(true);
    try {
      const result = await contractService.hapusKalurahan(removeKalurahanAddress.trim());
      console.log('[DukcapilDashboard] Kalurahan berhasil dihapus:', {
        address: removeKalurahanAddress.trim(),
        transactionHash: result.transactionHash
      });
      onSuccess(`Kalurahan berhasil dihapus! Transaction: ${result.transactionHash}`);
      setRemoveKalurahanAddress('');
    } catch (error) {
      console.error('[DukcapilDashboard] Error menghapus Kalurahan:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
          walletAddress={walletAddress}
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
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={useKalurahanId}
                          onChange={(e) => setUseKalurahanId(e.target.checked)}
                          disabled={isLoadingLocal}
                        />
                        Tambahkan dengan ID Kalurahan
                      </label>
                    </div>
                    {useKalurahanId && (
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
                    )}
                    <button
                      type="submit"
                      className="add-button"
                      disabled={isLoadingLocal || !kalurahanAddress.trim() || (useKalurahanId && !kalurahanId.trim())}
                    >
                      {isLoadingLocal ? 'Menambahkan...' : 'Tambah Kalurahan'}
                    </button>
                  </form>
                </div>
                <div className="management-card">
                  <h3>Hapus Kalurahan</h3>
                  <form onSubmit={handleRemoveKalurahan} className="management-form">
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
    </div>
  );
};

export default DukcapilDashboard; 