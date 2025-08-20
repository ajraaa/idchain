import { uploadToPinata } from './pinata.js';
import { encryptAes256CbcNodeStyle, decryptAes256CbcNodeStyle } from './crypto.js';
import { CRYPTO_CONFIG } from '../config/crypto.js';

export const fetchFromIPFS = async (cid) => {
    try {
        // Using IPFS Gateway to fetch the file
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('IPFS fetch error:', error);
        throw new Error('Failed to fetch data from IPFS');
    }
};

export const loadNIKMapping = async (contractService = null, retryCount = 3, retryDelay = 2000) => {
    try {
        // Jika contractService tersedia, coba ambil dari smart contract dulu
        if (contractService && contractService.contract) {
            console.log('🔍 [IPFS] Trying to load NIK mapping from smart contract...');

            for (let attempt = 1; attempt <= retryCount; attempt++) {
                try {
                    console.log(`🔄 [IPFS] Attempt ${attempt}/${retryCount} to load from smart contract...`);
                    const cid = await contractService.getNikMappingCID();

                    if (cid && cid.trim() !== '') {
                        console.log('📋 [IPFS] Found CID in smart contract:', cid);
                        const encryptedData = await fetchFromIPFS(cid);
                        console.log('🔐 [IPFS] Decrypting mapping data...');
                        const decryptedData = await decryptAes256CbcNodeStyle(encryptedData, CRYPTO_CONFIG.SECRET_KEY);
                        console.log('📊 [IPFS] Decrypted data type:', typeof decryptedData);

                        // Parse JSON jika masih string
                        let mapping = decryptedData;
                        if (typeof decryptedData === 'string') {
                            try {
                                mapping = JSON.parse(decryptedData);
                                console.log('✅ [IPFS] Successfully parsed JSON string to object');
                            } catch (error) {
                                console.error('❌ [IPFS] Failed to parse JSON string:', error);
                                throw new Error('Failed to parse mapping JSON: ' + error.message);
                            }
                        }

                        console.log('📊 [IPFS] Final mapping data type:', typeof mapping);
                        console.log('📊 [IPFS] Final mapping keys:', Object.keys(mapping || {}));
                        console.log('📊 [IPFS] Sample mapping entries:', Object.entries(mapping || {}).slice(0, 3));
                        console.log('✅ [IPFS] Successfully loaded NIK mapping from IPFS via smart contract');
                        return mapping;
                    } else {
                        console.log(`⚠️ [IPFS] No CID found in smart contract (attempt ${attempt}/${retryCount})`);
                        if (attempt < retryCount) {
                            console.log(`⏳ [IPFS] Waiting ${retryDelay}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ [IPFS] Failed to load from smart contract (attempt ${attempt}/${retryCount}):`, error.message);
                    if (attempt < retryCount) {
                        console.log(`⏳ [IPFS] Waiting ${retryDelay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }

            console.log('⚠️ [IPFS] All attempts to load from smart contract failed, falling back to local file');
        }

        // Fallback ke file lokal
        console.log('📁 [IPFS] Loading NIK mapping from local file...');
        const response = await fetch('/data/nikToCidKK.json');
        if (!response.ok) {
            throw new Error('Failed to load NIK mapping file');
        }
        const mapping = await response.json();
        console.log('✅ [IPFS] Successfully loaded NIK mapping from local file');
        return mapping;
    } catch (error) {
        console.error('Failed to load NIK mapping:', error);
        throw new Error('Failed to load NIK mapping data');
    }
};

export const uploadNIKMapping = async (mapping, contractService = null) => {
    try {
        console.log('📤 [IPFS] Uploading NIK mapping to IPFS...');

        // Enkripsi mapping menggunakan crypto.js
        console.log('🔐 [IPFS] Encrypting mapping data...');
        const encryptedData = await encryptAes256CbcNodeStyle(mapping, CRYPTO_CONFIG.SECRET_KEY);
        console.log('✅ [IPFS] Mapping encrypted successfully');

        // Upload ke IPFS dengan nama file menggunakan crypto.randomUUID() (Web API)
        // Fallback untuk browser lama
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

        const filename = `${generateUUID()}.enc`;
        const cid = await uploadToPinata(encryptedData, filename);

        console.log('✅ [IPFS] NIK mapping uploaded successfully');
        console.log('🔗 [IPFS] CID:', cid);
        console.log('🔗 [IPFS] URL: https://ipfs.io/ipfs/' + cid);

        // Update smart contract jika contractService tersedia
        if (contractService && contractService.contract) {
            console.log('🔧 [IPFS] Updating CID in smart contract...');
            try {
                const result = await contractService.setNikMappingCID(cid);
                console.log('✅ [IPFS] Smart contract updated successfully');
                console.log('🔗 [IPFS] Transaction hash:', result.transactionHash);
            } catch (error) {
                console.error('❌ [IPFS] Failed to update smart contract:', error);
                throw new Error('Mapping uploaded to IPFS but failed to update smart contract: ' + error.message);
            }
        }

        return {
            success: true,
            cid: cid,
            url: `https://ipfs.io/ipfs/${cid}`,
            transactionHash: contractService ? 'pending' : null
        };
    } catch (error) {
        console.error('❌ [IPFS] Failed to upload NIK mapping:', error);
        throw new Error('Failed to upload NIK mapping: ' + error.message);
    }
};

export const uploadNIKMappingToIPFSOnly = async (mapping) => {
    try {
        console.log('📤 [IPFS] Uploading NIK mapping to IPFS (no smart contract update)...');

        // Enkripsi mapping menggunakan crypto.js
        console.log('🔐 [IPFS] Encrypting mapping data...');
        const encryptedData = await encryptAes256CbcNodeStyle(mapping, CRYPTO_CONFIG.SECRET_KEY);
        console.log('✅ [IPFS] Mapping encrypted successfully');

        // Upload ke IPFS dengan nama file menggunakan crypto.randomUUID() (Web API)
        // Fallback untuk browser lama
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

        const filename = `${generateUUID()}.enc`;
        const cid = await uploadToPinata(encryptedData, filename);

        console.log('✅ [IPFS] NIK mapping uploaded successfully');
        console.log('🔗 [IPFS] CID:', cid);
        console.log('🔗 [IPFS] URL: https://ipfs.io/ipfs/' + cid);

        return {
            success: true,
            cid: cid,
            url: `https://ipfs.io/ipfs/${cid}`
        };
    } catch (error) {
        console.error('❌ [IPFS] Failed to upload NIK mapping:', error);
        throw new Error('Failed to upload NIK mapping: ' + error.message);
    }
}; 