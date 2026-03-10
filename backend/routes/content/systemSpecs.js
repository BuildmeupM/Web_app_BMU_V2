/**
 * System Specs API Routes
 * เช็คสเปคเครื่องคอมพิวเตอร์ของพนักงาน
 * ใช้ PowerShell script เก็บข้อมูลแล้วส่งกลับมายัง API
 */

import express from 'express'
import jwt from 'jsonwebtoken'
import { authenticateToken, authorize } from '../../middleware/auth.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET

// ── Temporary in-memory store สำหรับ specs + user info (ไม่เก็บ DB) ──
const specsStore = new Map() // key: userId, value: { specs, userInfo, expiresAt }
const SPECS_TTL = 10 * 60 * 1000 // 10 นาที

function setSpecsData(userId, specs, userInfo) {
    specsStore.set(userId, { specs, userInfo, expiresAt: Date.now() + SPECS_TTL })
}

function getSpecsData(userId) {
    const entry = specsStore.get(userId)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        specsStore.delete(userId)
        return null
    }
    return entry
}

/**
 * POST /api/system-specs/submit
 * รับข้อมูลสเปคจาก PowerShell script (ใช้ spec token ตรวจสอบเอง)
 * ⚠️ ต้องอยู่ก่อน authenticateToken middleware
 */
router.post('/submit', async (req, res) => {
    try {
        const { token, specs, user_info } = req.body

        if (!token || !specs) {
            return res.status(400).json({ success: false, message: 'Token and specs are required' })
        }

        // Verify one-time token
        let decoded
        try {
            decoded = jwt.verify(token, JWT_SECRET)
            if (decoded.purpose !== 'system-specs') {
                return res.status(401).json({ success: false, message: 'Invalid token purpose' })
            }
        } catch {
            return res.status(401).json({ success: false, message: 'Token expired or invalid' })
        }

        const userId = decoded.userId

        // Add collected_at to specs if not present
        if (!specs.collected_at) {
            specs.collected_at = new Date().toISOString()
        }

        // เก็บ specs + user info ไว้ใน memory (ไม่บันทึก DB)
        setSpecsData(userId, specs, user_info)

        res.json({ success: true, message: 'บันทึกสเปคเครื่องสำเร็จ' })
    } catch (error) {
        console.error('Error submitting specs:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

// ── Routes ที่ต้อง login ──
router.use(authenticateToken)

/**
 * POST /api/system-specs/generate-command
 * สร้างคำสั่ง PowerShell พร้อม one-time token
 */
router.post('/generate-command', async (req, res) => {
    try {
        // สร้าง one-time token ที่หมดอายุ 10 นาที
        const specToken = jwt.sign(
            { userId: req.user.id, purpose: 'system-specs' },
            JWT_SECRET,
            { expiresIn: '10m' }
        )

        // สร้าง API URL
        const backendUrl = `${req.protocol}://${req.get('host')}`

        // สร้าง PowerShell command (one-liner ที่ copy แล้วรันได้เลย)
        const psCommand = generatePowerShellCommand(backendUrl, specToken)

        res.json({
            success: true,
            data: {
                token: specToken,
                command: psCommand,
                expiresIn: '10 นาที',
            },
        })
    } catch (error) {
        console.error('Error generating spec command:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/system-specs/user-info
 * ดึง user info จาก memory (ไม่ได้เก็บ DB)
 */
router.get('/user-info', async (req, res) => {
    try {
        const data = getSpecsData(req.user.id)
        res.json({ success: true, data: data ? data.userInfo : null })
    } catch (error) {
        console.error('Error fetching user info:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/system-specs/me
 * ดึงข้อมูลสเปคเครื่องของ user ปัจจุบัน (จาก memory)
 */
router.get('/me', async (req, res) => {
    try {
        const data = getSpecsData(req.user.id)
        if (!data || !data.specs) {
            return res.json({ success: true, data: null })
        }

        const specs = data.specs
        // Parse JSON fields if they are string (PowerShell might send them as objects already, but just in case)
        if (specs.ram_slots && typeof specs.ram_slots === 'string') {
            try { specs.ram_slots = JSON.parse(specs.ram_slots) } catch { /* keep as string */ }
        }
        if (specs.storage_info && typeof specs.storage_info === 'string') {
            try { specs.storage_info = JSON.parse(specs.storage_info) } catch { /* keep as string */ }
        }

        res.json({ success: true, data: specs })
    } catch (error) {
        console.error('Error fetching my specs:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * GET /api/system-specs/all
 * (admin) ดึงข้อมูลสเปคเครื่องของทุกคน (จาก memory)
 */
router.get('/all', authorize('admin'), async (req, res) => {
    try {
        // Since we are not using DB, we will just return what's in memory.
        // We don't have user's name/employee_id easily available unless we query the DB or it's in user_info.
        // We will try to construct the response based on the memory store.
        const rows = []
        specsStore.forEach((value, userId) => {
            const row = { ...value.specs }
            row.user_id = userId
            
            // Try to add info from userInfo if available
            if (value.userInfo) {
                row.user_name = value.userInfo.full_name || value.userInfo.username
                row.employee_id = null // We don't have this in memory
            }

            // Parse JSON fields
            if (row.ram_slots && typeof row.ram_slots === 'string') {
                try { row.ram_slots = JSON.parse(row.ram_slots) } catch { /* keep */ }
            }
            if (row.storage_info && typeof row.storage_info === 'string') {
                try { row.storage_info = JSON.parse(row.storage_info) } catch { /* keep */ }
            }
            
            rows.push(row)
        })

        // Sort by collected_at DESC
        rows.sort((a, b) => {
            const dateA = new Date(a.collected_at || 0).getTime()
            const dateB = new Date(b.collected_at || 0).getTime()
            return dateB - dateA
        })

        res.json({ success: true, data: rows })
    } catch (error) {
        console.error('Error fetching all specs:', error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
})

/**
 * สร้าง PowerShell command สำหรับเก็บข้อมูลสเปค
 * ใช้ -EncodedCommand (Base64 UTF-16LE) เพื่อหลีกเลี่ยงปัญหา $ ถูกแปลงโดย outer shell
 */
function generatePowerShellCommand(backendUrl, token) {
    // สร้าง PowerShell script แบบเต็มรูปแบบ
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
Write-Host '🔍 Collecting system specs + user info...' -ForegroundColor Cyan

# ══════════════════════════════════════
# HARDWARE SPECS
# ══════════════════════════════════════

# CPU
$cpu = Get-CimInstance Win32_Processor

# RAM
$ram = Get-CimInstance Win32_PhysicalMemory
$ramTotal = [math]::Round(($ram | Measure-Object Capacity -Sum).Sum / 1GB, 2)
$ramTypeMap = @{0='Unknown';20='DDR';21='DDR2';24='DDR3';26='DDR4';34='DDR5'}
$ramSlots = @($ram | ForEach-Object {
    @{
        slot  = $_.DeviceLocator
        size  = [string]([math]::Round($_.Capacity / 1GB)) + 'GB'
        speed = [string]$_.Speed + 'MHz'
        type  = $ramTypeMap[[int]$_.SMBIOSMemoryType]
    }
})
$ramType = if ($ram[0]) { $ramTypeMap[[int]$ram[0].SMBIOSMemoryType] } else { 'Unknown' }

# GPU
$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1
$gpuVram = if ($gpu.AdapterRAM) { [string]([math]::Round($gpu.AdapterRAM / 1GB)) + 'GB' } else { 'N/A' }

# Storage
$disks = @(Get-CimInstance Win32_DiskDrive | ForEach-Object {
    $diskType = if ($_.MediaType -match 'SSD' -or $_.Model -match 'SSD' -or $_.Model -match 'NVMe') { 'SSD' } else { 'HDD' }
    @{ model = $_.Model; size = [string]([math]::Round($_.Size / 1GB)) + 'GB'; type = $diskType }
})

# System
$sys = Get-CimInstance Win32_ComputerSystemProduct
$cs  = Get-CimInstance Win32_ComputerSystem
$os  = Get-CimInstance Win32_OperatingSystem

# Network
$net = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1
$mac = (Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress

# Build specs
$specs = @{
    hostname       = $env:COMPUTERNAME
    os_name        = $os.Caption
    os_version     = $os.Version
    cpu_name       = $cpu.Name
    cpu_cores      = [int]$cpu.NumberOfCores
    cpu_threads    = [int]$cpu.NumberOfLogicalProcessors
    ram_total_gb   = $ramTotal
    ram_type       = $ramType
    ram_speed_mhz  = if ($ram[0]) { [int]$ram[0].Speed } else { 0 }
    ram_slots      = $ramSlots
    gpu_name       = if ($gpu) { $gpu.Name } else { 'N/A' }
    gpu_vram       = $gpuVram
    storage_info   = $disks
    serial_number  = $sys.IdentifyingNumber
    manufacturer   = $cs.Manufacturer
    model          = $cs.Model
    ip_address     = if ($net) { $net.IPAddress } else { 'N/A' }
    mac_address    = if ($mac) { $mac } else { 'N/A' }
}

# ══════════════════════════════════════
# WINDOWS USER INFO
# ══════════════════════════════════════
Write-Host '👤 Collecting user info...' -ForegroundColor Cyan

$username = $env:USERNAME
$domain = $env:USERDOMAIN
$profilePath = $env:USERPROFILE

# SID
$sidObj = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$sid = $sidObj.User.Value

# Admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Groups
$groups = @($sidObj.Groups | ForEach-Object {
    $groupName = $_.Translate([System.Security.Principal.NTAccount]).Value
    $groupName
}) | Where-Object { $_ }

# Login session info
$logonSession = Get-CimInstance Win32_LogonSession | Where-Object { $_.LogonType -eq 2 -or $_.LogonType -eq 10 -or $_.LogonType -eq 11 } | Sort-Object StartTime -Descending | Select-Object -First 1
$loginTime = if ($logonSession.StartTime) { $logonSession.StartTime.ToString('yyyy-MM-dd HH:mm:ss') } else { 'N/A' }
$logonTypeMap = @{2='Interactive (Local)';3='Network';4='Batch';5='Service';7='Unlock';8='NetworkCleartext';9='NewCredentials';10='RemoteInteractive (RDP)';11='CachedInteractive'}
$loginMethod = if ($logonSession) { $logonTypeMap[[int]$logonSession.LogonType] } else { 'N/A' }

# Full name - try AD first, fallback to local
$fullName = 'N/A'
try {
    $adUser = ([adsisearcher]"(&(objectCategory=person)(objectClass=user)(sAMAccountName=$username))").FindOne()
    if ($adUser) {
        $fullName = $adUser.Properties['displayname'][0]
    }
} catch {}
if ($fullName -eq 'N/A') {
    try {
        $localUser = Get-LocalUser -Name $username
        $fullName = $localUser.FullName
        if (-not $fullName) { $fullName = $username }
    } catch { $fullName = $username }
}

# Account type
$isDomainJoined = (Get-CimInstance Win32_ComputerSystem).PartOfDomain
$accountType = if ($isDomainJoined) { 'Domain Account' } else { 'Local Account' }

# Microsoft Account info
$msEmail = 'N/A'
$msDisplayName = 'N/A'

# Method 1: IdentityCRL registry (most reliable for MS Account email)
try {
    $identityKeys = Get-ChildItem 'HKCU:\\SOFTWARE\\Microsoft\\IdentityCRL\\UserExtendedProperties' -ErrorAction SilentlyContinue
    if ($identityKeys) {
        $msEmail = $identityKeys[0].PSChildName
    }
} catch {}

# Method 2: LogonUI (display name of last logon)
try {
    $logonUI = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI' -ErrorAction SilentlyContinue
    if ($logonUI.LastLoggedOnDisplayName) {
        $msDisplayName = $logonUI.LastLoggedOnDisplayName
    }
} catch {}

# Method 3: fallback - whoami /upn (works for domain/Azure AD)
if ($msEmail -eq 'N/A') {
    try {
        $upn = cmd /c 'whoami /upn' 2>&1
        if ($upn -and $upn -like '*@*' -and $upn -notlike '*ERROR*') {
            $msEmail = $upn.Trim()
        }
    } catch {}
}

$userInfo = @{
    username        = $username
    domain          = $domain
    full_name       = $fullName
    sid             = $sid
    is_admin        = $isAdmin
    groups          = $groups
    login_time      = $loginTime
    login_method    = $loginMethod
    profile_path    = $profilePath
    account_type    = $accountType
    ms_email        = $msEmail
    ms_display_name = $msDisplayName
}

$body = @{ token = '${token}'; specs = $specs; user_info = $userInfo } | ConvertTo-Json -Depth 5 -Compress

Write-Host '📡 Sending data...' -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $r = Invoke-RestMethod -Uri '${backendUrl}/api/system-specs/submit' -Method POST -Body $body -ContentType 'application/json'
    if ($r.success) {
        Write-Host '✅ Done! Specs + User info saved successfully.' -ForegroundColor Green
    } else {
        Write-Host ('❌ Error: ' + $r.message) -ForegroundColor Red
    }
} catch {
    Write-Host ('❌ Cannot connect to server: ' + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host 'Press Enter to close...' -ForegroundColor DarkGray
Read-Host
`

    // Encode script to Base64 (UTF-16LE) for -EncodedCommand
    const utf16Buffer = Buffer.from(psScript, 'utf16le')
    const base64Command = utf16Buffer.toString('base64')

    return `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Command}`
}

export default router
