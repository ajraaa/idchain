import { useState } from 'react';
import { validateNIK, validateDateOfBirth, decryptAes256CbcNodeStyle, encryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { loadNIKMapping, fetchFromIPFS } from '../utils/ipfs.js';
import { uploadToPinata } from '../utils/pinata.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';
import { handleContractError } from '../utils/errorHandler.js';

const IdentityForm = ({ contractService, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    nik: '',
    dateOfBirth: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [nikToCidMapping, setNikToCidMapping] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nik) {
      newErrors.nik = 'NIK wajib diisi';
    } else if (!validateNIK(formData.nik)) {
      newErrors.nik = 'NIK harus 16 digit angka';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Tanggal lahir wajib diisi';
    } else if (!validateDateOfBirth(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Tanggal lahir tidak valid';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifyIdentity = async () => {
    if (!contractService || !contractService.contract) {
      onError?.('Wallet belum terhubung. Silakan hubungkan wallet terlebih dahulu.');
      return;
    }
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      // 1. Cek ke smart contract lebih dulu
      const isNIKRegistered = await contractService.checkIfNIKRegistered(formData.nik);
      console.log('[Step 1] Is NIK registered:', isNIKRegistered);
      if (isNIKRegistered) {
        throw new Error('NIK sudah terdaftar dalam sistem');
      }
      const isWalletRegistered = await contractService.checkIfWalletRegistered();
      console.log('[Step 2] Is wallet registered:', isWalletRegistered);
      if (isWalletRegistered) {
        throw new Error('Wallet ini sudah terdaftar dengan NIK lain');
      }
      // 2. Lanjutkan proses: load mapping, fetch IPFS, dekripsi, verifikasi, update wallet, enkripsi ulang, upload, update mapping, dst.
      let mapping = nikToCidMapping;
      if (!mapping) {
        mapping = await loadNIKMapping();
        console.log('[Step 3] Mapping loaded:', mapping);
      } else {
        console.log('[Step 3] Mapping from state:', mapping);
      }
      const cid = mapping[formData.nik];
      console.log('[Step 4] CID for NIK', formData.nik, ':', cid);
      if (!cid) {
        throw new Error('NIK tidak ditemukan dalam database');
      }
      const encryptedData = await fetchFromIPFS(cid);
      console.log('[Step 5] Encrypted data from IPFS:', encryptedData, 'Using secret key:', CRYPTO_CONFIG.SECRET_KEY);
      const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Step 6] Decrypted data:', decryptedData);
      const isValidMember = verifyFamilyMember(decryptedData, formData.nik, formData.dateOfBirth);
      console.log('[Step 7] Is valid member:', isValidMember);
      if (!isValidMember) {
        throw new Error('NIK atau tanggal lahir tidak cocok dengan data keluarga');
      }
      const userWallet = await contractService.signer.getAddress();
      console.log('[Step 8] User wallet address:', userWallet);
      let updatedKK;
      if (Array.isArray(decryptedData)) {
        updatedKK = decryptedData.map(member => ({ ...member, wallet: userWallet }));
      } else if (Array.isArray(decryptedData.anggota)) {
        updatedKK = {
          ...decryptedData,
          anggota: decryptedData.anggota.map(member => ({
            ...member,
            wallet: userWallet
          }))
        };
      } else {
        updatedKK = decryptedData;
      }
      console.log('[Step 9] Updated KK with wallet:', updatedKK);
      const encryptedNew = await encryptAes256CbcNodeStyle(updatedKK, CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Step 10] Re-encrypted KK:', encryptedNew);
      const fakeName = `${crypto.randomUUID()}.enc`;
      const newCid = await uploadToPinata(encryptedNew, fakeName);
      console.log('[Step 11] New CID from Pinata:', newCid);
      const newMapping = { ...mapping };
      if (Array.isArray(updatedKK)) {
        updatedKK.forEach(member => {
          if (member.nik) newMapping[member.nik] = newCid;
        });
      } else if (Array.isArray(updatedKK.anggota)) {
        updatedKK.anggota.forEach(member => {
          if (member.nik) newMapping[member.nik] = newCid;
        });
      }
      setNikToCidMapping(newMapping);
      console.log('[Step 12] Updated mapping:', newMapping);
      const blob = new Blob([JSON.stringify(newMapping, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      console.log('[Step 13] Download URL for new mapping:', url);
      const result = await contractService.registerWarga(formData.nik);
      console.log('[Step 14] Smart contract register result:', result);
      onSuccess?.(result);
    } catch (error) {
      console.error('Identity verification failed:', error);
      const errorMessage = handleContractError(error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFamilyMember = (familyData, nik, dateOfBirth) => {
    const anggota = Array.isArray(familyData)
      ? familyData
      : Array.isArray(familyData.anggota)
        ? familyData.anggota
        : [];

    return anggota.some(member => {
      const memberDateOfBirth = new Date(member.tanggalLahir);
      const inputDateOfBirth = new Date(dateOfBirth);
      return member.nik === nik &&
        memberDateOfBirth.toDateString() === inputDateOfBirth.toDateString();
    });
  };

  return (
    <div className="identity-form">
      <h2>Verifikasi Identitas</h2>
      <p className="form-description">
        Masukkan NIK dan tanggal lahir Anda untuk memverifikasi identitas dan mengklaim kepemilikan dalam sistem.
      </p>
      <div className="form-group" color='black'>
        <label htmlFor="nik">NIK (Nomor Induk Kependudukan)</label>
        <input
          type="text"
          id="nik"
          name="nik"
          value={formData.nik}
          onChange={handleInputChange}
          placeholder="Masukkan 16 digit NIK"
          maxLength="16"
          disabled={isLoading}
        />
        {errors.nik && <span className="error">{errors.nik}</span>}
      </div>
      <div className="form-group" color='black'>
        <label htmlFor="dateOfBirth">Tanggal Lahir</label>
        <input
          type="date"
          id="dateOfBirth"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        {errors.dateOfBirth && <span className="error">{errors.dateOfBirth}</span>}
      </div>
      <button
        onClick={verifyIdentity}
        disabled={isLoading}
        className="verify-button"
      >
        {isLoading ? 'Memverifikasi...' : 'Verifikasi Identitas'}
      </button>
      {downloadUrl && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href={downloadUrl} download="nikToCidKK.json" className="connect-button">
            Download Mapping nikToCidKK.json Terbaru
          </a>
          <div style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.5rem' }}>
            Setelah download, replace file mapping di server/public untuk update permanen.
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityForm; 