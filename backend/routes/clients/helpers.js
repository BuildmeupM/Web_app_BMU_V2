/**
 * Clients - Helper Functions
 * ฟังก์ชันช่วยเหลือสำหรับ client routes
 *
 * แยกมาจาก clients.js เพื่อลดขนาดไฟล์
 * - padBuildCode: Pad Build Code with leading zeros
 * - isValidBuildCode: Validate Build Code format
 * - padLegalEntityNumber: Pad Legal Entity Number with leading zeros
 * - parseDate: Parse date from Excel
 */

/**
 * Helper function to pad Build Code with leading zeros
 * Excel converts "001" to number 1, so we need to pad it back to 3 digits
 * Note: Only pad if it's a pure number (no decimals or other characters)
 * @param {string|number} value - Build Code value from Excel
 * @returns {string} - Padded Build Code (minimum 3 digits for pure numbers)
 */
function padBuildCode(value) {
  if (!value && value !== 0) return ''
  const str = String(value).trim()
  // If it contains decimal point or other non-digit characters, don't pad
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to minimum 3 digits for pure numbers
  return str.padStart(3, '0')
}

/**
 * Helper function to validate Build Code format
 * Build Code can be:
 * - Pure numbers: at least 3 digits (e.g., 001, 122, 375)
 * - Numbers with decimal: at least 3 characters total (e.g., 122.1, 214.2)
 * - Maximum 10 characters (database VARCHAR(10))
 * @param {string} value - Build Code value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidBuildCode(value) {
  if (!value) return false
  const str = String(value).trim()
  // Must be at least 3 characters and max 10 characters
  if (str.length < 3 || str.length > 10) return false
  // Allow digits and decimal point (e.g., 122.1, 214.2)
  // Must start with digit, can have one decimal point followed by digits
  return /^\d{3,}(\.[\d]+)?$/.test(str)
}

/**
 * Helper function to pad Legal Entity Number with leading zeros
 * Excel converts "0105564065416" to number 105564065416, so we need to pad it back to 13 digits
 * @param {string|number} value - Legal Entity Number value from Excel
 * @returns {string} - Padded Legal Entity Number (13 digits)
 */
function padLegalEntityNumber(value) {
  if (!value && value !== 0) return ''
  const str = String(value).replace(/-/g, '').trim()
  // Check if it's a valid number
  if (!/^\d+$/.test(str)) return str
  // Pad with leading zeros to 13 digits
  return str.padStart(13, '0')
}

function parseDate(dateValue, fieldName = 'date', rowNumber = 0) {
  if (!dateValue) return null

  let date

  // If it's already a Date object
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear()
    const month = dateValue.getMonth()
    const day = dateValue.getDate()
    date = new Date(year, month, day)
  }
  // If it's a number (Excel date serial number)
  else if (typeof dateValue === 'number') {
    const unixEpochOffset = 25569
    const jsDate = new Date((dateValue - unixEpochOffset) * 86400000)
    const year = jsDate.getUTCFullYear()
    const month = jsDate.getUTCMonth()
    const day = jsDate.getUTCDate()

    if (year < 1900 || year > 2100) {
      return null
    }

    date = new Date(year, month, day)
  }
  // If it's a string
  else if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()

    // Try D/M/YYYY or DD/MM/YYYY format
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const year = parseInt(parts[2], 10)

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        }
      }
    }
    // Try YYYY-MM-DD format
    else if (trimmed.includes('-')) {
      const parts = trimmed.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
          date = new Date(year, month, day)
        }
      }
    }
    // Try default Date parsing
    else {
      const tempDate = new Date(trimmed)
      if (!isNaN(tempDate.getTime())) {
        const year = tempDate.getFullYear()
        const month = tempDate.getMonth()
        const day = tempDate.getDate()
        date = new Date(year, month, day)
      }
    }
  } else {
    return null
  }

  // Validate date
  if (!date || isNaN(date.getTime())) {
    return null
  }

  // Format as YYYY-MM-DD using local date methods
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export { padBuildCode, isValidBuildCode, padLegalEntityNumber, parseDate }
