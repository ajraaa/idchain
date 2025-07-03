const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("PencatatanSipil", function () {
    let pencatatan, owner, kalurahan, dukcapil, warga;

    beforeEach(async () => {
        [owner, kalurahan, dukcapil, warga] = await ethers.getSigners();

        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy();
        await pencatatan.waitForDeployment();

        // Tambahkan role dan mapping id kalurahan
        await pencatatan.tambahKalurahan(kalurahan.address);
        await pencatatan.tambahDukcapil(dukcapil.address);
        await pencatatan.tambahKalurahanById(1, kalurahan.address);
    });

    it("warga dapat mengajukan permohonan", async () => {
        const tx = await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0);
        await tx.wait();

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.pemohon).to.equal(warga.address);
        expect(data.cidIPFS).to.equal("cid_json_xxx");
        expect(data.status).to.equal(0); // Diajukan
    });

    it("id permohonan harus bertambah satu per submit", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_a", 1, 0);
        await pencatatan.connect(warga).submitPermohonan(1, "cid_b", 1, 0);

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids[0]).to.equal(0);
        expect(ids[1]).to.equal(1); // bukan 2
    });

    it("kalurahan dapat memverifikasi permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        const tx = await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");
        await tx.wait();

        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(1); // DisetujuiKalurahan
    });

    it("dukcapil dapat menolak permohonan dengan alasan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_json_xxx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");
        const tx = await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], false, "Data tidak lengkap");
        await tx.wait();
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(4); // DitolakDukcapil
        expect(updated.alasanPenolakan).to.equal("Data tidak lengkap");
    });

    it("mengembalikan status permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const status = await pencatatan.getStatusPermohonan(ids[0]);
        expect(status).to.equal("Diajukan");
    });

    it("mengembalikan jenis permohonan sebagai string", async () => {
        await pencatatan.connect(warga).submitPermohonan(3, "cid_test", 1, 0); // 3 = Cerai
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        const jenis = await pencatatan.getJenisPermohonan(ids[0]);
        expect(jenis).to.equal("Cerai");
    });

    it("gagal jika bukan kalurahan yang memverifikasi", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas kalurahan yang diizinkan melakukan ini.");
    });

    it("warga tidak boleh memverifikasi permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(warga).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas kalurahan yang diizinkan melakukan ini.");
    });

    it("kalurahan tidak boleh memverifikasi jika status bukan Diajukan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        // Ubah status ke DisetujuiKalurahan dulu
        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        // Coba verifikasi ulang
        await expect(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "")
        ).to.be.revertedWith("Permohonan bukan dalam status Diajukan.");
    });

    it("emit event saat permohonan diajukan", async () => {
        await expect(pencatatan.connect(warga).submitPermohonan(0, "cid_event", 1, 0))
            .to.emit(pencatatan, "PermohonanDiajukan")
            .withArgs(0, warga.address, 0, "cid_event", anyValue);
    });

    it("dukcapil dapat menyetujui permohonan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_xx", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "");
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(3); // DisetujuiDukcapil
    });

    it("warga tidak bisa memverifikasi sebagai dukcapil", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_test", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        await expect(
            pencatatan.connect(warga).verifikasiDukcapil(ids[0], true, "")
        ).to.be.revertedWith("Hanya petugas dukcapil yang diizinkan melakukan ini.");
    });

    it("emit event saat verifikasi kalurahan", async () => {
        await pencatatan.connect(warga).submitPermohonan(1, "cid_kalurahan", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], false, "Data tidak lengkap")
        )
            .to.emit(pencatatan, "VerifikasiKalurahan")
            .withArgs(ids[0], kalurahan.address, false, "Data tidak lengkap", anyValue);
    });

    it("emit event saat verifikasi dukcapil", async () => {
        await pencatatan.connect(warga).submitPermohonan(2, "cid_dukcapil", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahan).verifikasiKalurahan(ids[0], true, "");

        await expect(
            pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "")
        )
            .to.emit(pencatatan, "VerifikasiDukcapil")
            .withArgs(ids[0], dukcapil.address, true, "", anyValue);
    });

    it("warga dapat membatalkan permohonan yang diajukan", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_batal", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(warga).batalkanPermohonan(ids[0]);
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(9); // DibatalkanPemohon
        expect(updated.alasanPenolakan).to.equal("Permohonan dibatalkan oleh pemohon.");
    });

    it("tidak bisa membatalkan permohonan yang bukan milik sendiri", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_batal2", 1, 0);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await expect(
            pencatatan.connect(kalurahan).batalkanPermohonan(ids[0])
        ).to.be.revertedWith("Bukan pemilik permohonan.");
    });

    it("kalurahan dapat mengambil daftar permohonan asalnya", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_kalurahanasal", 1, 0);
        const ids = await pencatatan.connect(kalurahan).getPermohonanByKalurahanAsal();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("kalurahan dapat mengambil permohonan yang belum diverifikasi dengan status tertentu", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_belumverif", 1, 0);
        const ids = await pencatatan.connect(kalurahan).getPermohonanBelumVerifikasiKalurahan(0); // 0 = Diajukan
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengambil permohonan dengan status tertentu", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dukcapil", 1, 0);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        const ids = await pencatatan.connect(dukcapil).getPermohonanForDukcapil(1); // 1 = DisetujuiKalurahan
        expect(ids.length).to.be.greaterThan(0);
    });

    it("dukcapil dapat mengunggah dan warga dapat mengambil dokumen resmi", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres", 1, 0);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "");
        await pencatatan.connect(dukcapil).unggahDokumenResmi(0, "cid_dokres");
        const dok = await pencatatan.connect(warga).getDokumenResmi(0);
        expect(dok).to.equal("cid_dokres");
    });

    it("tidak bisa mengambil dokumen resmi jika belum diunggah", async () => {
        await pencatatan.connect(warga).submitPermohonan(0, "cid_for_dokres2", 1, 0);
        await pencatatan.connect(kalurahan).verifikasiKalurahan(0, true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(0, true, "");
        await expect(
            pencatatan.connect(warga).getDokumenResmi(0)
        ).to.be.revertedWith("Belum ada dokumen resmi.");
    });

    it("jumlahPermohonan bertambah setiap submit", async () => {
        const awal = await pencatatan.jumlahPermohonan();
        await pencatatan.connect(warga).submitPermohonan(0, "cid_jumlah1", 1, 0);
        await pencatatan.connect(warga).submitPermohonan(1, "cid_jumlah2", 1, 0);
        const akhir = await pencatatan.jumlahPermohonan();
        expect(akhir - awal).to.equal(2);
    });
});

describe("Fitur Permohonan Pindah", function () {
    let pencatatan, owner, kalurahanAsal, kalurahanTujuan, dukcapil, warga, lain;

    beforeEach(async () => {
        [owner, kalurahanAsal, kalurahanTujuan, dukcapil, warga, lain] = await ethers.getSigners();
        const Pencatatan = await ethers.getContractFactory("PencatatanSipil");
        pencatatan = await Pencatatan.deploy();
        await pencatatan.waitForDeployment();
        await pencatatan.tambahKalurahan(kalurahanAsal.address);
        await pencatatan.tambahKalurahan(kalurahanTujuan.address);
        await pencatatan.tambahDukcapil(dukcapil.address);
        await pencatatan.tambahKalurahanById(1, kalurahanAsal.address);
        await pencatatan.tambahKalurahanById(2, kalurahanTujuan.address);
    });

    // A. Pengujian Pemohon
    it("A1. Submit permohonan pindah berhasil", async () => {
        const tx = await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        await tx.wait();

        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);

        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.jenis).to.equal(4); // Pindah
        expect(data.cidIPFS).to.equal("cid_pindah");
        expect(data.idKalurahanAsal).to.equal(1);
        expect(data.idKalurahanTujuan).to.equal(2);

        // Mapping
        const asal = await pencatatan.connect(kalurahanAsal).getPermohonanByKalurahanAsal();
        expect(asal).to.include(ids[0]);
        const tujuan = await pencatatan.connect(kalurahanTujuan).getPermohonanByKalurahanTujuan();
        expect(tujuan).to.include(ids[0]);
        const perStatus = await pencatatan.connect(dukcapil).getPermohonanForDukcapil(0); // Status.Diajukan
        expect(perStatus).to.include(ids[0]);
    });

    it("A2. Gagal: ID Kalurahan Tujuan tidak valid", async () => {
        await expect(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 0)
        ).to.be.revertedWith("ID Kalurahan Tujuan harus diisi.");
        await expect(
            pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 99)
        ).to.be.revertedWith("ID Kalurahan Tujuan tidak valid.");
    });

    it("A3. Gagal: Tidak mengisi CID", async () => {
        await expect(
            pencatatan.connect(warga).submitPermohonan(4, "", 1, 2)
        ).to.be.revertedWith("CID IPFS tidak boleh kosong.");
    });

    // B. Pengujian Kalurahan Asal
    it("B4. Verifikasi Kalurahan Asal berhasil (disetujui)", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(5); // DisetujuiKalurahanAsal
        expect(data.verifikatorKalurahan).to.equal(kalurahanAsal.address);
        expect(data.waktuVerifikasiKalurahan).to.be.gt(0);

        const perStatus = await pencatatan.connect(dukcapil).getPermohonanForDukcapil(5);
        expect(perStatus).to.include(ids[0]);
    });

    it("B5. Verifikasi Kalurahan Asal ditolak", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], false, "Alasan tolak", 2);
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(6); // DitolakKalurahanAsal
        expect(data.alasanPenolakan).to.equal("Alasan tolak");
    });

    it("B6. Gagal: Verifikasi oleh kalurahan bukan asal", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(kalurahanTujuan).verifikasiKalurahanAsalPindah(ids[0], true, "", 2)
        ).to.be.reverted;
    });

    it("B7. Gagal: Verifikasi saat status bukan Diajukan", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);
        await expect(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2)
        ).to.be.revertedWith("Permohonan bukan dalam status Diajukan.");
    });

    it("B8. Gagal: Verifikasi tanpa ID Kalurahan Tujuan (disetujui)", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 0)
        ).to.be.revertedWith("Tujuan tidak valid!");
    });

    // C. Pengujian Kalurahan Tujuan
    it("C9. Verifikasi Kalurahan Tujuan berhasil (disetujui)", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);

        await pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, "");
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(7); // DisetujuiKalurahanTujuan
        expect(data.verifikatorKalurahanTujuan).to.equal(kalurahanTujuan.address);
        expect(data.waktuVerifikasiKalurahanTujuan).to.be.gt(0);
    });

    it("C10. Verifikasi Kalurahan Tujuan ditolak", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);

        await pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], false, "Tolak tujuan");
        const data = await pencatatan.getPermohonan(ids[0]);
        expect(data.status).to.equal(8); // DitolakKalurahanTujuan
        expect(data.alasanPenolakan).to.equal("Tolak tujuan");
    });

    it("C11. Gagal: Verifikasi oleh kalurahan bukan tujuan", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);

        await expect(
            pencatatan.connect(kalurahanAsal).verifikasiKalurahanTujuanPindah(ids[0], true, "")
        ).to.be.revertedWith("Hanya kalurahan tujuan yang dapat memverifikasi.");
    });

    it("C12. Gagal: Verifikasi saat status bukan DisetujuiKalurahanAsal", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);

        await expect(
            pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, "")
        ).to.be.revertedWith("Belum diverifikasi Kalurahan Asal.");
    });

    // D. Pengujian Akses Data
    it("D13. Pemohon melihat daftar permohonan miliknya", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        expect(ids.length).to.equal(1);
    });

    it("D14. Kalurahan Asal melihat permohonan dari wilayahnya", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.connect(kalurahanAsal).getPermohonanByKalurahanAsal();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("D15. Kalurahan Tujuan melihat permohonan masuk", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.connect(kalurahanTujuan).getPermohonanByKalurahanTujuan();
        expect(ids.length).to.be.greaterThan(0);
    });

    it("D16. Gagal: Kalurahan melihat permohonan bukan wilayahnya", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        // Kalurahan lain (bukan asal/bukan tujuan)
        await pencatatan.tambahKalurahan(lain.address);
        await pencatatan.tambahKalurahanById(3, lain.address);

        const asal = await pencatatan.connect(lain).getPermohonanByKalurahanAsal();
        expect(asal.length).to.equal(0);
        const tujuan = await pencatatan.connect(lain).getPermohonanByKalurahanTujuan();
        expect(tujuan.length).to.equal(0);
    });

    it("dukcapil dapat memverifikasi permohonan pindah setelah disetujui kalurahan tujuan", async () => {
        await pencatatan.connect(warga).submitPermohonan(4, "cid_pindah", 1, 2);
        const ids = await pencatatan.getPermohonanIDsByPemohon(warga.address);
        await pencatatan.connect(kalurahanAsal).verifikasiKalurahanAsalPindah(ids[0], true, "", 2);
        await pencatatan.connect(kalurahanTujuan).verifikasiKalurahanTujuanPindah(ids[0], true, "");
        await pencatatan.connect(dukcapil).verifikasiDukcapil(ids[0], true, "");
        const updated = await pencatatan.getPermohonan(ids[0]);
        expect(updated.status).to.equal(3); // DisetujuiDukcapil
    });
});
