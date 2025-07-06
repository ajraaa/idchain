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
        <div className="wallet-error" style={{borderRadius: '10px', padding: '1.5rem', margin: '1rem 0'}}>
          <p style={{marginBottom: '1rem'}}>MetaMask tidak terinstall. Silakan install MetaMask terlebih dahulu.</p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="metamask-link"
            style={{display: 'inline-block', borderRadius: '25px', padding: '0.75rem 1.5rem', fontWeight: 600, marginTop: '1rem'}}
          >
            Download MetaMask
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect" style={{padding: '1.5rem 0'}}>
      {!isConnected ? (
        <button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="connect-button"
          style={{borderRadius: '12px', padding: '0.8rem 2.2rem', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.5rem'}}
        >
          {isConnecting ? 'Menghubungkan...' : 'Hubungkan Wallet'}
        </button>
      ) : (
        <div className="wallet-info" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', marginTop: '0.5rem'}}>
          <span className="wallet-address" style={{fontFamily: 'Fira Mono, monospace', background: '#f3f4f6', borderRadius: '6px', padding: '0.2rem 0.7rem', fontSize: '1.05rem'}}>
            {formatAddress(walletAddress)}
          </span>
          <button 
            onClick={disconnectWallet}
            className="disconnect-button"
            style={{borderRadius: '8px', padding: '0.6rem 1.5rem', fontWeight: 600}}
          >
            Putuskan
          </button>
        </div>
      )}
      {error && (
        <div className="error-message" style={{color: '#e74c3c', marginTop: '1rem'}}>
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 