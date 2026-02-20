import React from 'react'

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    color?: string
}

export const BuildingIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7H11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 7H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11H11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 11H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 15H11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 15H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const ClipboardIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5522 6 16 5.55228 16 5V3C16 2.44772 15.5522 2 15 2Z" fill="var(--mantine-color-orange-1)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14L11 16L15 12" className="acct-icon-draw" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const ChartIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M3 3V21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 14L11 10L15 14L21 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 8H21V12" className="acct-icon-bounce" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const TrophyIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M8 21H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 17V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 4H17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 4V8C17 9.32608 16.4732 10.5979 15.5355 11.5355C14.5979 12.4732 13.3261 13 12 13C10.6739 13 9.40215 12.4732 8.46447 11.5355C7.52678 10.5979 7 9.32608 7 8V4" fill="var(--mantine-color-yellow-1)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 5H20C20.2652 5 20.5196 5.10536 20.7071 5.29289C20.8946 5.48043 21 5.73478 21 6C21 7.06087 20.5786 8.07828 19.8284 8.82843C19.0783 9.57857 18.0609 10 17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 5H4C3.73478 5 3.48043 5.10536 3.29289 5.29289C3.10536 5.48043 3 5.73478 3 6C3 7.06087 3.42143 8.07828 4.17157 8.82843C4.92172 9.57857 5.93913 10 7 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const UsersIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" fill="var(--mantine-color-blue-1)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5362C21.6184 15.8196 20.8539 15.2821 20 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.53866C18.7122 5.2266 19.0076 6.06354 19.0076 6.915C19.0076 7.76646 18.7122 8.6034 18.1676 9.29135C17.623 9.97929 16.8604 10.4797 16 10.7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const GoldMedalIcon = ({ size = 28, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="acct-icon-float" {...props}>
        {/* Ribbon */}
        <path d="M22 6L32 18L42 6" stroke="#E53935" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6L24 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 6L40 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Medal Base */}
        <circle cx="32" cy="38" r="20" fill="url(#goldGradient)" stroke="#F57F17" strokeWidth="2" />
        <circle cx="32" cy="38" r="15" fill="none" stroke="#FFF59D" strokeWidth="2" strokeDasharray="4 4" />

        {/* Inner Star */}
        <path d="M32 25L34.163 31.0425H40.245L35.331 34.615L37.206 40.6575L32 37.085L26.794 40.6575L28.669 34.615L23.755 31.0425H29.837L32 25Z" fill="#FFF" />

        <defs>
            <linearGradient id="goldGradient" x1="12" y1="18" x2="52" y2="58" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFD54F" />
                <stop offset="0.5" stopColor="#FFB300" />
                <stop offset="1" stopColor="#FF8F00" />
            </linearGradient>
        </defs>
    </svg>
)

export const SilverMedalIcon = ({ size = 28, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="acct-icon-float" style={{ animationDelay: '0.5s' }} {...props}>
        {/* Ribbon */}
        <path d="M22 6L32 18L42 6" stroke="#43A047" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6L24 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 6L40 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Medal Base */}
        <circle cx="32" cy="38" r="20" fill="url(#silverGradient)" stroke="#9E9E9E" strokeWidth="2" />
        <circle cx="32" cy="38" r="15" fill="none" stroke="#F5F5F5" strokeWidth="2" strokeDasharray="4 4" />

        {/* Inner Text */}
        <text x="32" y="44" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="bold" fill="#424242" textAnchor="middle">2</text>

        <defs>
            <linearGradient id="silverGradient" x1="12" y1="18" x2="52" y2="58" gradientUnits="userSpaceOnUse">
                <stop stopColor="#E0E0E0" />
                <stop offset="0.5" stopColor="#BDBDBD" />
                <stop offset="1" stopColor="#757575" />
            </linearGradient>
        </defs>
    </svg>
)

export const BronzeMedalIcon = ({ size = 28, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="acct-icon-float" style={{ animationDelay: '1s' }} {...props}>
        {/* Ribbon */}
        <path d="M22 6L32 18L42 6" stroke="#8E24AA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6L24 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 6L40 18" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Medal Base */}
        <circle cx="32" cy="38" r="20" fill="url(#bronzeGradient)" stroke="#6D4C41" strokeWidth="2" />
        <circle cx="32" cy="38" r="15" fill="none" stroke="#FFCC80" strokeWidth="2" strokeDasharray="4 4" />

        {/* Inner Text */}
        <text x="32" y="44" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="bold" fill="#3E2723" textAnchor="middle">3</text>

        <defs>
            <linearGradient id="bronzeGradient" x1="12" y1="18" x2="52" y2="58" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFB74D" />
                <stop offset="0.5" stopColor="#FF8A65" />
                <stop offset="1" stopColor="#D84315" />
            </linearGradient>
        </defs>
    </svg>
)

export const PieChartIcon = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12A10 10 0 0 0 12 2V12H22Z" className="acct-icon-pulse" fill="var(--mantine-color-orange-1)" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
