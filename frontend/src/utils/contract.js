import { ethers } from 'ethers';
import { CONTRACT_CONFIG, CONTRACT_ABI } from '../config/contract.js';
import { handleContractError } from './errorHandler.js';

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
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
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

    async checkIfOwner(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                return false;
            }
            const owner = await this.contract.owner();
            return address.toLowerCase() === owner.toLowerCase();
        } catch (error) {
            console.error('Failed to check owner status:', error);
            return false;
        }
    }

    async checkIfKalurahan(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                return false;
            }
            return await this.contract.kalurahan(address);
        } catch (error) {
            console.error('Failed to check kalurahan status:', error);
            return false;
        }
    }

    async checkIfDukcapil(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                return false;
            }
            return await this.contract.dukcapil(address);
        } catch (error) {
            console.error('Failed to check dukcapil status:', error);
            return false;
        }
    }

    async tambahKalurahanById(id, address) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.tambahKalurahanById(id, address);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to add kalurahan by ID:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async tambahKalurahan(address) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.tambahKalurahan(address);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to add kalurahan:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async tambahDukcapil(address) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.tambahDukcapil(address);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to add dukcapil:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async hapusKalurahan(address) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.hapusKalurahan(address);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to remove kalurahan:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async hapusDukcapil(address) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.hapusDukcapil(address);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to remove dukcapil:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }
} 