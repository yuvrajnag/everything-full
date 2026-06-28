const fs = require('fs');
const path = require('path');

const mapping = require('./cloudinary-mapping.json');

const productsTsPath = path.join(__dirname, '../frontend/src/data/products.ts');
let productsTs = fs.readFileSync(productsTsPath, 'utf8');

const seedTsPath = path.join(__dirname, 'src/seed.ts');
let seedTs = fs.readFileSync(seedTsPath, 'utf8');

for (const [localUrl, cloudUrl] of Object.entries(mapping)) {
  productsTs = productsTs.replace(new RegExp(`"${localUrl}"`, 'g'), `"${cloudUrl}"`);
  seedTs = seedTs.replace(new RegExp(`"${localUrl}"`, 'g'), `"${cloudUrl}"`);
}

fs.writeFileSync(productsTsPath, productsTs);
fs.writeFileSync(seedTsPath, seedTs);
console.log('URLs updated in products.ts and seed.ts');
