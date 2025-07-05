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

export const loadNIKMapping = async () => {
    try {
        // Load the NIK to CID mapping file
        const response = await fetch('/data/nikToCidKK.json');
        if (!response.ok) {
            throw new Error('Failed to load NIK mapping file');
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load NIK mapping:', error);
        throw new Error('Failed to load NIK mapping data');
    }
}; 