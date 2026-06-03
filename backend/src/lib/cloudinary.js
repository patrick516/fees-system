const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a file buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: process.env.CLOUDINARY_FOLDER || "school_fees_receipts",
      resource_type: "auto",
      ...options,
    };

    console.log("📤 Uploading to Cloudinary folder:", uploadOptions.folder);
    console.log("📦 Buffer size:", buffer?.length, "bytes");

    if (!buffer || buffer.length === 0) {
      return reject(new Error("Empty buffer — no file data received"));
    }

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) {
          console.error(
            "❌ Cloudinary upload error:",
            error.message,
            error.http_code,
          );
          reject(error);
        } else {
          console.log("✅ Cloudinary upload success:", result.secure_url);
          resolve(result);
        }
      })
      .end(buffer);
    // Using .end(buffer) instead of Readable stream — more reliable
  });
};

// Delete a file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log("🗑️ Deleted from Cloudinary:", publicId);
  } catch (err) {
    console.error("Failed to delete from Cloudinary:", err);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
