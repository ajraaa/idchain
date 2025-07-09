import { useState, useEffect } from 'react';
import { FaUser, FaFileAlt, FaList, FaDownload, FaPowerOff } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';
import { fetchFromIPFS, loadNIKMapping } from '../utils/ipfs.js';
import { decryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

const sidebarMenus = [
  { key: 'profile', label: 'Profile', icon: <FaUser /> },
  { key: 'ajukan', label: 'Ajukan Permohonan', icon: <FaFileAlt /> },
  { key: 'daftar', label: 'Daftar Permohonan', icon: <FaList /> },
  { key: 'dokumen', label: 'Dokumen Resmi', icon: <FaDownload /> },
];

const CitizenDashboard = ({ walletAddress, contractService, onDisconnect, onSuccess, onError, isLoading, onCitizenNameLoaded }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoadingLocal, setIsLoading] = useState(false);
  const [citizenData, setCitizenData] = useState(null);
  const [permohonans, setPermohonans] = useState([]);
  const [dokumenResmi, setDokumenResmi] = useState([]);
  const [selectedPermohonan, setSelectedPermohonan] = useState(null);
  const [showPermohonanDetail, setShowPermohonanDetail] = useState(false);
  
  // Form states for Ajukan Permohonan
  const [jenisPermohonan, setJenisPermohonan] = useState('');
  const [idKalurahanAsal, setIdKalurahanAsal] = useState('');
  const [idKalurahanTujuan, setIdKalurahanTujuan] = useState('');
  const [cidIPFS, setCidIPFS] = useState('');
  
  // Additional form states for Pindah
  const [alasanPindah, setAlasanPindah] = useState('');
  const [alasanPindahLainnya, setAlasanPindahLainnya] = useState('');
  const [pindahSemua, setPindahSemua] = useState(false);
  const [anggotaPindah, setAnggotaPindah] = useState([]);
  const [jenisPindah, setJenisPindah] = useState('');
  const [nikKepalaKeluargaBaru, setNikKepalaKeluargaBaru] = useState('');
  const [nikKepalaKeluargaTujuan, setNikKepalaKeluargaTujuan] = useState('');
  const [alamatBaru, setAlamatBaru] = useState('');

  // Tambahkan state untuk kalurahan
  const [kalurahanBaru, setKalurahanBaru] = useState('');

  // Load citizen data on component mount
  useEffect(() => {
    if (contractService && walletAddress) {
      loadCitizenData();
      loadDaftarPermohonan();
      loadDokumenResmi();
    }
  }, [contractService, walletAddress]);

  const loadCitizenData = async () => {
    try {
      console.log('🔄 [CitizenDashboard] Loading citizen data for wallet:', walletAddress);
      const data = await contractService.getCitizenData(walletAddress);
      console.log('✅ [CitizenDashboard] Citizen data loaded:', data);
      setCitizenData(data);
      
      // Load KK data from IPFS
      const mapping = await loadNIKMapping();
      const cid = mapping[data.nik];
      if (cid) {
        console.log('📁 [CitizenDashboard] Loading KK data from IPFS CID:', cid);
        const encryptedData = await fetchFromIPFS(cid);
        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
        console.log('✅ [CitizenDashboard] KK data decrypted successfully');
        setCitizenData(prev => ({ ...prev, kkData: decryptedData }));
        
        // Extract citizen name from KK data for header
        if (decryptedData.anggota && decryptedData.anggota.length > 0) {
          const kepalaKeluarga = decryptedData.anggota.find(member => 
            member.statusHubunganKeluarga === 'Kepala Keluarga'
          ) || decryptedData.anggota[0];
          onCitizenNameLoaded?.(kepalaKeluarga.nama);
        }
      } else {
        console.log('⚠️ [CitizenDashboard] No CID found for NIK:', data.nik);
      }
    } catch (error) {
      console.error('❌ [CitizenDashboard] Failed to load citizen data:', error);
      onError('Gagal memuat data warga');
    }
  };

  const loadDaftarPermohonan = async () => {
    try {
      console.log('📋 [CitizenDashboard] Loading daftar permohonan for wallet:', walletAddress);
      const data = await contractService.getDaftarPermohonan(walletAddress);
      console.log('✅ [CitizenDashboard] Daftar permohonan loaded:', data.length, 'items');
      setPermohonans(data);
    } catch (error) {
      console.log('⚠️ [CitizenDashboard] No permohonan data available, setting empty array');
      setPermohonans([]);
    }
  };

  const loadDokumenResmi = async () => {
    try {
      console.log('📄 [CitizenDashboard] Loading dokumen resmi for wallet:', walletAddress);
      const data = await contractService.getDokumenResmi(walletAddress);
      console.log('✅ [CitizenDashboard] Dokumen resmi loaded:', data.length, 'items');
      setDokumenResmi(data);
    } catch (error) {
      console.log('⚠️ [CitizenDashboard] No dokumen resmi available, setting empty array');
      setDokumenResmi([]);
    }
  };

  const handleSubmitPermohonan = async (e) => {
    e.preventDefault();
    if (!jenisPermohonan) {
      onError('Jenis permohonan wajib diisi');
      return;
    }

    // Alur permohonan pindah
    if (jenisPermohonan === '4') {
      if (!jenisPindah) {
        onError('Jenis pindah wajib dipilih');
        return;
      }
      // Validasi field sesuai alur
      if (jenisPindah === '0') { // Seluruh keluarga
        if (!alamatBaru || !kalurahanBaru || !alasanPindah) {
          onError('Alamat lengkap, kalurahan, dan alasan pindah wajib diisi');
          return;
        }
        if (alasanPindah === 'Lainnya' && !alasanPindahLainnya) {
          onError('Alasan pindah lainnya wajib diisi');
          return;
        }
      } else if (jenisPindah === '1') { // Mandiri
        if (anggotaPindah.length === 0) {
          onError('Pilih minimal satu anggota yang pindah');
          return;
        }
        if (!nikKepalaKeluargaBaru) {
          onError('Pilih kepala keluarga baru');
          return;
        }
        if (!alamatBaru || !kalurahanBaru || !alasanPindah) {
          onError('Alamat lengkap, kalurahan, dan alasan pindah wajib diisi');
          return;
        }
        if (alasanPindah === 'Lainnya' && !alasanPindahLainnya) {
          onError('Alasan pindah lainnya wajib diisi');
          return;
        }
      } else if (jenisPindah === '2') { // Gabung KK
        if (anggotaPindah.length === 0) {
          onError('Pilih minimal satu anggota yang pindah');
          return;
        }
        if (!nikKepalaKeluargaTujuan) {
          onError('NIK kepala keluarga tujuan wajib diisi');
          return;
        }
        if (!alasanPindah) {
          onError('Alasan pindah wajib diisi');
          return;
        }
        if (alasanPindah === 'Lainnya' && !alasanPindahLainnya) {
          onError('Alasan pindah lainnya wajib diisi');
          return;
        }
      }
      setIsLoading(true);
      try {
        // idKalurahanAsal dan idKalurahanTujuan bisa diambil dari data user/KK, untuk demo pakai 1 dan 2
        const idKalurahanAsal = 1;
        const idKalurahanTujuan = 2;
        // Dummy CID IPFS
        const cidIPFS = 'dummy-cid';
        
        // Buat alamat lengkap
        const alamatLengkap = `${alamatBaru}, ${kalurahanBaru}, Gamping, Sleman, Daerah Istimewa Yogyakarta`;
        const alasanFinal = alasanPindah === 'Lainnya' ? alasanPindahLainnya : alasanPindah;
        
        const result = await contractService.submitPermohonanPindah(
          cidIPFS,
          idKalurahanAsal,
          idKalurahanTujuan,
          parseInt(jenisPindah),
          anggotaPindah,
          jenisPindah === '1' ? nikKepalaKeluargaBaru : '',
          jenisPindah === '2' ? nikKepalaKeluargaTujuan : '',
          jenisPindah === '0' || jenisPindah === '1' ? alamatLengkap : ''
        );
        onSuccess(`Permohonan pindah berhasil diajukan! Transaction: ${result.transactionHash}`);
        // Reset form
        setJenisPermohonan('');
        setJenisPindah('');
        setAnggotaPindah([]);
        setPindahSemua(false);
        setNikKepalaKeluargaBaru('');
        setNikKepalaKeluargaTujuan('');
        setAlamatBaru('');
        setKalurahanBaru('');
        setAlasanPindah('');
        setAlasanPindahLainnya('');
        // Reload data
        loadDaftarPermohonan();
      } catch (error) {
        const errorMessage = handleContractError(error);
        onError(errorMessage);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Permohonan non-pindah (default lama)
    if (!idKalurahanAsal || !cidIPFS) {
      onError('Semua field wajib diisi');
      return;
    }
    setIsLoading(true);
    try {
      const result = await contractService.submitPermohonan(
        parseInt(jenisPermohonan),
        cidIPFS,
        parseInt(idKalurahanAsal),
        jenisPermohonan === '4' ? parseInt(idKalurahanTujuan) : 0
      );
      onSuccess(`Permohonan berhasil diajukan! Transaction: ${result.transactionHash}`);
      setJenisPermohonan('');
      setIdKalurahanAsal('');
      setIdKalurahanTujuan('');
      setCidIPFS('');
      loadDaftarPermohonan();
    } catch (error) {
      const errorMessage = handleContractError(error);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermohonanClick = async (id) => {
    try {
      const detail = await contractService.getPermohonanDetail(id);
      setSelectedPermohonan(detail);
      setShowPermohonanDetail(true);
    } catch (error) {
      console.error('Failed to get permohonan detail:', error);
      onError('Gagal memuat detail permohonan');
    }
  };

  const closePermohonanDetail = () => {
    setShowPermohonanDetail(false);
    setSelectedPermohonan(null);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getJenisPermohonanLabel = (jenis) => {
    const jenisMap = {
      '0': 'Kelahiran',
      '1': 'Kematian', 
      '2': 'Perkawinan',
      '3': 'Perceraian',
      '4': 'Pindah'
    };
    return jenisMap[jenis] || jenis;
  };

  // Tambahkan helper untuk label jenis pindah
  const getJenisPindahLabel = (jenisPindah) => {
    if (jenisPindah === undefined || jenisPindah === null) return '';
    if (jenisPindah === 0 || jenisPindah === '0') return 'Pindah Seluruh Keluarga';
    if (jenisPindah === 1 || jenisPindah === '1') return 'Pindah Mandiri';
    if (jenisPindah === 2 || jenisPindah === '2') return 'Pindah Gabung KK';
    return '';
  };

  const [parentNames, setParentNames] = useState({ ayah: '-', ibu: '-' });
  const [parentLoading, setParentLoading] = useState(false);

  // Cari anggota dan anggotaArr di level atas agar bisa dipakai useEffect
  const kkData = citizenData?.kkData;
  const nikUser = citizenData?.nik;
  const anggotaArr = Array.isArray(kkData?.anggota) ? kkData.anggota : [];
  const anggota = anggotaArr.find(member => member.nik === nikUser) || null;

  useEffect(() => {
    let cancelled = false;
    async function fetchParents() {
      if (!anggota) {
        setParentNames({ ayah: '-', ibu: '-' });
        return;
      }
      setParentLoading(true);
      const mapping = await loadNIKMapping();
      async function lookupParentName(nik) {
        if (!nik) return '-';
        const cid = mapping[nik];
        if (!cid) return '-';
        try {
          const encrypted = await fetchFromIPFS(cid);
          const data = await decryptAes256CbcNodeStyle(encrypted, CRYPTO_CONFIG.SECRET_KEY);
          const arr = Array.isArray(data?.anggota) ? data.anggota : [];
          const found = arr.find(m => m.nik === nik);
          return found?.nama || '-';
        } catch {
          return '-';
        }
      }
      const [ayah, ibu] = await Promise.all([
        lookupParentName(anggota.nikAyah),
        lookupParentName(anggota.nikIbu)
      ]);
      if (!cancelled) setParentNames({ ayah, ibu });
      setParentLoading(false);
    }
    fetchParents();
    return () => { cancelled = true; };
  }, [anggota?.nikAyah, anggota?.nikIbu, kkData]);

  const renderProfile = () => {
    if (!citizenData) {
      return <div className="loading">Memuat data warga...</div>;
    }

    // Gunakan parentNames dan parentLoading di sini
    // Gabungkan alamat lengkap
    let alamatLengkap = '';
    if (kkData && kkData.alamatLengkap) {
      const a = kkData.alamatLengkap;
      alamatLengkap = `${a.alamat}, RT ${a.rt}/RW ${a.rw}, ${a.kelurahan}, ${a.kecamatan}, ${a.kabupaten}, ${a.provinsi}, ${a.kodePos}`;
    }

    // Gabungkan tempat dan tanggal lahir
    let tempatTanggalLahir = '-';
    if (anggota?.tempatLahir && anggota?.tanggalLahir) {
      const tanggal = new Date(anggota.tanggalLahir);
      const tanggalStr = tanggal.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      tempatTanggalLahir = `${anggota.tempatLahir}, ${tanggalStr}`;
    }

    // Konversi jenis kelamin
    let jenisKelamin = anggota?.jenisKelamin || '-';
    if (jenisKelamin === 'L') jenisKelamin = 'Laki-Laki';
    else if (jenisKelamin === 'P') jenisKelamin = 'Perempuan';

    return (
      <div className="profile-section">
        <div className="management-card">
          <div className="profile-info-2col">
            <div className="profile-col profile-col-left">
              <div className="info-pair"><span className="info-label">Nomor KK</span><span className="info-value">{kkData?.kk || '-'}</span></div>
              <div className="info-pair"><span className="info-label">NIK</span><span className="info-value">{nikUser}</span></div>
              <div className="info-pair"><span className="info-label">Nama</span><span className="info-value">{anggota?.nama || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Tempat, Tanggal Lahir</span><span className="info-value">{tempatTanggalLahir}</span></div>
              <div className="info-pair"><span className="info-label">Jenis Kelamin</span><span className="info-value">{jenisKelamin}</span></div>
              <div className="info-pair"><span className="info-label">Pendidikan</span><span className="info-value">{anggota?.pendidikan || '-'}</span></div>
            </div>
            <div className="profile-divider" />
            <div className="profile-col profile-col-right">
              <div className="info-pair"><span className="info-label">Jenis Pekerjaan</span><span className="info-value">{anggota?.jenisPekerjaan || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Kewarganegaraan</span><span className="info-value">{anggota?.kewarganegaraan || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Hubungan Keluarga</span><span className="info-value">{anggota?.statusHubunganKeluarga || '-'}</span></div>
              <div className="info-pair"><span className="info-label">Nama Ayah</span><span className="info-value">{parentLoading ? 'Memuat...' : parentNames.ayah}</span></div>
              <div className="info-pair"><span className="info-label">Nama Ibu</span><span className="info-value">{parentLoading ? 'Memuat...' : parentNames.ibu}</span></div>
              <div className="info-pair"><span className="info-label">Alamat Wallet</span><span className="info-value">{formatAddress(citizenData.walletAddress)}</span></div>
            </div>
          </div>
          <div className="profile-address-row">
            <span className="info-label">Alamat Lengkap</span>
            <span className="info-value" style={{textAlign: 'left'}}>{alamatLengkap || '-'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAjukanPermohonan = () => {
    return (
      <div className="ajukan-section">
        <div className="management-card">
          <form onSubmit={handleSubmitPermohonan} className="management-form">
            <div className="form-group">
              <label htmlFor="jenisPermohonan">Jenis Permohonan:</label>
              <select
                id="jenisPermohonan"
                value={jenisPermohonan}
                onChange={(e) => setJenisPermohonan(e.target.value)}
                className="form-input"
                disabled={isLoading}
                required
              >
                <option value="">Pilih jenis permohonan</option>
                <option value="0">Kelahiran</option>
                <option value="1">Kematian</option>
                <option value="2">Perkawinan</option>
                <option value="3">Perceraian</option>
                <option value="4">Pindah</option>
              </select>
            </div>

            {jenisPermohonan === '0' && (
              <>
                <div className="form-group">
                  <label htmlFor="namaAnak">Nama Lengkap Anak</label>
                  <input
                    type="text"
                    id="namaAnak"
                    name="namaAnak"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tempatLahirAnak">Tempat Lahir</label>
                  <input
                    type="text"
                    id="tempatLahirAnak"
                    name="tempatLahirAnak"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalLahirAnak">Tanggal Lahir</label>
                  <input
                    type="date"
                    id="tanggalLahirAnak"
                    name="tanggalLahirAnak"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="jamLahirAnak">Jam Lahir</label>
                  <input
                    type="time"
                    id="jamLahirAnak"
                    name="jamLahirAnak"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikAyah">NIK Ayah</label>
                  <input
                    type="text"
                    id="nikAyah"
                    name="nikAyah"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikIbu">NIK Ibu</label>
                  <input
                    type="text"
                    id="nikIbu"
                    name="nikIbu"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    name="nikSaksi1"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    name="nikSaksi2"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganLahir">Surat Keterangan Lahir</label>
                  <input
                    type="file"
                    id="suratKeteranganLahir"
                    name="suratKeteranganLahir"
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '1' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikAlmarhum">NIK Almarhum/Almarhumah</label>
                  <input
                    type="text"
                    id="nikAlmarhum"
                    name="nikAlmarhum"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikPelapor">NIK Pelapor</label>
                  <input
                    type="text"
                    id="nikPelapor"
                    name="nikPelapor"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    name="nikSaksi1"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    name="nikSaksi2"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hubunganPelapor">Hubungan Pelapor</label>
                  <input
                    type="text"
                    id="hubunganPelapor"
                    name="hubunganPelapor"
                    className="form-input"
                    placeholder="Contoh: Anak, Suami, Istri, dll"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tempatKematian">Tempat Kematian</label>
                  <input
                    type="text"
                    id="tempatKematian"
                    name="tempatKematian"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalKematian">Tanggal Kematian</label>
                  <input
                    type="date"
                    id="tanggalKematian"
                    name="tanggalKematian"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="penyebabKematian">Penyebab Kematian</label>
                  <textarea
                    id="penyebabKematian"
                    name="penyebabKematian"
                    className="form-input"
                    rows="3"
                    placeholder="Jelaskan penyebab kematian"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganKematian">Surat Keterangan Kematian</label>
                  <input
                    type="file"
                    id="suratKeteranganKematian"
                    name="suratKeteranganKematian"
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '2' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikPria">NIK Calon Pengantin Pria</label>
                  <input
                    type="text"
                    id="nikPria"
                    name="nikPria"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikWanita">NIK Calon Pengantin Wanita</label>
                  <input
                    type="text"
                    id="nikWanita"
                    name="nikWanita"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi1">NIK Saksi 1</label>
                  <input
                    type="text"
                    id="nikSaksi1"
                    name="nikSaksi1"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikSaksi2">NIK Saksi 2</label>
                  <input
                    type="text"
                    id="nikSaksi2"
                    name="nikSaksi2"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tempatPernikahan">Tempat Pernikahan</label>
                  <input
                    type="text"
                    id="tempatPernikahan"
                    name="tempatPernikahan"
                    className="form-input"
                    placeholder="Contoh: Masjid, Kantor Catatan Sipil, dll"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tanggalPernikahan">Tanggal Pernikahan</label>
                  <input
                    type="date"
                    id="tanggalPernikahan"
                    name="tanggalPernikahan"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="suratKeteranganPernikahan">Surat Keterangan Pernikahan</label>
                  <input
                    type="file"
                    id="suratKeteranganPernikahan"
                    name="suratKeteranganPernikahan"
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fotoPria">Pas Foto Calon Pengantin Pria</label>
                  <input
                    type="file"
                    id="fotoPria"
                    name="fotoPria"
                    className="form-input"
                    accept=".jpg,.jpeg,.png"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fotoWanita">Pas Foto Calon Pengantin Wanita</label>
                  <input
                    type="file"
                    id="fotoWanita"
                    name="fotoWanita"
                    className="form-input"
                    accept=".jpg,.jpeg,.png"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '3' && (
              <>
                <div className="form-group">
                  <label htmlFor="nikSuami">NIK Suami</label>
                  <input
                    type="text"
                    id="nikSuami"
                    name="nikSuami"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nikIstri">NIK Istri</label>
                  <input
                    type="text"
                    id="nikIstri"
                    name="nikIstri"
                    className="form-input"
                    maxLength={16}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="suratPutusanPengadilan">Surat Putusan Pengadilan</label>
                  <input
                    type="file"
                    id="suratPutusanPengadilan"
                    name="suratPutusanPengadilan"
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}

            {jenisPermohonan === '4' && (
              <>
                <div className="form-group">
                  <label htmlFor="jenisPindah">Jenis Pindah</label>
                  <select
                    id="jenisPindah"
                    value={jenisPindah}
                    onChange={e => {
                      setJenisPindah(e.target.value);
                      setAnggotaPindah([]);
                      setPindahSemua(false);
                      setNikKepalaKeluargaBaru('');
                      setNikKepalaKeluargaTujuan('');
                      setAlamatBaru('');
                      setKalurahanBaru('');
                      setAlasanPindah('');
                      setAlasanPindahLainnya('');
                    }}
                    className="form-input"
                    required
                  >
                    <option value="">Pilih Jenis Pindah</option>
                    <option value="0">Pindah Seluruh Keluarga</option>
                    <option value="1">Pindah Mandiri (Buat KK Baru)</option>
                    <option value="2">Pindah Gabung KK</option>
                  </select>
                </div>

                {/* Alur A: Seluruh keluarga */}
                {jenisPindah === '0' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="alamatBaru">Alamat Tujuan</label>
                      <input
                        type="text"
                        id="alamatBaru"
                        value={alamatBaru}
                        onChange={e => setAlamatBaru(e.target.value)}
                        className="form-input"
                        placeholder="Masukkan alamat tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="kalurahanBaru">Kalurahan Tujuan</label>
                      <select
                        id="kalurahanBaru"
                        value={kalurahanBaru}
                        onChange={e => setKalurahanBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kalurahan</option>
                        <option value="Ambarketawang">Ambarketawang</option>
                        <option value="Balecatur">Balecatur</option>
                        <option value="Banyuraden">Banyuraden</option>
                        <option value="Nogotirto">Nogotirto</option>
                        <option value="Trihanggo">Trihanggo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kecamatanBaru">Kecamatan Tujuan</label>
                      <select
                        id="kecamatanBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Gamping">Gamping</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kabupatenBaru">Kabupaten Tujuan</label>
                      <select
                        id="kabupatenBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Sleman">Sleman</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="provinsiBaru">Provinsi Tujuan</label>
                      <select
                        id="provinsiBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Daerah Istimewa Yogyakarta">Daerah Istimewa Yogyakarta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div className="info-text">Seluruh anggota keluarga akan ikut pindah.</div>
                      <ul>
                        {anggotaArr.map(a => (
                          <li key={a.nik}>{a.nama} ({a.nik})</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Alur B: Mandiri */}
                {jenisPindah === '1' && (
                  <>
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div style={{overflowX: 'auto'}}>
                        <table className="anggota-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Nama</th>
                              <th>Hubungan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anggotaArr.map((a, idx) => (
                              <tr key={a.nik || idx}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={anggotaPindah.includes(a.nik)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setAnggotaPindah(prev => [...prev, a.nik]);
                                      } else {
                                        setAnggotaPindah(prev => prev.filter(nik => nik !== a.nik));
                                      }
                                    }}
                                  />
                                </td>
                                <td>{a.nama}</td>
                                <td>{a.statusHubunganKeluarga}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="nikKepalaKeluargaBaru">Pilih Kepala Keluarga Baru</label>
                      <select
                        id="nikKepalaKeluargaBaru"
                        value={nikKepalaKeluargaBaru}
                        onChange={e => setNikKepalaKeluargaBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kepala Keluarga Baru</option>
                        {anggotaArr.filter(a => anggotaPindah.includes(a.nik)).map(a => (
                          <option key={a.nik} value={a.nik}>{a.nama} ({a.nik})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alamatBaru">Alamat Tujuan</label>
                      <input
                        type="text"
                        id="alamatBaru"
                        value={alamatBaru}
                        onChange={e => setAlamatBaru(e.target.value)}
                        className="form-input"
                        placeholder="Masukkan alamat tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="kalurahanBaru">Kalurahan Tujuan</label>
                      <select
                        id="kalurahanBaru"
                        value={kalurahanBaru}
                        onChange={e => setKalurahanBaru(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Kalurahan</option>
                        <option value="Ambarketawang">Ambarketawang</option>
                        <option value="Balecatur">Balecatur</option>
                        <option value="Banyuraden">Banyuraden</option>
                        <option value="Nogotirto">Nogotirto</option>
                        <option value="Trihanggo">Trihanggo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kecamatanBaru">Kecamatan Tujuan</label>
                      <select
                        id="kecamatanBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Gamping">Gamping</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="kabupatenBaru">Kabupaten Tujuan</label>
                      <select
                        id="kabupatenBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Sleman">Sleman</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="provinsiBaru">Provinsi Tujuan</label>
                      <select
                        id="provinsiBaru"
                        className="form-input"
                        disabled
                      >
                        <option value="Daerah Istimewa Yogyakarta">Daerah Istimewa Yogyakarta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Alur C: Gabung KK */}
                {jenisPindah === '2' && (
                  <>
                    <div className="form-group">
                      <label>Anggota Keluarga yang Ikut Pindah</label>
                      <div style={{overflowX: 'auto'}}>
                        <table className="anggota-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Nama</th>
                              <th>Hubungan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {anggotaArr.map((a, idx) => (
                              <tr key={a.nik || idx}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={anggotaPindah.includes(a.nik)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setAnggotaPindah(prev => [...prev, a.nik]);
                                      } else {
                                        setAnggotaPindah(prev => prev.filter(nik => nik !== a.nik));
                                      }
                                    }}
                                  />
                                </td>
                                <td>{a.nama}</td>
                                <td>{a.statusHubunganKeluarga}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="nikKepalaKeluargaTujuan">NIK Kepala Keluarga Tujuan</label>
                      <input
                        type="text"
                        id="nikKepalaKeluargaTujuan"
                        value={nikKepalaKeluargaTujuan}
                        onChange={e => setNikKepalaKeluargaTujuan(e.target.value)}
                        className="form-input"
                        placeholder="Masukkan NIK kepala keluarga tujuan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="alasanPindah">Alasan Pindah</label>
                      <select
                        id="alasanPindah"
                        value={alasanPindah}
                        onChange={(e) => setAlasanPindah(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Pilih Alasan Pindah</option>
                        <option value="Pekerjaan">Pekerjaan</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Ekonomi">Ekonomi</option>
                        <option value="Lingkungan">Lingkungan</option>
                        <option value="Kesehatan">Kesehatan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    {alasanPindah === 'Lainnya' && (
                      <div className="form-group">
                        <label htmlFor="alasanPindahLainnya">Alasan Pindah (Lainnya)</label>
                        <input
                          type="text"
                          id="alasanPindahLainnya"
                          value={alasanPindahLainnya}
                          onChange={e => setAlasanPindahLainnya(e.target.value)}
                          className="form-input"
                          placeholder="Jelaskan alasan pindah"
                          required
                        />
                      </div>
                    )}
                  </>
                )}
                <button
                  type="submit"
                  className="add-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Mengajukan...' : 'Ajukan Permohonan'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    );
  };

  const renderDaftarPermohonan = () => {
    if (permohonans.length === 0) {
      return (
        <div className="daftar-section">
          <div className="management-card">
            <h3>Daftar Permohonan</h3>
            <div className="empty-state">
              <p>Anda belum mengajukan permohonan apapun.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="daftar-section">
        <div className="management-card">
          <h3>Daftar Permohonan</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jenis Permohonan</th>
                  <th>Status</th>
                  <th>Jenis Pindah</th>
                  <th>Waktu Pengajuan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {permohonans.map((permohonan) => (
                  <tr key={permohonan.id}>
                    <td>{permohonan.id}</td>
                    <td>{getJenisPermohonanLabel(permohonan.jenis)}</td>
                    <td>
                      <span className={`status-badge status-${permohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {permohonan.status}
                      </span>
                    </td>
                    <td>
                      {permohonan.jenis === '4' && permohonan.dataPindah
                        ? getJenisPindahLabel(permohonan.dataPindah.jenisPindah)
                        : '-'}
                    </td>
                    <td>{formatDate(permohonan.waktuPengajuan)}</td>
                    <td>
                      <button
                        className="detail-button"
                        onClick={() => handlePermohonanClick(permohonan.id)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDokumenResmi = () => {
    if (dokumenResmi.length === 0) {
      return (
        <div className="dokumen-section">
          <div className="management-card">
            <h3>Dokumen Resmi</h3>
            <div className="empty-state">
              <p>Anda belum memiliki dokumen resmi apapun.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dokumen-section">
        <div className="management-card">
          <h3>Dokumen Resmi</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CID Dokumen Resmi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokumenResmi.map((dokumen) => (
                  <tr key={dokumen.id}>
                    <td>{dokumen.id}</td>
                    <td>{dokumen.cidDokumen}</td>
                    <td>
                      <button
                        className="download-button"
                        onClick={() => window.open(`https://ipfs.io/ipfs/${dokumen.cidDokumen}`, '_blank')}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Judul dinamis sesuai menu
  const getCardTitle = () => {
    switch (activeTab) {
      case 'profile':
        return 'Profile Warga';
      case 'ajukan':
        return 'Ajukan Permohonan';
      case 'daftar':
        return 'Daftar Permohonan';
      case 'dokumen':
        return 'Dokumen Resmi';
      default:
        return '';
    }
  };

  const [permohonanGabungKK, setPermohonanGabungKK] = useState([]);
  const [showKonfirmasiModal, setShowKonfirmasiModal] = useState(false);
  const [permohonanUntukKonfirmasi, setPermohonanUntukKonfirmasi] = useState(null);

  // Cek permohonan gabung KK yang menunggu konfirmasi jika user adalah kepala keluarga
  useEffect(() => {
    async function cekGabungKK() {
      if (!contractService || !citizenData?.nik) return;
      try {
        const ids = await contractService.contract.getPermohonanMenungguKonfirmasiKK(citizenData.nik);
        const list = [];
        for (let id of ids) {
          const detail = await contractService.getPermohonanDetail(Number(id));
          list.push(detail);
        }
        setPermohonanGabungKK(list);
      } catch (e) {
        setPermohonanGabungKK([]);
      }
    }
    cekGabungKK();
  }, [contractService, citizenData?.nik]);

  // Handler aksi konfirmasi
  const handleKonfirmasiGabungKK = async (id, isSetuju) => {
    setIsLoading(true);
    try {
      await contractService.contract.konfirmasiPindahGabungKK(id, isSetuju);
      onSuccess(isSetuju ? 'Permohonan gabung KK disetujui.' : 'Permohonan gabung KK ditolak.');
      setShowKonfirmasiModal(false);
      setPermohonanUntukKonfirmasi(null);
      // Refresh daftar
      const ids = await contractService.contract.getPermohonanMenungguKonfirmasiKK(citizenData.nik);
      const list = [];
      for (let id of ids) {
        const detail = await contractService.getPermohonanDetail(Number(id));
        list.push(detail);
      }
      setPermohonanGabungKK(list);
      loadDaftarPermohonan();
    } catch (e) {
      onError('Gagal konfirmasi gabung KK');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dukcapil-app-root">
      <div className="dukcapil-app-body">
        <Sidebar
          menus={sidebarMenus}
          activeMenu={activeTab}
          onMenuClick={setActiveTab}
          walletAddress={walletAddress}
        />
        <main className="dukcapil-main-area">
          <div className="dukcapil-main-card">
            {/* Judul dinamis */}
            <div className="card-title-dynamic">
              <h2 style={{margin: 0, fontWeight: 700, fontSize: '1.35rem'}}>{getCardTitle()}</h2>
            </div>
            <div className="dukcapil-header-main">
              {/* Subjudul tetap */}
              {activeTab === 'profile' && <p className="dukcapil-subtitle-main">Kelola data dan identitas warga</p>}
              {activeTab === 'ajukan' && <p className="dukcapil-subtitle-main">Ajukan permohonan baru sesuai kebutuhan Anda</p>}
              {activeTab === 'daftar' && <p className="dukcapil-subtitle-main">Lihat riwayat permohonan yang pernah diajukan</p>}
              {activeTab === 'dokumen' && <p className="dukcapil-subtitle-main">Daftar dokumen resmi yang Anda miliki</p>}
            </div>
            <div className="tab-content">
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'ajukan' && renderAjukanPermohonan()}
              {activeTab === 'daftar' && renderDaftarPermohonan()}
              {activeTab === 'dokumen' && renderDokumenResmi()}
            </div>
          </div>
        </main>
      </div>

      {/* Modal Detail Permohonan */}
      {showPermohonanDetail && selectedPermohonan && (
        <div className="modal-overlay" onClick={closePermohonanDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Permohonan #{selectedPermohonan.id}</h3>
              <button className="modal-close" onClick={closePermohonanDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label">Jenis Permohonan:</span>
                  <span className="info-value">{getJenisPermohonanLabel(selectedPermohonan.jenis)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tanggal Permohonan:</span>
                  <span className="info-value">{formatDate(selectedPermohonan.waktuPengajuan)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kalurahan Asal:</span>
                  <span className="info-value">ID {selectedPermohonan.idKalurahanAsal}</span>
                </div>
                {selectedPermohonan.jenis === '4' && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Kalurahan Tujuan:</span>
                      <span className="info-value">ID {selectedPermohonan.idKalurahanTujuan}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Jenis Pindah:</span>
                      <span className="info-value">{getJenisPindahLabel(selectedPermohonan.dataPindah?.jenisPindah)}</span>
                    </div>
                    {selectedPermohonan.dataPindah?.nikAnggotaPindah && (
                      <div className="info-row">
                        <span className="info-label">Anggota yang Pindah:</span>
                        <span className="info-value">
                          <ul style={{margin: 0, paddingLeft: 18}}>
                            {selectedPermohonan.dataPindah.nikAnggotaPindah.map((nik, idx) => (
                              <li key={nik || idx}>{nik}</li>
                            ))}
                          </ul>
                        </span>
                      </div>
                    )}
                    {selectedPermohonan.dataPindah?.nikKepalaKeluargaBaru && (
                      <div className="info-row">
                        <span className="info-label">Kepala Keluarga Baru:</span>
                        <span className="info-value">{selectedPermohonan.dataPindah.nikKepalaKeluargaBaru}</span>
                      </div>
                    )}
                    {selectedPermohonan.dataPindah?.nikKepalaKeluargaTujuan && (
                      <div className="info-row">
                        <span className="info-label">Kepala Keluarga Tujuan:</span>
                        <span className="info-value">{selectedPermohonan.dataPindah.nikKepalaKeluargaTujuan}</span>
                      </div>
                    )}
                    {selectedPermohonan.dataPindah?.alamatBaru && (
                      <div className="info-row">
                        <span className="info-label">Alamat Baru:</span>
                        <span className="info-value">{selectedPermohonan.dataPindah.alamatBaru}</span>
                      </div>
                    )}
                    {selectedPermohonan.dataPindah?.jenisPindah === 2 && (
                      <div className="info-row">
                        <span className="info-label">Status Konfirmasi KK Tujuan:</span>
                        <span className="info-value">
                          {selectedPermohonan.status === 'Menunggu Konfirmasi KK Tujuan' && 'Menunggu Konfirmasi'}
                          {selectedPermohonan.status === 'Dikonfirmasi KK Tujuan' && 'Disetujui'}
                          {selectedPermohonan.status === 'Ditolak KK Tujuan' && 'Ditolak'}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">
                    <span className={`status-badge status-${selectedPermohonan.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedPermohonan.status}
                    </span>
                  </span>
                </div>
                {selectedPermohonan.alasanPenolakan && (
                  <div className="info-row">
                    <span className="info-label">Alasan Penolakan:</span>
                    <span className="info-value">{selectedPermohonan.alasanPenolakan}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi gabung KK */}
      {showKonfirmasiModal && permohonanUntukKonfirmasi && (
        <div className="modal-overlay" onClick={() => setShowKonfirmasiModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Konfirmasi Permohonan Gabung KK #{permohonanUntukKonfirmasi.id}</h3>
              <button className="modal-close" onClick={() => setShowKonfirmasiModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-row"><span className="info-label">Anggota yang Gabung:</span> <span className="info-value">{permohonanUntukKonfirmasi.dataPindah?.nikAnggotaPindah?.join(', ')}</span></div>
              <div className="info-row"><span className="info-label">Pemohon:</span> <span className="info-value">{permohonanUntukKonfirmasi.pemohon}</span></div>
              <div style={{marginTop: 18, display: 'flex', gap: 12}}>
                <button className="add-button" disabled={isLoading} onClick={() => handleKonfirmasiGabungKK(permohonanUntukKonfirmasi.id, true)}>Setujui</button>
                <button className="remove-button" disabled={isLoading} onClick={() => handleKonfirmasiGabungKK(permohonanUntukKonfirmasi.id, false)}>Tolak</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard; 