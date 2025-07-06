import { useState, useEffect } from 'react'
import WalletConnect from './components/WalletConnect'
import IdentityForm from './components/IdentityForm'
import Notification from './components/Notification'
import './App.css'
import { FaWallet, FaIdCard } from 'react-icons/fa';

function Dashboard({ walletAddress, nik, onDisconnect }) {
  return (
    <div className="dashboard-card">
      <h2 className="dashboard-title">Dashboard</h2>
      <p className="dashboard-welcome">Selamat datang!</p>
      <div className="dashboard-info-list">
        <div className="dashboard-info-item">
          <FaWallet className="dashboard-icon" />
          <span className="dashboard-label">Wallet:</span>
          <span className="dashboard-value">{walletAddress}</span>
        </div>
        <div className="dashboard-info-item">
          <FaIdCard className="dashboard-icon" />
          <span className="dashboard-label">NIK:</span>
          <span className="dashboard-value">{nik}</span>
        </div>
      </div>
      <button 
        className="disconnect-button" 
        style={{width: '100%'}} 
        onClick={onDisconnect}
      >
        Putuskan Wallet
      </button>
    </div>
  )
}

function Gateway({ onWalletConnected }) {
  return (
    <div className="main-card gateway">
      <h2>Gateway</h2>
      <p>Silakan hubungkan wallet Anda untuk melanjutkan.</p>
      <WalletConnect onWalletConnected={onWalletConnected} />
    </div>
  )
}

function App() {
  const [contractService, setContractService] = useState(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [notification, setNotification] = useState(null)
  const [nikTeregistrasi, setNikTeregistrasi] = useState(null) // null: belum dicek, string: sudah teregistrasi, false: belum
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isCheckingNIK, setIsCheckingNIK] = useState(false)

  // Cek NIK wallet setelah connect
  useEffect(() => {
    const checkNIK = async () => {
      if (
        contractService &&
        contractService.contract &&
        walletAddress
      ) {
        setIsCheckingNIK(true)
        try {
          console.log('[Gateway] Checking NIK for wallet:', walletAddress)
          const nik = await contractService.contract.nikByWallet(walletAddress)
          console.log('[Gateway] Result NIK:', nik)
          if (nik && nik !== '') {
            setNikTeregistrasi(nik)
            console.log('[Gateway] Wallet is registered with NIK:', nik)
          } else {
            setNikTeregistrasi(false)
            console.log('[Gateway] Wallet is NOT registered')
          }
        } catch (err) {
          setNikTeregistrasi(false)
          console.log('[Gateway] Error checking NIK:', err)
        } finally {
          setIsCheckingNIK(false)
        }
      } else {
        setNikTeregistrasi(null)
        setIsCheckingNIK(false)
      }
    }
    checkNIK()
  }, [contractService, walletAddress])

  const handleWalletConnected = (address, service) => {
    console.log('App: handleWalletConnected', address, service);
    setWalletAddress(prev => (prev === address ? prev : address));
    setContractService(prev => (prev === service ? prev : service));
    setIsWalletConnected(true);
    showNotification('Wallet berhasil terhubung!', 'success');
  }

  const handleWalletDisconnected = () => {
    setWalletAddress('')
    setContractService(null)
    setIsWalletConnected(false)
    setNikTeregistrasi(null)
    setIsCheckingNIK(false)
    showNotification('Wallet terputus', 'info')
  }

  const handleVerificationSuccess = (result) => {
    setNikTeregistrasi(result.nik)
    showNotification(
      `Identitas berhasil diverifikasi! NIK ${result.nik} telah terdaftar dengan wallet ${result.wallet}. Transaction: ${result.transactionHash}`,
      'success',
      false
    )
  }

  const handleVerificationError = (error) => {
    showNotification(error, 'error')
  }

  const showNotification = (message, type = 'info', autoClose = true) => {
    setNotification({
      message,
      type,
      autoClose,
      id: Date.now()
    })
  }

  const closeNotification = () => {
    setNotification(null)
  }

  // Render logic
  let mainContent
  if (!isWalletConnected) {
    mainContent = <Gateway onWalletConnected={handleWalletConnected} />
  } else if (isCheckingNIK || nikTeregistrasi === null) {
    mainContent = <div className="main-card" style={{textAlign:'center'}}><p>Memeriksa status wallet...</p></div>
  } else if (nikTeregistrasi) {
    mainContent = <Dashboard walletAddress={walletAddress} nik={nikTeregistrasi} onDisconnect={handleWalletDisconnected} />
  } else {
    mainContent = (
      <div className="main-card">
        <div className="wallet-section-box">
          <section className="wallet-section">
            <h2>Hubungkan Wallet</h2>
            <WalletConnect
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
              isConnected={isWalletConnected}
              walletAddress={walletAddress}
            />
          </section>
        </div>
        <section className="identity-section">
          <IdentityForm
            contractService={contractService}
            onSuccess={handleVerificationSuccess}
            onError={handleVerificationError}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>IDChain - Sistem Identitas Digital</h1>
        <p>Sistem pencatatan sipil terdesentralisasi berbasis blockchain</p>
      </header>

      <main className="app-main">
          {mainContent}
      </main>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
          autoClose={notification.autoClose}
        />
      )}

      <footer className="app-footer">
        <p>&copy; 2024 IDChain - Sistem Identitas Digital Terdesentralisasi</p>
      </footer>
    </div>
  )
}

export default App
