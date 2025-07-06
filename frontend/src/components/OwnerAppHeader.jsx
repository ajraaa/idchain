import { FaCrown, FaUserCircle, FaPowerOff } from 'react-icons/fa';

const OwnerAppHeader = ({ walletAddress, onDisconnect, isLoading }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="owner-app-header">
      <div className="header-left">
        <FaCrown className="header-crown" />
        <span className="header-title">IDChain Dashboard</span>
      </div>
      <div className="header-right">
        <span className="owner-role"><FaUserCircle className="owner-profile-icon" /> Owner</span>
        <button 
          className="disconnect-button header-disconnect-btn" 
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

export default OwnerAppHeader; 