import { FaPowerOff } from 'react-icons/fa';

const CitizenAppHeader = ({ walletAddress, citizenName, onDisconnect, isLoading }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="citizen-app-header">
      <div className="citizen-header-content">
        <div className="citizen-header-left">
          <h1 className="citizen-app-title">IDChain</h1>
          <span className="citizen-app-subtitle">{citizenName || 'Loading...'}</span>
        </div>
        <div className="citizen-header-right">
          <div className="citizen-wallet-info">
            <span className="citizen-wallet-label">Wallet:</span>
            <span className="citizen-wallet-address">{formatAddress(walletAddress)}</span>
          </div>
          <button 
            className="citizen-disconnect-button" 
            onClick={onDisconnect}
            disabled={isLoading}
            title="Putuskan Wallet"
          >
            <FaPowerOff />
            <span>Putuskan</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CitizenAppHeader; 