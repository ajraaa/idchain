// Contract configuration
export const CONTRACT_CONFIG = {
    // Replace with your actual deployed contract address
    ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Updated contract address

    // Network configuration
    NETWORKS: {
        // Local development
        localhost: {
            chainId: 31337,
            name: "Localhost",
            rpcUrl: "http://localhost:8545"
        },
        // Sepolia testnet
        sepolia: {
            chainId: 11155111,
            name: "Sepolia",
            rpcUrl: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
        },
        // Polygon Mumbai testnet
        mumbai: {
            chainId: 80001,
            name: "Mumbai",
            rpcUrl: "https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID"
        }
    },

    // Default network
    DEFAULT_NETWORK: "localhost"
};

// Import the full ABI from the frontend folder (updated version)
import PermohonanManagerABI from '../abis/PermohonanManager.json';

// Contract ABI - using the full ABI from the frontend folder
export const CONTRACT_ABI = PermohonanManagerABI.abi;

// IPFS configuration
export const IPFS_CONFIG = {
    GATEWAY: "https://ipfs.io/ipfs/",
    FALLBACK_GATEWAYS: [
        "https://gateway.pinata.cloud/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/",
        "https://dweb.link/ipfs/"
    ]
}; 