const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const storage = require('./config/storage');

async function testB2Upload() {
  const bucketName = process.env.B2_BUCKET_NAME;
  const key = 'studysphere-storage-test.txt';
  const body = 'StudySphere Backblaze B2 connection test';

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    });

    await storage.send(command);
    console.log('Backblaze B2 upload successful.');
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

testB2Upload();
