const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require('../config/env');

const canUseCloudinary = () =>
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET &&
  cloudinary &&
  cloudinary.uploader;

const uploadZip = async (filePath, originalName) => {
  const baseName = path.basename(originalName || filePath);
  const localTargetDir = path.join(__dirname, '..', 'tmp', 'uploads');
  const localTargetPath = path.join(localTargetDir, `${Date.now()}-${baseName}`);

  if (canUseCloudinary()) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: 'webharbour/zips',
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
      console.error("❌ CLOUDINARY FULL ERROR:", err);
      throw err;
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

const uploadImage = async (filePath, originalName, options = {}) => {
  const baseName = path.basename(originalName || filePath);
  const localTargetDir = path.join(__dirname, '..', 'tmp', 'uploads');
  const localTargetPath = path.join(localTargetDir, `${Date.now()}-${baseName}`);
  const folder = options.folder || 'webharbour/images';

  if (canUseCloudinary()) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'image',
        folder,
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
      console.error("❌ CLOUDINARY IMAGE ERROR:", err);
      throw err;
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
  uploadZip,
  uploadImage,
};
