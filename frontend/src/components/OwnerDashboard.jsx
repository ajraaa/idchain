import { useState } from 'react';
import { FaCrown, FaUserPlus, FaUserMinus, FaIdCard, FaBuilding, FaUserCircle, FaPowerOff } from 'react-icons/fa';
import Sidebar from './Sidebar';

const sidebarMenus = [
  { key: 'dukcapil', label: 'Kelola Dukcapil', icon: <FaIdCard /> },
  { key: 'kalurahan', label: 'Kelola Kalurahan', icon: <FaBuilding /> },
];

const OwnerDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('dukcapil');
  
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
      onError('Alamat wallet Dukcapil tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      const result = await contractService.tambahDukcapil(dukcapilAddress.trim());
      onSuccess(`Dukcapil berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setDukcapilAddress('');
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDukcapil = async (e) => {
    e.preventDefault();
    if (!removeDukcapilAddress.trim()) {
      onError('Alamat wallet Dukcapil tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      const result = await contractService.hapusDukcapil(removeDukcapilAddress.trim());
      onSuccess(`Dukcapil berhasil dihapus! Transaction: ${result.transactionHash}`);
      setRemoveDukcapilAddress('');
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKalurahan = async (e) => {
    e.preventDefault();
    if (!kalurahanAddress.trim()) {
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    if (useKalurahanId && !kalurahanId.trim()) {
      onError('ID Kalurahan tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      if (useKalurahanId) {
        result = await contractService.tambahKalurahanById(parseInt(kalurahanId), kalurahanAddress.trim());
      } else {
        result = await contractService.tambahKalurahan(kalurahanAddress.trim());
      }
      onSuccess(`Kalurahan berhasil ditambahkan! Transaction: ${result.transactionHash}`);
      setKalurahanAddress('');
      setKalurahanId('');
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKalurahan = async (e) => {
    e.preventDefault();
    if (!removeKalurahanAddress.trim()) {
      onError('Alamat wallet Kalurahan tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      const result = await contractService.hapusKalurahan(removeKalurahanAddress.trim());
      onSuccess(`Kalurahan berhasil dihapus! Transaction: ${result.transactionHash}`);
      setRemoveKalurahanAddress('');
    } catch (error) {
      onError(error.message);
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