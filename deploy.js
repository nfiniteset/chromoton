#!/usr/bin/env node

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mime from 'mime-types'

// Load environment variables
config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const S3_PREFIX = 'chromoton' // Deploy to chromoton/ directory in bucket
const DIST_DIR = path.join(__dirname, 'dist')

// Validate required environment variables
if (!S3_BUCKET) {
  console.error('❌ Error: S3_BUCKET environment variable is required')
  process.exit(1)
}

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error(
    '❌ Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required'
  )
  process.exit(1)
}

// Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error(
    '❌ Error: dist directory not found. Run "npm run build" first.'
  )
  process.exit(1)
}

// Additional preconfigured artifacts to generate from dist/index.html before
// upload. Each entry gets its own subdirectory sharing the same JS/CSS
// bundle, with a bootstrap script that seeds localStorage before the app
// mounts (matching the keys/format App.jsx's useLocalStorage reads/writes).
const VARIANTS = [
  {
    subpath: 'mono',
    localStorageOverrides: {
      'chromoton-monochrome': true,
      'chromoton-strategyType': 'population', // "Chill" spiciness
      'chromoton-palette': 'eames',
    },
  },
]

// Build the inline bootstrap <script> that seeds localStorage with the
// variant's overrides, JSON-encoded the same way useLocalStorage does.
function buildBootstrapScript(overrides) {
  const statements = Object.entries(overrides)
    .map(
      ([key, value]) =>
        `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(value))});`
    )
    .join(' ')
  return `<script>${statements}</script>`
}

// Generate a preconfigured variant of the app at dist/<subpath>/index.html,
// reusing the already-built JS/CSS bundle.
function generateVariant({ subpath, localStorageOverrides }) {
  const sourceHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8')

  // Asset paths in the built index.html are relative ("./assets/..."), so
  // nesting the variant one directory deeper means walking back up one level.
  const rewritten = sourceHtml.replace(/(src|href)="\.\//g, '$1="../')

  const withBootstrap = rewritten.replace(
    '<body>',
    `<body>\n    ${buildBootstrapScript(localStorageOverrides)}`
  )

  const outDir = path.join(DIST_DIR, subpath)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), withBootstrap)
  console.log(`📄 Generated variant: /${subpath}/index.html`)
}

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
})

// Get all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
    } else {
      arrayOfFiles.push(filePath)
    }
  })

  return arrayOfFiles
}

// Clear S3 bucket prefix (optional - remove old files)
async function clearBucket() {
  console.log(`🗑️  Clearing old files from ${S3_PREFIX}/ in S3 bucket...`)

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: `${S3_PREFIX}/`,
    })

    const listedObjects = await s3Client.send(listCommand)

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log('   Directory is already empty')
      return
    }

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
      },
    })

    await s3Client.send(deleteCommand)
    console.log(`   Deleted ${listedObjects.Contents.length} files`)
  } catch (error) {
    console.warn('⚠️  Warning: Could not clear directory:', error.message)
  }
}

// Each cinema variation's media dir (relative to DIST_DIR, forward-slash) is
// skipped during upload by default. Cinema videos are large and have no
// CDN/caching strategy worked out yet, so a variation deploys with its
// "not found" message until explicitly whitelisted below — cinema still
// works in local dev regardless.
const EXCLUDED_PATH_PATTERNS = [/^cinema\/[^/]+\/media\//]

// Individual files (relative to DIST_DIR, forward-slash) that upload despite
// matching an excluded pattern above.
const WHITELISTED_PATHS = [
  'cinema/2026-08-forsythe/media/forsythe_one_flat_thing_reproduced.mp4',
  'cinema/2026-09/media/forsythe_one_flat_thing_reproduced_motion.mp4',
  'cinema/depth-map/media/forsythe_one_flat_thing_reproduced_depth.mp4',
]

// Upload files to S3
async function uploadFiles() {
  const allFiles = getAllFiles(DIST_DIR)
  const files = allFiles.filter((file) => {
    const relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/')
    if (WHITELISTED_PATHS.includes(relativePath)) return true
    return !EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(relativePath))
  })
  const skipped = allFiles.length - files.length
  if (skipped > 0) {
    console.log(`⏭️  Skipping ${skipped} file(s) under excluded paths`)
  }
  console.log(`\n📦 Found ${files.length} files to upload`)

  let uploaded = 0
  let failed = 0

  for (const file of files) {
    const relativePath = path.relative(DIST_DIR, file)
    const s3Key = `${S3_PREFIX}/${relativePath.replace(/\\/g, '/')}` // Add prefix and convert Windows paths to Unix
    const contentType = mime.lookup(file) || 'application/octet-stream'
    const fileContent = fs.readFileSync(file)

    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        // Set cache control headers
        CacheControl: s3Key.match(/\.(html|json)$/)
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=31536000, immutable',
      })

      await s3Client.send(command)
      console.log(`   ✓ ${s3Key}`)
      uploaded++
    } catch (error) {
      console.error(`   ✗ ${s3Key}: ${error.message}`)
      failed++
    }
  }

  return { uploaded, failed }
}

// Main deployment function
async function deploy() {
  console.log('🚀 Starting deployment...')
  console.log(`   Region: ${AWS_REGION}`)
  console.log(`   Bucket: ${S3_BUCKET}`)
  console.log(`   Path: ${S3_PREFIX}/`)

  try {
    // Generate preconfigured variants (e.g. /mono/) from the built app
    // before uploading, so they're picked up by uploadFiles()
    for (const variant of VARIANTS) {
      generateVariant(variant)
    }

    // Clear bucket prefix before uploading
    await clearBucket()

    // Upload files
    const { uploaded, failed } = await uploadFiles()

    console.log('\n✨ Deployment complete!')
    console.log(`   Uploaded: ${uploaded} files`)
    if (failed > 0) {
      console.log(`   Failed: ${failed} files`)
      process.exit(1)
    }

    console.log(`\n🌐 Your site should be available at:`)
    console.log(
      `   http://${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com/${S3_PREFIX}/`
    )
    console.log(
      `   (Make sure your bucket is configured for static website hosting)`
    )
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message)
    process.exit(1)
  }
}

// Run deployment
deploy()
