import { useState, useEffect } from 'react'
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Alert,
  Box,
} from '@mantine/core'
import { TbAlertCircle, TbUser, TbLock } from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

const BMU_LOGO_URL = 'https://bmu.co.th/wp-content/uploads/2024/11/cropped-%E0%B9%84%E0%B8%AD%E0%B8%84%E0%B9%88%E0%B8%AD%E0%B8%99bmu.png'

/* ─────────────── CSS Keyframes ─────────────── */
const keyframesCSS = `
@keyframes floatUp {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
}
@keyframes floatSlow {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(1deg); }
}
@keyframes floatRight {
  0%, 100% { transform: translateX(0) translateY(0); }
  50%      { transform: translateX(6px) translateY(-8px); }
}
@keyframes pulseGlow {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
@keyframes barAnim1 { 0%,100%{height:45%} 50%{height:75%} }
@keyframes barAnim2 { 0%,100%{height:70%} 50%{height:40%} }
@keyframes barAnim3 { 0%,100%{height:30%} 50%{height:85%} }
@keyframes barAnim4 { 0%,100%{height:80%} 50%{height:50%} }
@keyframes barAnim5 { 0%,100%{height:55%} 50%{height:70%} }
@keyframes slideUp {
  0%   { opacity:0; transform: translateY(40px); }
  100% { opacity:1; transform: translateY(0); }
}
@keyframes donutAnim {
  0%   { stroke-dashoffset: 200; }
  100% { stroke-dashoffset: 60; }
}
@keyframes countUp {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes coinFloat {
  0%, 100% { transform: translateY(0) rotateY(0deg); }
  25%      { transform: translateY(-6px) rotateY(90deg); }
  50%      { transform: translateY(-12px) rotateY(180deg); }
  75%      { transform: translateY(-6px) rotateY(270deg); }
}
`

if (typeof document !== 'undefined') {
  const id = 'login-kf-v2'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = keyframesCSS
    document.head.appendChild(s)
  }
}

/* ─────────────── Dashboard + Accounting Illustration ─────────────── */
function DashboardIllustration() {
  return (
    <div style={{
      position: 'relative',
      width: 460,
      height: 460,
      margin: '0 auto',
    }}>
      {/* ── Main Monitor / Laptop ── */}
      <div style={{
        position: 'absolute',
        bottom: 75,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 260,
        height: 175,
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '16px 16px 4px 4px',
        boxShadow: '0 12px 45px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        animation: 'slideUp 0.8s ease-out',
      }}>
        {/* Top bar */}
        <div style={{
          height: 26,
          background: 'linear-gradient(135deg, #FF8C42, #FF6B35)',
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 4,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
          <div style={{ flex: 1 }} />
          <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        </div>

        {/* Dashboard content */}
        <div style={{ padding: 10 }}>
          {/* Stat row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[
              { label: 'รายรับ', val: '฿1.2M', color: '#FF8C42' },
              { label: 'ภาษี', val: '฿245K', color: '#4facfe' },
              { label: 'กำไร', val: '฿890K', color: '#56ab2f' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: '#f7f8fa', borderRadius: 8, padding: '6px 8px',
                borderLeft: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 6, color: '#999' }}>{s.label}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#333' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div style={{
            display: 'flex', gap: 6, height: 70,
          }}>
            {/* Bar chart */}
            <div style={{
              flex: 1.2, background: '#f7f8fa', borderRadius: 8,
              display: 'flex', alignItems: 'flex-end', padding: '6px 8px', gap: 4,
            }}>
              {[
                { a: 'barAnim1', d: '0s', c: '#FF8C42' },
                { a: 'barAnim2', d: '0.2s', c: '#ffb866' },
                { a: 'barAnim3', d: '0.4s', c: '#FF6B35' },
                { a: 'barAnim4', d: '0.1s', c: '#FF8C42' },
                { a: 'barAnim5', d: '0.3s', c: '#ffb866' },
                { a: 'barAnim1', d: '0.5s', c: '#FF6B35' },
                { a: 'barAnim2', d: '0.6s', c: '#FF8C42' },
              ].map((b, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: '3px 3px 0 0',
                  background: b.c,
                  animation: `${b.a} 3s ease-in-out infinite`,
                  animationDelay: b.d, minHeight: 4,
                }} />
              ))}
            </div>
            {/* Mini pie */}
            <div style={{
              flex: 0.8, background: '#f7f8fa', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="44" height="44" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="28" fill="none" stroke="#f0f0f0" strokeWidth="7" />
                <circle cx="40" cy="40" r="28" fill="none" stroke="#FF8C42" strokeWidth="7"
                  strokeDasharray="175" strokeDashoffset="50" strokeLinecap="round"
                  transform="rotate(-90 40 40)" />
                <circle cx="40" cy="40" r="28" fill="none" stroke="#4facfe" strokeWidth="7"
                  strokeDasharray="175" strokeDashoffset="130" strokeLinecap="round"
                  transform="rotate(70 40 40)" />
              </svg>
            </div>
          </div>

          {/* Bottom labels */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6 }}>
            {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.'].map((m, i) => (
              <span key={i} style={{ fontSize: 5, color: '#bbb' }}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Laptop stand */}
      <div style={{
        position: 'absolute', bottom: 65, left: '50%',
        transform: 'translateX(-50%)', width: 110, height: 10,
        background: 'rgba(255,255,255,0.4)', borderRadius: '0 0 8px 8px',
      }} />

      {/* ── Computer Desk ── */}
      {/* Desk surface */}
      <div style={{
        position: 'absolute', bottom: 45, left: '50%',
        transform: 'translateX(-50%)',
        width: 380, height: 16,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)',
        borderRadius: '4px 4px 2px 2px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      }} />
      {/* Desk front edge */}
      <div style={{
        position: 'absolute', bottom: 39, left: '50%',
        transform: 'translateX(-50%)',
        width: 390, height: 6,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '0 0 3px 3px',
      }} />
      {/* Left desk leg */}
      <div style={{
        position: 'absolute', bottom: 5, left: 'calc(50% - 170px)',
        width: 10, height: 34,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '0 0 3px 3px',
      }} />
      {/* Right desk leg */}
      <div style={{
        position: 'absolute', bottom: 5, left: 'calc(50% + 160px)',
        width: 10, height: 34,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '0 0 3px 3px',
      }} />

      {/* ── Desk Items ── */}
      {/* Coffee cup */}
      <div style={{
        position: 'absolute', bottom: 50, right: 55,
        width: 16, height: 14,
        background: 'rgba(255,255,255,0.6)',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      }}>
        {/* cup handle */}
        <div style={{
          position: 'absolute', right: -5, top: 3,
          width: 6, height: 8,
          border: '2px solid rgba(255,255,255,0.5)',
          borderLeft: 'none',
          borderRadius: '0 4px 4px 0',
        }} />
        {/* steam */}
        <div style={{ position: 'absolute', top: -6, left: 4, fontSize: 6, opacity: 0.4, animation: 'pulseGlow 2s ease-in-out infinite' }}>~</div>
      </div>

      {/* Plant pot */}
      <div style={{
        position: 'absolute', bottom: 50, left: 55,
      }}>
        {/* Leaves */}
        <div style={{ position: 'relative', width: 20, height: 18 }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 5,
            width: 10, height: 14,
            background: '#56ab2f', borderRadius: '50% 50% 0 0',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: 8, height: 11,
            background: '#6fcf45', borderRadius: '50% 50% 0 0',
            transform: 'rotate(-15deg)',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 11,
            width: 8, height: 11,
            background: '#6fcf45', borderRadius: '50% 50% 0 0',
            transform: 'rotate(15deg)',
            opacity: 0.6,
          }} />
        </div>
        {/* Pot */}
        <div style={{
          width: 18, height: 10,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: '2px 2px 5px 5px',
          margin: '0 auto',
        }} />
      </div>

      {/* Pen holder */}
      <div style={{
        position: 'absolute', bottom: 50, left: 85,
        width: 10, height: 16,
        background: 'rgba(255,255,255,0.45)',
        borderRadius: '2px 2px 3px 3px',
      }}>
        <div style={{ position: 'absolute', top: -6, left: 2, width: 2, height: 8, background: 'rgba(255,200,100,0.5)', borderRadius: 1, transform: 'rotate(-5deg)' }} />
        <div style={{ position: 'absolute', top: -5, left: 5, width: 2, height: 7, background: 'rgba(100,180,255,0.5)', borderRadius: 1, transform: 'rotate(5deg)' }} />
      </div>

      {/* ── Floating: Revenue Growth (top-right) ── */}
      <div style={{
        position: 'absolute', top: 5, right: 10,
        width: 155, background: 'rgba(255,255,255,0.94)',
        borderRadius: 14, padding: 14,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        animation: 'floatUp 4.5s ease-in-out infinite',
        animationDelay: '0.3s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#555' }}>Revenue Growth</span>
          <span style={{ fontSize: 7, color: '#56ab2f', fontWeight: 700 }}>▲ 24.5%</span>
        </div>
        <svg width="100%" height="40" viewBox="0 0 130 40">
          <defs>
            <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8C42" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF8C42" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,32 Q20,28 35,22 T70,14 T100,18 T130,4" fill="none" stroke="#FF8C42" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0,32 Q20,28 35,22 T70,14 T100,18 T130,4 L130,40 L0,40 Z" fill="url(#rvGrad)" />
          <circle cx="130" cy="4" r="3" fill="#FF6B35">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* ── Floating: Tax Filing Card (top-left) — บัญชี/ภาษี ── */}
      <div style={{
        position: 'absolute', top: 15, left: 5,
        width: 140, background: 'rgba(255,255,255,0.94)',
        borderRadius: 14, padding: 12,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        animation: 'floatSlow 5s ease-in-out infinite',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10,
          }}>📄</div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#333' }}>ยื่นภาษี</div>
            <div style={{ fontSize: 7, color: '#999' }}>Tax Filing</div>
          </div>
        </div>
        {/* Tax form list */}
        {[
          { name: 'ภ.ง.ด.1', status: '✅', pct: '100%' },
          { name: 'ภ.ง.ด.53', status: '✅', pct: '100%' },
          { name: 'ภ.พ.30', status: '⏳', pct: '75%' },
        ].map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 3, fontSize: 8,
          }}>
            <span style={{ color: '#555' }}>{t.status} {t.name}</span>
            <div style={{
              width: 36, height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: t.pct, height: '100%', borderRadius: 2,
                background: t.pct === '100%' ? '#56ab2f' : '#FF8C42',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Floating: Invoice / Receipt (right-middle) — บัญชีดิจิตอล ── */}
      <div style={{
        position: 'absolute', top: 110, right: -5,
        width: 115, background: 'rgba(255,255,255,0.92)',
        borderRadius: 12, padding: 10,
        boxShadow: '0 6px 25px rgba(0,0,0,0.1)',
        animation: 'floatRight 5.5s ease-in-out infinite',
        animationDelay: '1s',
      }}>
        <div style={{ fontSize: 8, fontWeight: 600, color: '#FF6B35', marginBottom: 6 }}>🧾 ใบแจ้งหนี้</div>
        <div style={{ borderTop: '1px dashed #eee', paddingTop: 4 }}>
          {[
            { item: 'ค่าทำบัญชี', amt: '5,000' },
            { item: 'ค่ายื่นภาษี', amt: '2,500' },
            { item: 'ค่าสอบบัญชี', amt: '8,000' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 6.5, color: '#666', marginBottom: 2,
            }}>
              <span>{r.item}</span>
              <span style={{ fontWeight: 600 }}>฿{r.amt}</span>
            </div>
          ))}
          <div style={{
            borderTop: '1px solid #eee', marginTop: 3, paddingTop: 3,
            display: 'flex', justifyContent: 'space-between',
            fontSize: 7.5, fontWeight: 700, color: '#333',
          }}>
            <span>รวม</span>
            <span style={{ color: '#FF6B35' }}>฿15,500</span>
          </div>
        </div>
      </div>

      {/* ── Floating: Digital Accounting Badge (bottom-left) ── */}
      <div style={{
        position: 'absolute', bottom: 45, left: -10,
        width: 120, background: 'rgba(255,255,255,0.9)',
        borderRadius: 12, padding: 10,
        boxShadow: '0 6px 22px rgba(0,0,0,0.1)',
        animation: 'floatUp 5s ease-in-out infinite',
        animationDelay: '1.5s',
      }}>
        <div style={{ fontSize: 8, fontWeight: 600, color: '#333', marginBottom: 6 }}>
          💰 บัญชีดิจิตอล
        </div>
        {/* Donut chart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="40" height="40" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#f0f0f0" strokeWidth="7" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#56ab2f" strokeWidth="7"
              strokeDasharray="188" strokeDashoffset="47" strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{ animation: 'donutAnim 2s ease-out forwards' }}
            />
            <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill="#333">75%</text>
          </svg>
          <div>
            <div style={{ fontSize: 7, color: '#999' }}>สำเร็จ</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#56ab2f' }}>45/60</div>
            <div style={{ fontSize: 6, color: '#bbb' }}>ราย</div>
          </div>
        </div>
      </div>

      {/* ── Floating: Calendar (middle-left below tax) ── */}
      <div style={{
        position: 'absolute', top: 160, left: 15,
        width: 95, background: 'rgba(255,255,255,0.88)',
        borderRadius: 10, padding: 6,
        boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
        animation: 'floatSlow 6s ease-in-out infinite',
        animationDelay: '2s',
      }}>
        <div style={{
          fontSize: 7, fontWeight: 600, color: '#FF6B35',
          marginBottom: 4, textAlign: 'center',
        }}>📅 ก.พ. 2026</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
            <div key={`h${i}`} style={{
              fontSize: 4.5, textAlign: 'center', color: '#bbb', fontWeight: 600,
            }}>{d}</div>
          ))}
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} style={{
              fontSize: 5, textAlign: 'center',
              color: i === 11 ? '#fff' : (i === 14 ? '#FF6B35' : '#777'),
              background: i === 11 ? '#FF8C42' : 'transparent',
              borderRadius: '50%',
              width: 10, height: 10, lineHeight: '10px',
              margin: '0 auto',
              fontWeight: i === 14 ? 700 : 400,
            }}>{i + 1}</div>
          ))}
        </div>
      </div>

      {/* ── Floating coins (decoration) ── */}
      {[
        { top: 50, left: 165, delay: '0s', size: 18 },
        { top: 130, right: 70, delay: '1s', size: 14 },
        { bottom: 90, right: 30, delay: '2s', size: 16 },
      ].map((coin, i) => (
        <div key={`coin${i}`} style={{
          position: 'absolute',
          ...coin,
          width: coin.size, height: coin.size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFD700, #FFA000)',
          boxShadow: '0 2px 8px rgba(255,160,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: coin.size * 0.45, color: '#b8860b', fontWeight: 700,
          animation: 'coinFloat 4s ease-in-out infinite',
          animationDelay: coin.delay,
        } as React.CSSProperties}>฿</div>
      ))}

      {/* Connection lines */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="460" height="460">
        <line x1="140" y1="90" x2="155" y2="140" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="310" y1="60" x2="290" y2="110" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="350" y1="140" x2="310" y2="180" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="110" y1="200" x2="140" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Decorative glowing dots */}
      {[
        { top: 45, left: 155 }, { top: 100, left: 200 },
        { top: 150, right: 60 }, { bottom: 70, left: 120 },
        { top: 75, right: 100 },
      ].map((d, i) => (
        <div key={`gd${i}`} style={{
          position: 'absolute', ...d,
          width: 5, height: 5, borderRadius: '50%',
          background: '#fff',
          animation: 'pulseGlow 3s ease-in-out infinite',
          animationDelay: `${i * 0.6}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

/* ─────────────── Main Login ─────────────── */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      setLoading(false)
      return
    }

    try {
      const response = await authService.login({ username, password })
      if (response.data?.user && response.data?.token) {
        login(response.data.user, response.data.token, response.data.sessionId)
        navigate('/dashboard', { replace: true })
      } else {
        setError('เกิดข้อผิดพลาด: ไม่ได้รับข้อมูล user หรือ token')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
      } else if (err.response?.status === 423) {
        setError(err.response?.data?.message || 'บัญชีถูกล็อคชั่วคราว')
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError(err.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'ข้อมูลไม่ถูกต้อง')
      } else {
        setError(err.response?.data?.message || 'เกิดข้อผิดพลาด')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Kanit', 'Arial', sans-serif",
    }}>
      {/* ─── Left Panel: Brand + Illustration ─── */}
      <Box
        style={{
          flex: 1.15,
          background: 'linear-gradient(160deg, #FF8C42 0%, #FF6B35 35%, #e55a2b 70%, #cc4f22 100%)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '30px 25px',
          position: 'relative', overflow: 'hidden',
        }}
        visibleFrom="sm"
      >
        {/* BG shapes */}
        <div style={{
          position: 'absolute', top: '-15%', right: '-12%',
          width: 450, height: 450, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '55%', left: '8%',
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 500 }}>
          {/* Logo */}
          <div style={{
            width: 95, height: 95,
            background: '#ffffff',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            padding: 10,
          }}>
            <img src={BMU_LOGO_URL} alt="BMU Logo" style={{ width: 65, height: 65, objectFit: 'contain' }} />
          </div>

          <h1 style={{
            color: '#fff', fontSize: 28, fontWeight: 700,
            marginBottom: 4, textShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            BMU System
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)', fontSize: 13,
            marginBottom: 22, lineHeight: 1.5,
          }}>
            ระบบบัญชีดิจิตอล & จัดการงานครบวงจร
          </p>

          <DashboardIllustration />
        </div>
      </Box>

      {/* ─── Right Panel: Login Form ─── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fafbfc', padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box hiddenFrom="sm" mb="xl" style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80,
              background: 'rgba(255,140,66,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              padding: 8,
            }}>
              <img src={BMU_LOGO_URL} alt="BMU Logo" style={{ width: 55, height: 55, objectFit: 'contain' }} />
            </div>
            <h2 style={{ color: '#FF6B35', fontSize: 22, fontWeight: 600 }}>BMU System</h2>
          </Box>

          <h2 style={{ fontSize: 28, fontWeight: 600, color: '#222', marginBottom: 6 }}>
            เข้าสู่ระบบ
          </h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 32 }}>
            ยินดีต้อนรับกลับ! กรุณากรอกข้อมูลเพื่อเข้าใช้งาน
          </p>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert icon={<TbAlertCircle size={18} />} color="red" radius="lg" variant="light">
                  {error}
                </Alert>
              )}

              <TextInput
                label="ชื่อผู้ใช้"
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                radius="xl" size="md"
                leftSection={<TbUser size={20} color="#bbb" />}
                styles={{
                  input: { border: '2px solid #eee', fontSize: 15, transition: 'all 0.3s' },
                  label: { fontWeight: 500, marginBottom: 6, color: '#555' },
                }}
              />

              <PasswordInput
                label="รหัสผ่าน"
                placeholder="กรอกรหัสผ่าน"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                radius="xl" size="md"
                leftSection={<TbLock size={20} color="#bbb" />}
                styles={{
                  input: { border: '2px solid #eee', fontSize: 15, transition: 'all 0.3s' },
                  label: { fontWeight: 500, marginBottom: 6, color: '#555' },
                }}
              />

              <Button
                type="submit" fullWidth size="lg" radius="xl"
                loading={loading}
                style={{
                  height: 50, fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #FF8C42, #FF6B35)',
                  border: 'none',
                  boxShadow: '0 6px 24px rgba(255,107,53,0.3)',
                  transition: 'all 0.3s ease', marginTop: 8,
                }}
              >
                เข้าสู่ระบบ
              </Button>
            </Stack>
          </form>

          <Text ta="center" size="xs" c="dimmed" mt={36}>
            © {new Date().getFullYear()} BMU System — All rights reserved
          </Text>
        </div>
      </div>
    </div>
  )
}
