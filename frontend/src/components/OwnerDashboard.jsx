import { useState } from 'react';
import { FaCrown, FaUserPlus, FaUserMinus, FaIdCard, FaBuilding, FaUserCircle, FaPowerOff } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';

const sidebarMenus = [
  { key: 'dukcapil', label: 'Kelola Dukcapil', icon: <FaIdCard /> },
  { key: 'kalurahan', label: 'Kelola Kalurahan', icon: <FaBuilding /> },
];

const OwnerDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('dukcapil');
  const [isLoadingLocal, setIsLoading] = useState(false);
  
  // Form states for Dukcapil
  const [dukcapilAddress, setDukcapilAddress] = useState('');
  const [removeDukcapilAddress, setRemoveDukcapilAddress] = useState('');
  
  // Form states for Kalurahan
  const [kalurahanAddress, setKalurahanAddress] = useState('');
  const [kalurahanId, setKalurahanId] = useState('');
  const [removeKalurahanAddress, setRemoveKalurahanAddress] = useState('');
  const [useKalurahanId, setUseKalurahanId] = useState(false);

  const handleAddDukcapil = async (e) => {
    e.preventDefault();
    if (!dukcapilAddress.trim()) {
      console.log('[OwnerDashboard] Error: Alamat wallet Dukcapil kosong');
      onError('Alamat wallet Dukcapil tidak boleh kosong');
      return;
    }

    console.log('[OwnerDashboard] Menambahkan Dukcapil:', dukcapilAddress.trim());
    setIsLoading(true);
    try {
      const result = await contractService.tambahDukcapil(dukcapilAddress.trim());
      console.log('[OwnerDashboard] Dukcapil berhasil ditambahkan:', {
        address: dukcapilAddress.trim(),
        transactionHash: result.transactionHash
      });
      onSuccess(`Dukcapil berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setDukcapilAddress('');
    } catch (error) {
      console.error('[OwnerDashboard] Error menambahkan Dukcapil:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDukcapil = async (e) => {
    e.preventDefault();
    if (!removeDukcapilAddress.trim()) {
      console.log('[OwnerDashboard] Error: Alamat wallet Dukcapil kosong');
      onError('Alamat wallet Dukcapil tidak boleh kosong');
      return;
    }

    console.log('[OwnerDashboard] Menghapus Dukcapil:', removeDukcapilAddress.trim());
    setIsLoading(true);
    try {
      const result = await contractService.hapusDukcapil(removeDukcapilAddress.trim());
      console.log('[OwnerDashboard] Dukcapil berhasil dihapus:', {
        address: removeDukcapilAddress.trim(),
        transactionHash: result.transactionHash
      });
      onSuccess(`Dukcapil berhasil dihapus! Transaction: ${result.transactionHash}`);
      setRemoveDukcapilAddress('');
    } catch (error) {
      console.error('[OwnerDashboard] Error menghapus Dukcapil:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKalurahan = async (e) => {
    e.preventDefault();
    if (!kalurahanAddress.trim()) {
      console.log('[OwnerDashboard] Error: Alamat wallet Kalurahan kosong');
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    if (useKalurahanId && !kalurahanId.trim()) {
      console.log('[OwnerDashboard] Error: ID Kalurahan kosong');
      onError('ID Kalurahan tidak boleh kosong');
      return;
    }

    const kalurahanData = {
      address: kalurahanAddress.trim(),
      useId: useKalurahanId,
      id: useKalurahanId ? parseInt(kalurahanId) : null
    };
    
    console.log('[OwnerDashboard] Menambahkan Kalurahan:', kalurahanData);
    setIsLoading(true);
    try {
      let result;
      if (useKalurahanId) {
        result = await contractService.tambahKalurahanById(parseInt(kalurahanId), kalurahanAddress.trim());
        console.log('[OwnerDashboard] Kalurahan berhasil ditambahkan dengan ID:', {
          address: kalurahanAddress.trim(),
          id: parseInt(kalurahanId),
          transactionHash: result.transactionHash
        });
      } else {
        result = await contractService.tambahKalurahan(kalurahanAddress.trim());
        console.log('[OwnerDashboard] Kalurahan berhasil ditambahkan tanpa ID:', {
          address: kalurahanAddress.trim(),
          transactionHash: result.transactionHash
        });
      }
      onSuccess(`Kalurahan berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setKalurahanAddress('');
      setKalurahanId('');
    } catch (error) {
      console.error('[OwnerDashboard] Error menambahkan Kalurahan:', error);
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKalurahan = async (e) => {
    e.preventDefault();
    if (!removeKalurahanAddress.trim()) {
      console.log('[OwnerDashboard] Error: Alamat wallet Kalurahan kosong');
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    console.log('[OwnerDashboard] Menghapus Kalurahan:', removeKalurahanAddress.trim());
    setIsLoading(true);
    try {
      const result = await contractService.hapusKalurahan(removeKalurahanAddress.trim());
      console.log('[OwnerDashboard] Kalurahan berhasil dihapus:', {
        address: removeKalurahanAddress.trim(),
        transactionHash: result.transactionHash
      });
      onSuccess(`Kalurahan berhasil dihapus! Transaction: ${result.transactionHash}`);
      setRemoveKalurahanAddress('');
    } catch (error) {
      console.error('[OwnerDashboard] Error menghapus Kalurahan:', error);
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
    <div className="owner-app-root">
      <div className="owner-app-body">
        <Sidebar
          menus={sidebarMenus}
          activeMenu={activeTab}
          onMenuClick={setActiveTab}
          walletAddress={walletAddress}
        />
        <main className="owner-main-area">
          <div className="owner-main-card">
            <div className="owner-header-main">
              <h2 className="owner-title-main">Dashboard Owner</h2>
              <p className="owner-subtitle-main">Kelola akses Dukcapil dan Kalurahan</p>
            </div>
            <div className="tab-content">
              {activeTab === 'dukcapil' && (
                <div className="dukcapil-section">
                  <div className="management-card">
                    <h3>Tambah Dukcapil</h3>
                    <form onSubmit={handleAddDukcapil} className="management-form">
                      <div className="form-group">
                        <label htmlFor="dukcapilAddress">Alamat Wallet Dukcapil:</label>
                        <input
                          type="text"
                          id="dukcapilAddress"
                          value={dukcapilAddress}
                          onChange={(e) => setDukcapilAddress(e.target.value)}
                          placeholder="0x..."
                          className="form-input"
                          disabled={isLoading}
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="add-button"
                        disabled={isLoading || !dukcapilAddress.trim()}
                      >
                        {isLoading ? 'Menambahkan...' : 'Tambah Dukcapil'}
                      </button>
                    </form>
                  </div>

                  <div className="management-card">
                    <h3>Hapus Dukcapil</h3>
                    <form onSubmit={handleRemoveDukcapil} className="management-form">
                      <div className="form-group">
                        <label htmlFor="removeDukcapilAddress">Alamat Wallet Dukcapil:</label>
                        <input
                          type="text"
                          id="removeDukcapilAddress"
                          value={removeDukcapilAddress}
                          onChange={(e) => setRemoveDukcapilAddress(e.target.value)}
                          placeholder="0x..."
                          className="form-input"
                          disabled={isLoading}
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="remove-button"
                        disabled={isLoading || !removeDukcapilAddress.trim()}
                      >
                        {isLoading ? 'Menghapus...' : 'Hapus Dukcapil'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'kalurahan' && (
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
                          disabled={isLoading}
                        />
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={useKalurahanId}
                            onChange={(e) => setUseKalurahanId(e.target.checked)}
                            disabled={isLoading}
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
                            disabled={isLoading}
                            min="1"
                          />
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="add-button"
                        disabled={isLoading || !kalurahanAddress.trim() || (useKalurahanId && !kalurahanId.trim())}
                      >
                        {isLoading ? 'Menambahkan...' : 'Tambah Kalurahan'}
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
                          disabled={isLoading}
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="remove-button"
                        disabled={isLoading || !removeKalurahanAddress.trim()}
                      >
                        {isLoading ? 'Menghapus...' : 'Hapus Kalurahan'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerDashboard; 