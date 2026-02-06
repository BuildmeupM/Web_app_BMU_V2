/**
 * Script สำหรับ Generate JWT Secret Key
 * Usage: node scripts/generate-jwt-secret.js
 */

import crypto from 'crypto'

// Generate random secret key (64 bytes = 512 bits)
const secret = crypto.randomBytes(64).toString('hex')

console.log('='.repeat(60))
console.log('Generated JWT Secret Key:')
console.log('='.repeat(60))
console.log(secret)
console.log('='.repeat(60))
console.log('\n📝 Copy this value and paste it in your .env file:')
console.log(`JWT_SECRET=${secret}\n`)
