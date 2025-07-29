const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import the hashNIK function
function hashNIK(nik) {
    if (!nik || typeof nik !== 'string') {
        throw new Error('NIK harus berupa string yang valid');
    }
    return ethers.keccak256(ethers.toUtf8Bytes(nik));
}

describe("Test NIK Hash Function", function () {
    it("Should hash NIK correctly", async function () {
        const nik = "1234567890123456";
        const hash = hashNIK(nik);

        console.log("NIK:", nik);
        console.log("Hash:", hash);

        // Verify it's a valid hex string
        expect(hash).to.match(/^0x[a-fA-F0-9]{64}$/);

        // Verify same NIK produces same hash
        const hash2 = hashNIK(nik);
        expect(hash).to.equal(hash2);

        // Verify different NIK produces different hash
        const nik2 = "1234567890123457";
        const hash3 = hashNIK(nik2);
        expect(hash).to.not.equal(hash3);
    });

    it("Should throw error for invalid input", async function () {
        expect(() => hashNIK("")).to.throw("NIK harus berupa string yang valid");
        expect(() => hashNIK(null)).to.throw("NIK harus berupa string yang valid");
        expect(() => hashNIK(undefined)).to.throw("NIK harus berupa string yang valid");
        expect(() => hashNIK(123)).to.throw("NIK harus berupa string yang valid");
    });
});