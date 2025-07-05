// Contract configuration
export const CONTRACT_CONFIG = {
    // Replace with your actual deployed contract address
    ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // TODO: Add your deployed contract address here

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

// Contract ABI - minimal ABI for the functions we need
export const CONTRACT_ABI = [
    "function registerWarga(string memory _nik) external",
    "function nikByWallet(address wallet) external view returns (string memory)",
    "function walletByNik(string memory nik) external view returns (address)",
    "event WargaTerdaftar(address indexed wallet, string nik)"
];

// IPFS configuration
export const IPFS_CONFIG = {
    GATEWAY: "https://ipfs.io/ipfs/",
    FALLBACK_GATEWAYS: [
        "https://gateway.pinata.cloud/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/",
        "https://dweb.link/ipfs/"
    ]
}; 