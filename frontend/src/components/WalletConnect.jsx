import { useState } from 'react';
import { ContractService } from '../utils/contract.js';

const WalletConnect = ({ onWalletConnected, onWalletDisconnected, isConnected, walletAddress }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    try {
      const service = new ContractService();
      const address = await service.connectWallet();
      console.log('WalletConnect: onWalletConnected dipanggil (manual)', address, service);
      onWalletConnected?.(address, service);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    onWalletDisconnected?.();
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (typeof window.ethereum === 'undefined') {
    return (
      <div className="wallet-connect">
        <div className="wallet-error">
          <p>MetaMask tidak terinstall. Silakan install MetaMask terlebih dahulu.</p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="metamask-link"
          >
            Download MetaMask
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {!isConnected ? (
        <button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="connect-button"
        >
          {isConnecting ? 'Menghubungkan...' : 'Hubungkan Wallet'}
        </button>
      ) : (
        <div className="wallet-info">
          <span className="wallet-address">
            {formatAddress(walletAddress)}
          </span>
          <button 
            onClick={disconnectWallet}
            className="disconnect-button"
          >
            Putuskan
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 