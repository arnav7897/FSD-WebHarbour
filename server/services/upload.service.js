const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require('../config/env');

const uploadApk = async (filePath, originalName) => {
  const baseName = path.basename(originalName || filePath);
  const localTargetDir = path.join(__dirname, '..', 'tmp', 'uploads');
  const localTargetPath = path.join(localTargetDir, `${Date.now()}-${baseName}`);

  const canUseCloudinary = CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET && cloudinary && cloudinary.uploader;

  if (canUseCloudinary) {
    try {
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
        fallback: false,
      };
    } catch (err) {
      // Cloudinary failed (often invalid cloud name); fallback to local file storage
      console.warn('Cloudinary upload failed, falling back to local upload:', err?.message || err);
    }
  } else {
    console.warn('Cloudinary not configured, using local fallback upload');
  }

  fs.mkdirSync(localTargetDir, { recursive: true });
  fs.copyFileSync(filePath, localTargetPath);
  return {
    url: `/uploads/${path.basename(localTargetPath)}`,
    bytes: fs.statSync(localTargetPath).size,
    publicId: null,
    fallback: true,
  };
};

module.exports = {
  uploadApk,
};
