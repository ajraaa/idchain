import { ethers } from 'ethers';
import { CONTRACT_CONFIG, CONTRACT_ABI } from '../config/contract.js';

export class ContractService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.contract = new ethers.Contract(CONTRACT_CONFIG.ADDRESS, CONTRACT_ABI, this.signer);

            return accounts[0];
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    async registerWarga(nik) {
        if (!this.contract) {
            throw new Error('Contract not initialized. Please connect wallet first.');
        }

        try {
            const tx = await this.contract.registerWarga(nik);
            const receipt = await tx.wait();

            // Find the WargaTerdaftar event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'WargaTerdaftar';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = this.contract.interface.parseLog(event);
                return {
                    success: true,
                    wallet: parsed.args[0],
                    nik: parsed.args[1],
                    transactionHash: receipt.hash
                };
            }

            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Registration failed:', error);
            throw new Error('Failed to register warga on blockchain');
        }
    }

    async checkIfNIKRegistered(nik) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const wallet = await this.contract.walletByNik(nik);
            return wallet !== ethers.ZeroAddress;
        } catch (error) {
            console.error('Failed to check NIK registration:', error);
            return false;
        }
    }

    async checkIfWalletRegistered(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                // Jangan panggil contract jika address null
                return false;
            }
            const nik = await this.contract.nikByWallet(address);
            return nik !== '';
        } catch (error) {
            console.error('Failed to check wallet registration:', error);
            return false;
        }
    }
} 