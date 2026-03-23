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
        type: 'upload',
        access_mode: 'public',
        folder: 'webharbour/zips',
        use_filename: true,
        unique_filename: true,
        filename_override: baseName,
      });
      const cloudinaryUrl = result.secure_url || result.url;
      if (!cloudinaryUrl) {
        throw new Error('Cloudinary did not return a file URL');
      }
      return {
        url: cloudinaryUrl,
        cloudinaryUrl,
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
    cloudinaryUrl: null,
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

const buildSignedDownloadUrl = ({ publicId, format, filename }) => {
  if (!publicId || !canUseCloudinary()) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  const options = {
    resource_type: 'raw',
    type: 'upload',
    attachment: filename ? String(filename) : true,
    expires_at: expiresAt,
  };
  try {
    return cloudinary.utils.private_download_url(publicId, format || undefined, options);
  } catch (err) {
    console.error('❌ CLOUDINARY SIGN ERROR:', err);
    return null;
  }
};

module.exports = {
  uploadZip,
  uploadImage,
  buildSignedDownloadUrl,
};
