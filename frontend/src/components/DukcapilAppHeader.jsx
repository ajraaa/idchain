import { FaCrown, FaUserCircle, FaPowerOff } from 'react-icons/fa';

const DukcapilAppHeader = ({ walletAddress, onDisconnect, isLoading }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="dukcapil-app-header">
      <div className="header-left">
        <FaCrown className="header-crown" />
        <span className="header-title">Dashboard Dukcapil</span>
      </div>
      <div className="header-right">
        <span className="dukcapil-role"><FaUserCircle className="owner-profile-icon" /> Dukcapil</span>
        <button 
          className="disconnect-button dukcapil-disconnect-btn" 
          onClick={onDisconnect}
          disabled={isLoading}
          title="Putuskan Wallet"
        >
          <FaPowerOff style={{marginRight: 6}} /> Disconnect
        </button>
      </div>
    </header>
  );
};

export default DukcapilAppHeader; 