import { useState } from 'react';
import { validateNIK, validateDateOfBirth, decryptAes256CbcNodeStyle, encryptAes256CbcNodeStyle } from '../utils/crypto.js';
import { loadNIKMapping, fetchFromIPFS, uploadNIKMappingToIPFSOnly } from '../utils/ipfs.js';
import { uploadToPinata } from '../utils/pinata.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';
import { handleContractError } from '../utils/errorHandler.js';
import { enhanceNotificationMessage } from '../utils/notificationHelper.js';

const IdentityForm = ({ contractService, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    nik: '',
    dateOfBirth: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [nikToCidMapping, setNikToCidMapping] = useState(null);

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
        onError?.('NIK sudah terdaftar dalam sistem');
        setIsLoading(false);
        return;
      }
      const isWalletRegistered = await contractService.checkIfWalletRegistered();
      console.log('[Step 2] Is wallet registered:', isWalletRegistered);
      if (isWalletRegistered) {
        onError?.('Wallet ini sudah terdaftar dengan NIK lain');
        setIsLoading(false);
        return;
      }
      // 2. Lanjutkan proses: load mapping dari smart contract/IPFS, fetch IPFS, dekripsi, verifikasi, update wallet, enkripsi ulang, upload, update mapping, dst.
      let mapping = nikToCidMapping;
      if (!mapping) {
        mapping = await loadNIKMapping(contractService);
        console.log('[Step 3] Mapping loaded from smart contract/IPFS:', mapping);
      } else {
        console.log('[Step 3] Mapping from state:', mapping);
      }
      const cid = mapping[formData.nik];
      console.log('[Step 4] CID for NIK', formData.nik, ':', cid);
      if (!cid) {
        onError?.('NIK tidak ditemukan dalam database');
        setIsLoading(false);
        return;
      }
      const encryptedData = await fetchFromIPFS(cid);
      console.log('[Step 5] Encrypted data from IPFS:', encryptedData, 'Using secret key:', CRYPTO_CONFIG.SECRET_KEY);
      const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Step 6] Decrypted data:', decryptedData);
      const isValidMember = verifyFamilyMember(decryptedData, formData.nik, formData.dateOfBirth);
      console.log('[Step 7] Is valid member:', isValidMember);
      if (!isValidMember) {
        onError?.('NIK atau tanggal lahir tidak cocok dengan data keluarga');
        setIsLoading(false);
        return;
      }
      const userWallet = await contractService.signer.getAddress();
      console.log('[Step 8] User wallet address:', userWallet);
      
      // Update KK dengan wallet address untuk anggota yang verifikasi
      let updatedKK;
      if (Array.isArray(decryptedData)) {
        updatedKK = decryptedData.map(member => 
          member.nik === formData.nik 
            ? { ...member, wallet: userWallet }
            : member
        );
      } else if (Array.isArray(decryptedData.anggota)) {
        updatedKK = {
          ...decryptedData,
          anggota: decryptedData.anggota.map(member => 
            member.nik === formData.nik 
              ? { ...member, wallet: userWallet }
              : member
          )
        };
      } else {
        updatedKK = decryptedData;
      }
      console.log('[Step 9] Updated KK with wallet for NIK', formData.nik, ':', updatedKK);
      
      // Enkripsi ulang file KK yang sudah diupdate
      console.log('[Step 10] Encrypting updated KK file...');
      const encryptedUpdatedKK = await encryptAes256CbcNodeStyle(JSON.stringify(updatedKK), CRYPTO_CONFIG.SECRET_KEY);
      console.log('[Step 11] Encrypted updated KK:', encryptedUpdatedKK);
      
      // Upload file KK yang sudah diupdate ke IPFS dengan nama random UUID
      console.log('[Step 12] Uploading updated KK file to IPFS...');
      const generateUUID = () => {
        if (crypto.randomUUID) {
          return crypto.randomUUID();
        }
        // Fallback untuk browser lama
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const fileName = `${generateUUID()}.json`;
      const kkUploadResult = await uploadToPinata(encryptedUpdatedKK, fileName);
      console.log('[Step 13] Updated KK file uploaded successfully:', kkUploadResult);
      console.log('[Step 13] New KK CID:', kkUploadResult);
      
      // Update mapping untuk mengarahkan semua NIK dalam file KK ke CID yang baru
      const newMapping = { ...mapping };
      if (Array.isArray(updatedKK)) {
        updatedKK.forEach(member => {
          if (member.nik) newMapping[member.nik] = kkUploadResult;
        });
      } else if (Array.isArray(updatedKK.anggota)) {
        updatedKK.anggota.forEach(member => {
          if (member.nik) newMapping[member.nik] = kkUploadResult;
        });
      }
      console.log('[Step 14] Updated mapping with new KK CID:', newMapping);
      
      // Upload mapping yang diupdate ke IPFS (tanpa update smart contract)
      console.log('[Step 15] Uploading updated mapping to IPFS...');
      const mappingUploadResult = await uploadNIKMappingToIPFSOnly(newMapping);
      console.log('[Step 16] Mapping uploaded successfully:', mappingUploadResult);
      console.log('[Step 16] Mapping CID:', mappingUploadResult.cid);
      
      // Update state dengan mapping baru
      setNikToCidMapping(newMapping);
      console.log('[Step 17] Updated mapping in state:', newMapping);
      
      // Register warga dan update mapping CID dalam satu transaksi
      console.log('[Step 18] Registering warga and updating mapping CID...');
      const result = await contractService.registerWargaAndUpdateMapping(formData.nik, mappingUploadResult.cid);
      console.log('[Step 19] Combined transaction result:', result);
      console.log('[Step 19] Transaction Hash:', result.transactionHash);
      console.log('[Step 19] Mapping CID:', result.mappingCID);
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

    </div>
  );
};

export default IdentityForm; 