const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const productsDir = path.join(__dirname, '../frontend/public/products');

async function uploadImages() {
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  const mapping = {};

  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const publicId = `everything_store/products/${file.split('.')[0]}`;
    
    console.log(`Uploading ${file}...`);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
      });
      mapping[`/products/${file}`] = result.secure_url;
      console.log(`Uploaded ${file}: ${result.secure_url}`);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
  }

  fs.writeFileSync(path.join(__dirname, 'cloudinary-mapping.json'), JSON.stringify(mapping, null, 2));
  console.log('Finished uploading. Mapping saved to cloudinary-mapping.json');
}

uploadImages();
