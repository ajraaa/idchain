import { PINATA_JWT } from '../config/pinata';

/**
 * Upload encrypted data (string) to Pinata IPFS
 * @param {string} encryptedData - Hasil enkripsi (string, AES)
 * @param {string} filename - Nama file yang diupload (default: 'kk.enc')
 * @returns {Promise<string>} - CID IPFS hasil upload
 */
export async function uploadToPinata(encryptedData, filename = 'kk.enc') {
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const formData = new FormData();
    const blob = new Blob([encryptedData], { type: 'text/plain' });
    formData.append('file', blob, filename);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: PINATA_JWT
        },
        body: formData
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error('Gagal upload ke Pinata: ' + err);
    }
    const data = await response.json();
    return data.IpfsHash; // CID baru
} 