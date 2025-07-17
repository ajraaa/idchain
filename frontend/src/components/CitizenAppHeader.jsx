import { FaPowerOff, FaBell } from 'react-icons/fa';

const CitizenAppHeader = ({ walletAddress, citizenName, onDisconnect, isLoading, notificationBadge, onBellClick }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">IDChain</h1>
          <span className="header-subtitle">{citizenName || 'Loading...'}</span>
        </div>
        <div className="header-right">
          {/* Bell notification */}
          <div style={{ position: 'relative', cursor: 'pointer', marginRight: '1rem' }} onClick={onBellClick} title="Notifikasi Gabung KK">
            <FaBell size={22} color={notificationBadge ? '#dc2626' : '#888'} />
            {notificationBadge && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#dc2626',
                color: 'white',
                borderRadius: '50%',
                width: 14,
                height: 14,
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                border: '2px solid white',
                zIndex: 2
              }}>!</span>
            )}
          </div>
          <div className="wallet-info">
            <span className="wallet-label">Wallet:</span>
            <span className="wallet-address">{formatAddress(walletAddress)}</span>
          </div>
          <button 
            className="disconnect-button" 
            onClick={onDisconnect}
            disabled={isLoading}
            title="Putuskan Wallet"
            style={{ fontSize: '0.95rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaPowerOff style={{ fontSize: '1.1em' }} />
            <span>Putuskan</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CitizenAppHeader; 