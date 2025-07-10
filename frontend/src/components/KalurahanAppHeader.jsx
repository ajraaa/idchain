import { FaPowerOff } from 'react-icons/fa';

const KalurahanAppHeader = ({ walletAddress, kalurahanName, kalurahanId, onDisconnect, isLoading }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">IDChain</h1>
          <span className="header-subtitle">{kalurahanName ? `${kalurahanName} (ID: ${kalurahanId})` : `ID: ${kalurahanId}`}</span>
        </div>
        <div className="header-right">
          <div className="wallet-info">
            <span className="wallet-label">Wallet:</span>
            <span className="wallet-address">{formatAddress(walletAddress)}</span>
          </div>
          <button 
            className="disconnect-button" 
            onClick={onDisconnect}
            disabled={isLoading}
            title="Putuskan Wallet"
          >
            <span>Putuskan</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default KalurahanAppHeader; 