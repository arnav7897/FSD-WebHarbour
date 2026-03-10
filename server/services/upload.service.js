const path = require('path');
const { cloudinary } = require('../config/cloudinary');

const uploadApk = async (filePath, originalName) => {
  if (!cloudinary || !cloudinary.uploader) {
    const err = new Error('Cloudinary is not configured');
    err.status = 500;
    throw err;
  }

  const baseName = path.basename(originalName || filePath);
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'raw',
    folder: 'webharbour/apks',
    use_filename: true,
    unique_filename: true,
    filename_override: baseName,
  });

  return {
    url: result.secure_url || result.url,
    bytes: result.bytes || 0,
    publicId: result.public_id,
  };
};

module.exports = {
  uploadApk,
};
