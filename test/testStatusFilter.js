const { expect } = require("chai");

describe("Test Status Filter", function () {
    it("Should match status strings correctly", function () {
        // Test status strings from smart contract
        const statusFromContract = "Disetujui Kalurahan Asal";
        const statusFromContract2 = "Disetujui Kalurahan Tujuan";

        // Test filter conditions
        const filter1 = statusFromContract === 'Disetujui Kalurahan Asal';
        const filter2 = statusFromContract === 'DisetujuiKalurahanAsal'; // Wrong format

        console.log("✅ Status from contract:", statusFromContract);
        console.log("✅ Filter with spaces:", filter1);
        console.log("❌ Filter without spaces:", filter2);

        expect(filter1).to.be.true;
        expect(filter2).to.be.false;
        expect(statusFromContract).to.equal("Disetujui Kalurahan Asal");
        expect(statusFromContract2).to.equal("Disetujui Kalurahan Tujuan");
    });

    it("Should handle different status formats", function () {
        const statuses = [
            "Diajukan",
            "Disetujui Kalurahan",
            "Ditolak Kalurahan",
            "Disetujui Kalurahan Asal",
            "Ditolak Kalurahan Asal",
            "Disetujui Kalurahan Tujuan",
            "Ditolak Kalurahan Tujuan"
        ];

        statuses.forEach(status => {
            console.log(`📋 Status: "${status}"`);
            expect(status).to.be.a('string');
            expect(status.length).to.be.greaterThan(0);
        });
    });
}); 