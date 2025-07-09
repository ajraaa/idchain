import { useState, useEffect } from 'react'
import WalletConnect from './components/WalletConnect'
import IdentityForm from './components/IdentityForm'
import DukcapilDashboard from './components/DukcapilDashboard'
import DukcapilAppHeader from './components/DukcapilAppHeader'
import CitizenDashboard from './components/CitizenDashboard'
import CitizenAppHeader from './components/CitizenAppHeader'
import Notification from './components/Notification'
import './App.css'
import { FaWallet, FaIdCard } from 'react-icons/fa';
import { enhanceNotificationMessage } from './utils/notificationHelper.js';



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
  const [isDukcapil, setIsDukcapil] = useState(false)
  const [isCheckingDukcapil, setIsCheckingDukcapil] = useState(false)
  const [citizenName, setCitizenName] = useState('')

  // Pindahkan checkWalletStatus ke luar useEffect agar bisa dipanggil manual
  const checkWalletStatus = async () => {
    if (
      contractService &&
      contractService.contract &&
      walletAddress
    ) {
      setIsCheckingNIK(true)
      setIsCheckingDukcapil(true)
      try {
        // Check if wallet is dukcapil
        console.log('[Gateway] Checking dukcapil status for wallet:', walletAddress)
        const dukcapilStatus = await contractService.checkIfDukcapil(walletAddress)
        setIsDukcapil(dukcapilStatus)
        console.log('[Gateway] Dukcapil status:', dukcapilStatus)
        // If not dukcapil, check NIK registration
        if (!dukcapilStatus) {
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
        } else {
          setNikTeregistrasi(null)
        }
      } catch (err) {
        setNikTeregistrasi(false)
        setIsDukcapil(false)
        console.log('[Gateway] Error checking wallet status:', err)
      } finally {
        setIsCheckingNIK(false)
        setIsCheckingDukcapil(false)
      }
    } else {
      setNikTeregistrasi(null)
      setIsDukcapil(false)
      setIsCheckingNIK(false)
      setIsCheckingDukcapil(false)
    }
  }

  // useEffect tetap, tapi panggil checkWalletStatus
  useEffect(() => {
    checkWalletStatus()
  }, [contractService, walletAddress])

  const handleWalletConnected = (address, service) => {
    console.log('App: handleWalletConnected', address, service);
    setWalletAddress(prev => (prev === address ? prev : address));
    setContractService(prev => (prev === service ? prev : service));
    setIsWalletConnected(true);
    showNotification('Wallet berhasil terhubung!', 'success', true, 'wallet');
  }

  const handleWalletDisconnected = () => {
    setWalletAddress('')
    setContractService(null)
    setIsWalletConnected(false)
    setNikTeregistrasi(null)
    setIsDukcapil(false)
    setIsCheckingNIK(false)
    setIsCheckingDukcapil(false)
    showNotification('Wallet terputus', 'info', true, 'wallet')
  }

  // Ubah handleVerificationSuccess agar panggil checkWalletStatus setelah register
  const handleVerificationSuccess = async (result) => {
    await checkWalletStatus(); // Paksa refresh status wallet dari smart contract
    showNotification(
      `Identitas berhasil diverifikasi! NIK ${result.nik} telah terdaftar dengan wallet ${result.wallet}. Transaction: ${result.transactionHash}`,
      'success',
      false,
      'verification'
    );
  }

  const handleVerificationError = (error) => {
    showNotification(error, 'error', false, 'verification')
  }

  const handleDukcapilSuccess = (message) => {
    showNotification(message, 'success', true, 'dukcapil')
  }

  const handleDukcapilError = (error) => {
    showNotification(error, 'error', false, 'dukcapil')
  }

  const showNotification = (message, type = 'info', autoClose = true, context = '') => {
    setNotification({
      message,
      type,
      autoClose,
      context,
      id: Date.now()
    })
  }

  const closeNotification = () => {
    setNotification(null)
  }

  // Render logic
  let mainContent
  let appHeader = null
  if (isDukcapil) {
    appHeader = (
      <DukcapilAppHeader 
        walletAddress={walletAddress}
        onDisconnect={handleWalletDisconnected}
        isLoading={isCheckingDukcapil || isCheckingNIK}
      />
    )
    mainContent = (
      <DukcapilDashboard 
        walletAddress={walletAddress} 
        contractService={contractService}
        onDisconnect={handleWalletDisconnected}
        onSuccess={handleDukcapilSuccess}
        onError={handleDukcapilError}
        isLoading={isCheckingDukcapil || isCheckingNIK}
      />
    )
  } else if (!isWalletConnected) {
    mainContent = <Gateway onWalletConnected={handleWalletConnected} />
  } else if (isCheckingDukcapil || nikTeregistrasi === null) {
    mainContent = <div className="main-card" style={{textAlign:'center'}}><p>Memeriksa status wallet...</p></div>
  } else if (nikTeregistrasi) {
    appHeader = (
      <CitizenAppHeader 
        walletAddress={walletAddress}
        citizenName={citizenName || `NIK: ${nikTeregistrasi}`}
        onDisconnect={handleWalletDisconnected}
        isLoading={isCheckingDukcapil || isCheckingNIK}
      />
    )
    mainContent = (
      <CitizenDashboard 
        walletAddress={walletAddress} 
        contractService={contractService}
        onDisconnect={handleWalletDisconnected}
        onSuccess={handleVerificationSuccess}
        onError={handleVerificationError}
        isLoading={isCheckingDukcapil || isCheckingNIK}
        onCitizenNameLoaded={setCitizenName}
      />
    )
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
      {appHeader ? appHeader : (
        <header className="app-header">
          <h1>IDChain - Sistem Identitas Digital</h1>
          <p>Sistem pencatatan sipil terdesentralisasi berbasis blockchain</p>
        </header>
      )}

      <main className="app-main">
          {mainContent}
      </main>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
          autoClose={notification.autoClose}
          context={notification.context}
        />
      )}

      <footer className="app-footer">
        <p>&copy; 2024 IDChain - Sistem Identitas Digital Terdesentralisasi</p>
      </footer>
    </div>
  )
}

export default App
