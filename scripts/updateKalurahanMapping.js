// Script untuk update/generate mapping kalurahan (kalurahan.json)
// Usage: node updateKalurahanMapping.js <id> <nama> <address>

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../kalurahan.json');

function loadMapping() {
    if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('File mapping tidak valid JSON. Membuat baru.');
            return [];
        }
    }
    return [];
}

function saveMapping(mapping) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(mapping, null, 2), 'utf-8');
}

function main() {
    const [, , id, nama, address] = process.argv;
    if (!id || !nama || !address) {
        console.error('Usage: node updateKalurahanMapping.js <id> <nama> <address>');
        process.exit(1);
    }
    const mapping = loadMapping();
    // Cek duplikasi ID atau address
    if (mapping.find(k => k.id == id)) {
        console.error('ID kalurahan sudah ada di mapping.');
        process.exit(1);
    }
    if (mapping.find(k => k.address.toLowerCase() === address.toLowerCase())) {
        console.error('Address kalurahan sudah ada di mapping.');
        process.exit(1);
    }
    mapping.push({ id: Number(id), nama, address });
    saveMapping(mapping);
    console.log('Mapping kalurahan berhasil diupdate:', { id, nama, address });
}

main(); 