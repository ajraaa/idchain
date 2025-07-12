import { PINATA_JWT } from '../config/pinata';

/**
 * Upload encrypted data (string) to Pinata IPFS
 * @param {string} encryptedData - Hasil enkripsi (string, AES)
 * @param {string} filename - Nama file yang diupload (default: 'kk.enc')
 * @returns {Promise<string>} - CID IPFS hasil upload
 */
export async function uploadToPinata(encryptedData, filename = 'kk.enc') {
    const startTime = Date.now();
    console.log(`📤 [Pinata] Memulai upload file: ${filename}`);
    console.log(`📊 [Pinata] Data size: ${encryptedData.length} characters`);

    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const formData = new FormData();
    const blob = new Blob([encryptedData], { type: 'text/plain' });
    formData.append('file', blob, filename);

    console.log(`🌐 [Pinata] Upload URL: ${url}`);
    console.log(`🔑 [Pinata] Using JWT token: ${PINATA_JWT.substring(0, 20)}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: PINATA_JWT
            },
            body: formData
        });

        const responseTime = Date.now() - startTime;
        console.log(`📡 [Pinata] Response status: ${response.status} (${responseTime}ms)`);

        if (!response.ok) {
            const err = await response.text();
            console.error(`❌ [Pinata] Upload failed:`, err);
            throw new Error('Gagal upload ke Pinata: ' + err);
        }

        const data = await response.json();
        const totalTime = Date.now() - startTime;
        console.log(`✅ [Pinata] Upload berhasil dalam ${totalTime}ms`);
        console.log(`🔗 [Pinata] IPFS Hash: ${data.IpfsHash}`);
        console.log(`📊 [Pinata] Pin Size: ${data.PinSize} bytes`);

        return data.IpfsHash; // CID baru
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [Pinata] Upload error dalam ${totalTime}ms:`, error);
        throw error;
    }
}

/**
 * Fetch data from IPFS using CID
 * @param {string} cid - IPFS CID
 * @returns {Promise<string>} - Data dari IPFS
 */
export async function fetchFromIPFS(cid) {
    const startTime = Date.now();
    console.log(`📥 [IPFS-Fetch] Memulai fetch data dari IPFS...`);
    console.log(`🔗 [IPFS-Fetch] CID: ${cid}`);

    try {
        // Try Pinata gateway first
        console.log(`🌐 [IPFS-Fetch] Trying Pinata gateway...`);
        const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        console.log(`🔗 [IPFS-Fetch] Pinata URL: ${pinataUrl}`);

        const response = await fetch(pinataUrl);
        console.log(`📡 [IPFS-Fetch] Pinata response status: ${response.status}`);

        if (!response.ok) {
            console.log(`⚠️ [IPFS-Fetch] Pinata gateway failed, trying public IPFS gateway...`);

            // Fallback to public IPFS gateway
            const fallbackUrl = `https://ipfs.io/ipfs/${cid}`;
            console.log(`🔗 [IPFS-Fetch] Fallback URL: ${fallbackUrl}`);

            const fallbackResponse = await fetch(fallbackUrl);
            console.log(`📡 [IPFS-Fetch] Fallback response status: ${fallbackResponse.status}`);

            if (!fallbackResponse.ok) {
                throw new Error(`Failed to fetch from IPFS: ${fallbackResponse.status}`);
            }

            const data = await fallbackResponse.text();
            const totalTime = Date.now() - startTime;
            console.log(`✅ [IPFS-Fetch] Data fetched via fallback dalam ${totalTime}ms (${data.length} characters)`);
            return data;
        }

        const data = await response.text();
        const totalTime = Date.now() - startTime;
        console.log(`✅ [IPFS-Fetch] Data fetched via Pinata dalam ${totalTime}ms (${data.length} characters)`);
        return data;

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [IPFS-Fetch] Error dalam ${totalTime}ms:`, error);
        console.error(`❌ [IPFS-Fetch] Error stack:`, error.stack);
        throw new Error(`Gagal mengambil data dari IPFS: ${error.message}`);
    }
} 