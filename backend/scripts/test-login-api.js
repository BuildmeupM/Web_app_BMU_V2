/**
 * Script สำหรับทดสอบ Login API
 * Usage: node scripts/test-login-api.js [username] [password]
 * Example: node scripts/test-login-api.js admin admin123
 */

import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api`
const username = process.argv[2] || 'admin'
const password = process.argv[3] || 'admin123'

async function testLogin() {
  console.log('🔍 Testing Login API...')
  console.log('📋 Configuration:')
  console.log(`   API URL: ${API_BASE_URL}/auth/login`)
  console.log(`   Username: ${username}`)
  console.log(`   Password: ${'*'.repeat(password.length)}`)
  console.log('')

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    })

    if (response.data.success) {
      console.log('✅ Login successful!')
      console.log('📊 Response:')
      console.log(`   User ID: ${response.data.data.user.id}`)
      console.log(`   Username: ${response.data.data.user.username}`)
      console.log(`   Role: ${response.data.data.user.role}`)
      console.log(`   Employee ID: ${response.data.data.user.employee_id || 'N/A'}`)
      console.log(`   Nick Name: ${response.data.data.user.nick_name || 'N/A'}`)
      console.log(`   Token: ${response.data.data.token.substring(0, 50)}...`)
      console.log('')
      console.log('💡 Next steps:')
      console.log('   1. Copy the token above')
      console.log('   2. Test /api/auth/me endpoint with: Authorization: Bearer <token>')
      process.exit(0)
    } else {
      console.error('❌ Login failed!')
      console.error(`   Message: ${response.data.message}`)
      process.exit(1)
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.error('❌ Login failed!')
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Message: ${error.response.data?.message || error.message}`)
      if (error.response.data) {
        console.error(`   Response:`, JSON.stringify(error.response.data, null, 2))
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ Connection failed!')
      console.error(`   Error: ${error.message}`)
      console.error('')
      console.error('💡 Troubleshooting:')
      console.error('   1. ตรวจสอบว่า Backend server กำลังรันอยู่ (npm run dev)')
      console.error(`   2. ตรวจสอบว่า server รันที่ port ${process.env.PORT || 3001}`)
      console.error(`   3. ตรวจสอบ URL: ${API_BASE_URL}/auth/login`)
    } else {
      // Something else happened
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }
}

testLogin()
