import { useState, useEffect } from 'react';
import { FaInbox, FaExchangeAlt, FaHistory, FaHome } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import KalurahanAppHeader from './KalurahanAppHeader';

const sidebarMenus = [
  { key: 'masuk', label: 'Permohonan Masuk', icon: <FaInbox /> },
  { key: 'pindah', label: 'Permohonan Pindah Masuk', icon: <FaExchangeAlt /> },
  { key: 'riwayat', label: 'Riwayat Permohonan', icon: <FaHistory /> },
  { key: 'profile', label: 'Profile Kalurahan', icon: <FaHome /> },
];

const KalurahanDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading }) => {
  const [activeTab, setActiveTab] = useState('masuk');
  const [isLoadingLocal, setIsLoading] = useState(false);
  const [permohonanMasuk, setPermohonanMasuk] = useState([]);
  const [permohonanPindah, setPermohonanPindah] = useState([]);
  const [riwayatPermohonan, setRiwayatPermohonan] = useState([]);
  const [kalurahanMapping, setKalurahanMapping] = useState([]);
  const [profile, setProfile] = useState({ id: '', nama: '', address: '' });

  // Judul dan subjudul dinamis
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'masuk':
        return 'Permohonan Masuk';
      case 'pindah':
        return 'Permohonan Pindah Masuk';
      case 'riwayat':
        return 'Riwayat Permohonan';
      case 'profile':
        return 'Profile Kalurahan';
      default:
        return 'Dashboard Kalurahan';
    }
  };
  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'masuk':
        return 'Kelola permohonan masuk yang membutuhkan verifikasi.';
      case 'pindah':
        return 'Kelola permohonan pindah masuk ke kalurahan Anda.';
      case 'riwayat':
        return 'Riwayat semua permohonan yang pernah diproses.';
      case 'profile':
        return 'Lihat dan kelola profil kalurahan Anda.';
      default:
        return 'Kelola permohonan dan data kalurahan Anda';
    }
  };

  // Fetch mapping kalurahan dari IPFS
  useEffect(() => {
    async function fetchKalurahanMapping() {
      if (!contractService || !contractService.contract) return;
      try {
        const cid = await contractService.contract.getKalurahanMappingCID();
        if (!cid) return;
        const url = `https://ipfs.io/ipfs/${cid}`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        setKalurahanMapping(data);
      } catch (e) {}
    }
    fetchKalurahanMapping();
  }, [contractService]);

  // Fetch profile kalurahan
  useEffect(() => {
    async function fetchProfile() {
      if (!contractService || !contractService.contract || !walletAddress) return;
      try {
        const id = await contractService.contract.idKalurahanByAddress(walletAddress);
        let nama = '';
        if (kalurahanMapping.length > 0) {
          const found = kalurahanMapping.find(k => k.address.toLowerCase() === walletAddress.toLowerCase());
          if (found) nama = found.nama;
        }
        setProfile({ id, nama, address: walletAddress });
      } catch (e) {
        setProfile({ id: '', nama: '', address: walletAddress });
      }
    }
    fetchProfile();
  }, [contractService, walletAddress, kalurahanMapping]);

  // Fetch permohonan masuk (asal)
  useEffect(() => {
    async function fetchPermohonanMasuk() {
      if (!contractService || !contractService.contract) return;
      try {
        const ids = await contractService.contract.getPermohonanByKalurahanAsal();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          // Filter status Diajukan (butuh verifikasi)
          if (detail.status === 'Diajukan') list.push(detail);
        }
        setPermohonanMasuk(list);
      } catch (e) {
        setPermohonanMasuk([]);
      }
    }
    fetchPermohonanMasuk();
  }, [contractService]);

  // Fetch permohonan pindah masuk (tujuan)
  useEffect(() => {
    async function fetchPermohonanPindah() {
      if (!contractService || !contractService.contract) return;
      try {
        const ids = await contractService.contract.getPermohonanByKalurahanTujuan();
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          // Filter status DisetujuiKalurahanAsal (menunggu verifikasi tujuan)
          if (detail.status === 'DisetujuiKalurahanAsal') list.push(detail);
        }
        setPermohonanPindah(list);
      } catch (e) {
        setPermohonanPindah([]);
      }
    }
    fetchPermohonanPindah();
  }, [contractService]);

  // Fetch riwayat permohonan (asal + tujuan, semua status)
  useEffect(() => {
    async function fetchRiwayat() {
      if (!contractService || !contractService.contract) return;
      try {
        const asalIds = await contractService.contract.getPermohonanByKalurahanAsal();
        const tujuanIds = await contractService.contract.getPermohonanByKalurahanTujuan();
        const allIds = Array.from(new Set([...asalIds, ...tujuanIds]));
        const list = [];
        for (let id of allIds) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          list.push(detail);
        }
        setRiwayatPermohonan(list);
      } catch (e) {
        setRiwayatPermohonan([]);
      }
    }
    fetchRiwayat();
  }, [contractService]);

  // Renderers
  const renderPermohonanMasuk = () => (
    <div className="management-card">
      {permohonanMasuk.length === 0 ? <div>Tidak ada permohonan masuk.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {permohonanMasuk.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.jenis}</td>
                <td>{p.status}</td>
                <td>{p.pemohon}</td>
                <td><button className="verify-button">Verifikasi</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderPermohonanPindah = () => (
    <div className="management-card">
      {permohonanPindah.length === 0 ? <div>Tidak ada permohonan pindah masuk.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {permohonanPindah.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.jenis}</td>
                <td>{p.status}</td>
                <td>{p.pemohon}</td>
                <td><button className="verify-button">Verifikasi</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderRiwayat = () => (
    <div className="management-card">
      {riwayatPermohonan.length === 0 ? <div>Tidak ada riwayat permohonan.</div> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Jenis</th><th>Status</th><th>Pemohon</th>
            </tr>
          </thead>
          <tbody>
            {riwayatPermohonan.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.jenis}</td>
                <td>{p.status}</td>
                <td>{p.pemohon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="management-card">
      <div><b>ID:</b> {profile.id}</div>
      <div><b>Nama:</b> {profile.nama}</div>
      <div><b>Wallet:</b> {profile.address}</div>
    </div>
  );

  return (
    <>
      {/* Header fixed di paling atas, di luar root layout */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 100 }}>
        <KalurahanAppHeader
          walletAddress={walletAddress}
          kalurahanName={profile.nama}
          kalurahanId={profile.id}
          onDisconnect={onDisconnect}
          isLoading={isLoadingLocal}
        />
      </div>
      {/* Root layout di bawah header */}
      <div className="dukcapil-app-root">
        <div className="dukcapil-app-body">
          <Sidebar
            menus={sidebarMenus}
            activeMenu={activeTab}
            onMenuClick={setActiveTab}
          />
          <main className="dukcapil-main-area">
            <div className="dukcapil-main-card">
              <div className="dukcapil-header-main">
                <h2 className="dukcapil-title-main">{getHeaderTitle()}</h2>
                <p className="dukcapil-subtitle-main">{getHeaderSubtitle()}</p>
              </div>
              <div className="tab-content">
                {activeTab === 'masuk' && renderPermohonanMasuk()}
                {activeTab === 'pindah' && renderPermohonanPindah()}
                {activeTab === 'riwayat' && renderRiwayat()}
                {activeTab === 'profile' && renderProfile()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default KalurahanDashboard; 