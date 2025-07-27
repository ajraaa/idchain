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

    async registerWargaAndUpdateMapping(nik, mappingCID) {
        if (!this.contract) {
            throw new Error('Contract not initialized. Please connect wallet first.');
        }

        try {
            console.log('🔧 [ContractService] Registering warga and updating mapping...');
            console.log('📋 [ContractService] NIK:', nik);
            console.log('📋 [ContractService] Mapping CID:', mappingCID);

            const tx = await this.contract.registerWargaAndUpdateMapping(nik, mappingCID);
            const receipt = await tx.wait();

            // Find the WargaTerdaftar event
            const wargaEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'WargaTerdaftar';
                } catch {
                    return false;
                }
            });

            // Find the NikMappingCIDUpdated event
            const mappingEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'NikMappingCIDUpdated';
                } catch {
                    return false;
                }
            });

            const result = {
                success: true,
                transactionHash: receipt.hash
            };

            if (wargaEvent) {
                const parsed = this.contract.interface.parseLog(wargaEvent);
                result.wallet = parsed.args[0];
                result.nik = parsed.args[1];
            }

            if (mappingEvent) {
                const parsed = this.contract.interface.parseLog(mappingEvent);
                result.mappingCID = parsed.args[0];
            }

            console.log('✅ [ContractService] Registration and mapping update successful');
            return result;
        } catch (error) {
            console.error('❌ [ContractService] Registration and mapping update failed:', error);
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

    async tambahKalurahanById(id, address, mappingCID) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.tambahKalurahanById(id, address, mappingCID);
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

    async hapusKalurahan(address, mappingCID) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.hapusKalurahan(address, mappingCID);
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

    // Tambahkan method unggahDokumenResmi
    async unggahDokumenResmi(id, cidDokumen) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.unggahDokumenResmi(id, cidDokumen);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to upload dokumen resmi:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    // Tambahkan method verifikasiDukcapil
    async verifikasiDukcapil(id, disetujui, alasan = '', cidDokumen = '') {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            const tx = await this.contract.verifikasiDukcapil(id, disetujui, alasan, cidDokumen);
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to verify Dukcapil:', error);
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

    async submitPermohonan(jenis, cidIPFS, idKalurahanAsal, idKalurahanTujuan = 0, jenisPindah = 0) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            console.log('🔍 [ContractService] Submitting permohonan with params:', {
                jenis,
                cidIPFS,
                idKalurahanAsal,
                idKalurahanTujuan,
                jenisPindah
            });

            const tx = await this.contract.submitPermohonan(jenis, cidIPFS, idKalurahanAsal, idKalurahanTujuan, jenisPindah);
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

    async submitPermohonanPindah(
        cidIPFS,
        idKalurahanAsal,
        idKalurahanTujuan,
        jenisPindah
    ) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            // Check if wallet is registered
            const walletAddress = await this.signer.getAddress();
            console.log('🔍 [ContractService] Checking wallet registration for:', walletAddress);

            const nik = await this.contract.nikByWallet(walletAddress);
            console.log('🔍 [ContractService] NIK for wallet:', nik);

            if (!nik || nik === '') {
                throw new Error('Wallet belum terdaftar. Silakan register terlebih dahulu.');
            }

            // Check kalurahan mapping
            console.log('🔍 [ContractService] Checking kalurahan mapping...');
            const kalurahanAsalAddress = await this.contract.addressKalurahanById(idKalurahanAsal);
            const kalurahanTujuanAddress = await this.contract.addressKalurahanById(idKalurahanTujuan);

            console.log('🔍 [ContractService] Kalurahan mapping:', {
                idKalurahanAsal,
                kalurahanAsalAddress,
                idKalurahanTujuan,
                kalurahanTujuanAddress
            });

            if (kalurahanAsalAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error(`Kalurahan asal dengan ID ${idKalurahanAsal} tidak terdaftar`);
            }

            if (kalurahanTujuanAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error(`Kalurahan tujuan dengan ID ${idKalurahanTujuan} tidak terdaftar`);
            }

            console.log('🔍 [ContractService] Submitting pindah with params:', {
                jenis: 4,
                cidIPFS,
                idKalurahanAsal,
                idKalurahanTujuan,
                jenisPindah
            });

            console.log('🔍 [ContractService] Parameter types:', {
                jenis: typeof 4,
                cidIPFS: typeof cidIPFS,
                idKalurahanAsal: typeof idKalurahanAsal,
                idKalurahanTujuan: typeof idKalurahanTujuan,
                jenisPindah: typeof jenisPindah
            });

            console.log('🔍 [ContractService] Parameter values:', {
                jenis: 4,
                cidIPFS: cidIPFS,
                idKalurahanAsal: idKalurahanAsal,
                idKalurahanTujuan: idKalurahanTujuan,
                jenisPindah: jenisPindah
            });

            const tx = await this.contract.submitPermohonan(
                4, // JenisPermohonan.Pindah
                cidIPFS,
                idKalurahanAsal,
                idKalurahanTujuan,
                jenisPindah
            );
            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to submit permohonan pindah:', error);
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

            console.log('🔍 [ContractService] Checking wallet registration for:', address);
            // Cek apakah wallet terdaftar
            const nik = await this.contract.nikByWallet(address);
            if (!nik || nik === '') {
                console.log('⚠️ [ContractService] Wallet not registered, returning empty array');
                return [];
            }

            console.log('📋 [ContractService] Getting permohonan IDs for wallet:', address);
            const permohonanIds = await this.contract.getPermohonanIDsByPemohon(address);
            console.log('📋 [ContractService] Found permohonan IDs:', permohonanIds);

            const permohonans = [];

            for (const id of permohonanIds) {
                try {
                    // Konversi id ke Number jika BigInt
                    const idNum = typeof id === 'bigint' ? Number(id) : id;
                    console.log('🔍 [ContractService] Loading details for permohonan ID:', idNum);
                    const permohonan = await this.contract.getPermohonan(idNum);
                    const status = await this.contract.getStatusPermohonan(idNum);
                    const jenis = await this.contract.getJenisPermohonan(idNum);

                    // Konversi semua BigInt ke Number sebelum operasi
                    const waktuPengajuan = permohonan.waktuPengajuan ? Number(permohonan.waktuPengajuan) : 0;
                    const idKalurahanAsal = permohonan.idKalurahanAsal ? Number(permohonan.idKalurahanAsal) : 0;
                    const idKalurahanTujuan = permohonan.idKalurahanTujuan ? Number(permohonan.idKalurahanTujuan) : 0;
                    const jenisPindah = permohonan.jenisPindah !== undefined ? Number(permohonan.jenisPindah) : undefined;

                    permohonans.push({
                        id: idNum.toString(),
                        jenis: jenis,
                        status: status,
                        waktuPengajuan: new Date(waktuPengajuan * 1000),
                        idKalurahanAsal: idKalurahanAsal,
                        idKalurahanTujuan: idKalurahanTujuan,
                        cidIPFS: permohonan.cidIPFS,
                        alasanPenolakan: permohonan.alasanPenolakan,
                        jenisPindah: jenisPindah,
                        pemohon: permohonan.pemohon
                    });
                } catch (error) {
                    console.log(`⚠️ [ContractService] Error getting permohonan ${id}:`, error);
                }
            }

            console.log('✅ [ContractService] Successfully loaded', permohonans.length, 'permohonan');
            return permohonans;
        } catch (error) {
            console.error('❌ [ContractService] Failed to get daftar permohonan:', error);
            return [];
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

            console.log('🔍 [ContractService] Getting dokumen resmi for wallet:', address);

            // Cek apakah wallet terdaftar
            const nik = await this.contract.nikByWallet(address);
            console.log('📋 [ContractService] NIK for wallet:', nik);
            if (!nik || nik === '') {
                console.log('⚠️ [ContractService] Wallet not registered, returning empty array');
                return [];
            }

            const permohonanIds = await this.contract.getPermohonanIDsByPemohon(address);
            console.log('📋 [ContractService] Permohonan IDs for wallet:', permohonanIds);
            const dokumenResmi = [];

            for (const id of permohonanIds) {
                try {
                    console.log(`🔍 [ContractService] Checking dokumen resmi for permohonan ${id}...`);
                    const cidDokumen = await this.contract.cidDokumenResmi(id);
                    console.log(`📋 [ContractService] CID dokumen for permohonan ${id}:`, cidDokumen);
                    if (cidDokumen && cidDokumen !== '') {
                        dokumenResmi.push({
                            id: id.toString(),
                            cidDokumen: cidDokumen
                        });
                        console.log(`✅ [ContractService] Added dokumen resmi for permohonan ${id}`);
                    } else {
                        console.log(`⚠️ [ContractService] No dokumen resmi for permohonan ${id}`);
                    }
                } catch (error) {
                    console.log(`❌ [ContractService] Error getting dokumen resmi for permohonan ${id}:`, error.message);
                }
            }

            console.log('✅ [ContractService] Final dokumen resmi array:', dokumenResmi);
            return dokumenResmi;
        } catch (error) {
            console.error('❌ [ContractService] Failed to get dokumen resmi:', error);
            return [];
        }
    }

    async getPermohonanDetail(id) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            // Konversi id ke Number jika BigInt
            const idNum = typeof id === 'bigint' ? Number(id) : Number(id);
            const permohonan = await this.contract.getPermohonan(idNum);
            const status = await this.contract.getStatusPermohonan(idNum);
            const jenis = await this.contract.getJenisPermohonan(idNum);

            // Konversi semua BigInt ke Number sebelum operasi
            const waktuPengajuan = permohonan.waktuPengajuan ? Number(permohonan.waktuPengajuan) : 0;
            const idKalurahanAsal = permohonan.idKalurahanAsal ? Number(permohonan.idKalurahanAsal) : 0;
            const idKalurahanTujuan = permohonan.idKalurahanTujuan ? Number(permohonan.idKalurahanTujuan) : 0;
            const jenisPindah = permohonan.jenisPindah !== undefined ? Number(permohonan.jenisPindah) : undefined;

            return {
                id: idNum.toString(),
                jenis: jenis,
                status: status,
                waktuPengajuan: new Date(waktuPengajuan * 1000),
                idKalurahanAsal: idKalurahanAsal,
                idKalurahanTujuan: idKalurahanTujuan,
                cidIPFS: permohonan.cidIPFS,
                alasanPenolakan: permohonan.alasanPenolakan,
                jenisPindah: jenisPindah,
                pemohon: permohonan.pemohon
            };
        } catch (error) {
            console.error('Failed to get permohonan detail:', error);
            throw new Error('Failed to get permohonan detail');
        }
    }

    async batalkanPermohonan(id) {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            console.log('🔍 [ContractService] Cancelling permohonan with ID:', id);

            const idNum = typeof id === 'bigint' ? Number(id) : Number(id);
            const tx = await this.contract.batalkanPermohonan(idNum);
            const receipt = await tx.wait();

            console.log('✅ [ContractService] Permohonan cancelled successfully');
            return {
                success: true,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to cancel permohonan:', error);
            const errorMessage = handleContractError(error);
            throw new Error(errorMessage);
        }
    }

    async getNikMappingCID() {
        if (!this.contract) {
            throw new Error('Contract not initialized');
        }
        try {
            console.log('🔍 [ContractService] Getting NIK mapping CID from contract...');
            const cid = await this.contract.getNikMappingCID();
            console.log('📋 [ContractService] NIK mapping CID from contract:', cid);
            return cid;
        } catch (error) {
            console.error('❌ [ContractService] Failed to get NIK mapping CID:', error);
            return '';
        }
    }
} 