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
            const dukcapilAddress = await this.contract.dukcapil();
            return address.toLowerCase() === dukcapilAddress.toLowerCase();
        } catch (error) {
            console.error('Failed to check dukcapil status:', error);
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

    // Citizen Dashboard Functions
    async getCitizenData(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                throw new Error('Wallet address not available');
            }

            const nik = await this.contract.nikByWallet(address);
            if (!nik || nik === '') {
                throw new Error('NIK not found for this wallet');
            }

            return { nik, walletAddress: address };
        } catch (error) {
            console.error('Failed to get citizen data:', error);
            throw new Error('Failed to get citizen data');
        }
    }

    async submitPermohonan(jenis, cidIPFS, idKalurahanAsal, idKalurahanTujuan = 0) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.submitPermohonan(jenis, cidIPFS, idKalurahanAsal, idKalurahanTujuan);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to submit permohonan:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async getDaftarPermohonan(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                throw new Error('Wallet address not available');
            }

            const permohonanIds = await this.contract.daftarPermohonanPemohon(address);
            const permohonans = [];

            for (const id of permohonanIds) {
                const permohonan = await this.contract.permohonans(id);
                const status = await this.contract.getStatusPermohonan(id);
                const jenis = await this.contract.getJenisPermohonan(id);

                permohonans.push({
                    id: id.toString(),
                    jenis: jenis,
                    status: status,
                    waktuPengajuan: new Date(permohonan.waktuPengajuan * 1000),
                    idKalurahanAsal: permohonan.idKalurahanAsal,
                    idKalurahanTujuan: permohonan.idKalurahanTujuan,
                    cidIPFS: permohonan.cidIPFS,
                    alasanPenolakan: permohonan.alasanPenolakan
                });
            }

            return permohonans;
        } catch (error) {
            console.error('Failed to get daftar permohonan:', error);
            throw new Error('Failed to get daftar permohonan');
        }
    }

    async getDokumenResmi(walletAddress) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            let address = walletAddress;
            if (!address && this.signer) {
                address = await this.signer.getAddress();
            }
            if (!address) {
                throw new Error('Wallet address not available');
            }

            const permohonanIds = await this.contract.daftarPermohonanPemohon(address);
            const dokumenResmi = [];

            for (const id of permohonanIds) {
                try {
                    const cidDokumen = await this.contract.cidDokumenResmi(id);
                    if (cidDokumen && cidDokumen !== '') {
                        dokumenResmi.push({
                            id: id.toString(),
                            cidDokumen: cidDokumen
                        });
                    }
                } catch (error) {
                    // Skip if no official document for this application
                    console.log(`No official document for application ${id}`);
                }
            }

            return dokumenResmi;
        } catch (error) {
            console.error('Failed to get dokumen resmi:', error);
            throw new Error('Failed to get dokumen resmi');
        }
    }

    async getPermohonanDetail(id) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const permohonan = await this.contract.permohonans(id);
            const status = await this.contract.getStatusPermohonan(id);
            const jenis = await this.contract.getJenisPermohonan(id);

            return {
                id: id.toString(),
                jenis: jenis,
                status: status,
                waktuPengajuan: new Date(permohonan.waktuPengajuan * 1000),
                idKalurahanAsal: permohonan.idKalurahanAsal,
                idKalurahanTujuan: permohonan.idKalurahanTujuan,
                cidIPFS: permohonan.cidIPFS,
                alasanPenolakan: permohonan.alasanPenolakan
            };
        } catch (error) {
            console.error('Failed to get permohonan detail:', error);
            throw new Error('Failed to get permohonan detail');
        }
    }
} 