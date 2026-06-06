'use strict';

const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let minioClient = null;
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const getMinioClient = () => {
  if (!process.env.MINIO_ENDPOINT) return null;

  if (!minioClient) {
    try {
      const Minio = require('minio');
      minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
      });
    } catch (e) {
      logger.warn('MinIO not available, using local file storage');
    }
  }
  return minioClient;
};

const ensureUploadDir = () => {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
};

const ensureBuckets = async () => {
  const client = getMinioClient();
  if (!client) { ensureUploadDir(); return; }

  const buckets = [
    process.env.MINIO_BUCKET_RESUMES || 'resumes',
    process.env.MINIO_BUCKET_DOCUMENTS || 'documents',
  ];
  for (const bucket of buckets) {
    try {
      const exists = await client.bucketExists(bucket);
      if (!exists) await client.makeBucket(bucket);
    } catch (e) {
      logger.warn(`Could not create bucket ${bucket}: ${e.message}`);
    }
  }
};

/**
 * Save file — uses MinIO if configured, else writes to ./uploads/
 * Returns the stored key/path
 */
const saveFile = async (bucket, fileName, buffer, contentType) => {
  const client = getMinioClient();

  if (client) {
    await client.putObject(bucket, fileName, buffer, buffer.length, { 'Content-Type': contentType });
    return fileName;
  }

  // Local fallback
  ensureUploadDir();
  const localPath = path.join(LOCAL_UPLOAD_DIR, fileName.replace(/\//g, '_'));
  fs.writeFileSync(localPath, buffer);
  return localPath;
};

const getSignedUrl = async (bucket, objectName, expiry = 3600) => {
  const client = getMinioClient();
  if (client) return client.presignedGetObject(bucket, objectName, expiry);
  // Return local path URL
  return `/uploads/${path.basename(objectName)}`;
};

module.exports = { getMinioClient, ensureBuckets, saveFile, getSignedUrl };
