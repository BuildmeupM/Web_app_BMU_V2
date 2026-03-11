import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  HardDrive, Trash2, Play, Pause, FolderOpen, Eye, Pencil, Trash,
  FolderPlus, RefreshCw, FileText, Activity, Users, Clock, Zap, MoveRight, Upload
} from 'lucide-react';
import {
  Box, Paper, Text, Group, Button, Badge, Center, ThemeIcon, Table,
  ScrollArea, SimpleGrid, Stack, Tooltip, TextInput
} from '@mantine/core';
import './ActivityLogDashboard.css';

interface SyslogMessage {
  raw: string;
  timestamp: string;
  severity: string;
  host: string;
  service: string;
  event: string;
  path: string;
  fileType: string;
  size: string;
  user: string;
  ip: string;
  senderIp?: string;
  message: string;
}

const MAX_LOGS = 2000;

const EVENT_CONFIG: Record<string, { icon: typeof Eye; color: string; bg: string; label: string }> = {
  read:   { icon: Eye,        color: '#fff', bg: '#339af0', label: 'อ่าน' },
  write:  { icon: Pencil,     color: '#fff', bg: '#f59f00', label: 'เขียน' },
  create: { icon: FileText,   color: '#fff', bg: '#40c057', label: 'สร้าง' },
  delete: { icon: Trash,      color: '#fff', bg: '#f03e3e', label: 'ลบ' },
  rename: { icon: RefreshCw,  color: '#fff', bg: '#ae3ec9', label: 'เปลี่ยนชื่อ' },
  mkdir:  { icon: FolderPlus, color: '#fff', bg: '#1c7ed6', label: 'สร้างโฟลเดอร์' },
  move:   { icon: MoveRight,  color: '#fff', bg: '#e03131', label: 'ย้าย' },
  upload: { icon: Upload,     color: '#fff', bg: '#fd7e14', label: 'อัปโหลด' },
};

export default function NasDashboard() {
  const [logs, setLogs] = useState<SyslogMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterEvent, setFilterEvent] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [isPaused]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  useEffect(() => {
    const envUrl = import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_BASE_URL;

    let backendUrl = 'http://localhost:3001';
    if (envUrl && envUrl.startsWith('http')) {
      backendUrl = envUrl.endsWith('/api') ? envUrl.slice(0, -4) : envUrl;
    }

    socketRef.current = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:syslog');
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('syslog:new_log', (newLog: SyslogMessage) => {
      setLogs(prev => {
        const updated = [...prev, newLog];
        return updated.length > MAX_LOGS ? updated.slice(updated.length - MAX_LOGS) : updated;
      });
    });

    return () => {
      if (socket) {
        socket.emit('unsubscribe:syslog');
        socket.disconnect();
      }
    };
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const uniqueUsers = new Set(logs.map(l => l.user).filter(Boolean));
    const uniqueIPs = new Set(logs.map(l => l.ip || l.senderIp).filter(Boolean));
    const elapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 60000));
    const logsPerMin = logs.length > 0 ? Math.round(logs.length / elapsed) : 0;

    return {
      total: logs.length,
      users: uniqueUsers.size,
      sources: uniqueIPs.size,
      logsPerMin,
    };
  }, [logs]);

  // Filtered logs (hide 'read' by default unless explicitly selected)
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterUser && !log.user?.toLowerCase().includes(filterUser.toLowerCase())) return false;
      if (filterEvent) {
        if (log.event?.toLowerCase() !== filterEvent) return false;
      } else {
        // Default: hide 'read' and 'host' events
        const hidden = ['read', 'host', 'user'];
        if (hidden.includes(log.event?.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, filterUser, filterEvent]);

  const getEventInfo = (event: string) => {
    const key = event?.toLowerCase() || '';
    return EVENT_CONFIG[key] || { icon: FileText, color: '#adb5bd', bg: 'rgba(173,181,189,0.1)', label: event || '-' };
  };

  const getFileName = (path: string) => {
    if (!path) return '-';
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  const getShortPath = (path: string) => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 2) return path;
    return '/' + parts.slice(0, -1).join('/');
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  };

  const statCards = [
    { label: 'Total Logs', value: stats.total, icon: <Activity size={20} />, color: '#FF6B35' },
    { label: 'Logs / นาที', value: stats.logsPerMin, icon: <Zap size={20} />, color: '#FF6B35' },
    { label: 'ผู้ใช้งาน', value: stats.users, icon: <Users size={20} />, color: '#FF6B35' },
    { label: 'แหล่งข้อมูล', value: stats.sources, icon: <HardDrive size={20} />, color: '#FF6B35' },
  ];

  return (
    <div className="ald-root" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', paddingTop: 0 }}>
      {/* ═══ Header Banner ═══ */}
      <Box className="ald-header-banner ald-animate ald-delay-1" mb="md" style={{ borderRadius: '0 0 16px 16px' }}>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" style={{ position: 'relative', zIndex: 1 }}>
            <ThemeIcon size={52} radius="xl" color="white" variant="light" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <HardDrive size={28} color="white" />
            </ThemeIcon>
            <Box>
              <Group gap="xs" align="center">
                <Text size="xl" fw={800} c="white" style={{ letterSpacing: '-0.3px' }}>NAS Syslog Monitor</Text>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: isConnected ? '#40c057' : '#fa5252',
                  boxShadow: isConnected ? '0 0 10px #40c057' : '0 0 10px #fa5252',
                  animation: isConnected ? 'aldPulseGlow 2s infinite' : 'none'
                }} />
              </Group>
              <Text size="xs" c="rgba(255,255,255,0.8)" fw={500}>
                {isConnected ? 'รับข้อมูล Syslog แบบ Real-time ผ่าน UDP Port 5514' : 'กำลังเชื่อมต่อเซิร์ฟเวอร์...'}
              </Text>
            </Box>
          </Group>

          <Group gap="xs" style={{ position: 'relative', zIndex: 1 }}>
            <Button
              variant="white"
              color={isPaused ? "blue" : "orange"}
              leftSection={isPaused ? <Play size={16} /> : <Pause size={16} />}
              onClick={() => setIsPaused(!isPaused)}
              radius="xl"
              size="sm"
              style={{ fontWeight: 600 }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="white" color="red" leftSection={<Trash2 size={16} />} onClick={() => setLogs([])} radius="xl" size="sm" style={{ fontWeight: 600 }}>
              Clear
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ═══ Stat Cards ═══ */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" className="ald-animate ald-delay-2" style={{ margin: '0 24px', marginBottom: 16 }}>
        {statCards.map((card, i) => (
          <div key={i} className="ald-hero-card">
            <Group gap="sm" align="flex-start">
              <div className="ald-hero-icon">
                {card.icon}
              </div>
              <Box>
                <Text className="ald-stat-number">{card.value}</Text>
                <Text size="xs" c="dimmed" fw={500} mt={2}>{card.label}</Text>
              </Box>
            </Group>
          </div>
        ))}
      </SimpleGrid>

      {/* ═══ Filter Bar ═══ */}
      <Paper
        className="ald-glass-card ald-animate ald-delay-3"
        style={{ margin: '0 24px', marginBottom: 12, padding: '12px 20px' }}
        radius="lg"
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <Text size="sm" fw={600} c="dimmed">กรองตามการกระทำ:</Text>
            <Group gap={4}>
              <Badge
                variant={filterEvent === null ? 'filled' : 'light'}
                color="orange"
                radius="xl"
                size="md"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setFilterEvent(null)}
              >
                ทั้งหมด ({logs.length})
              </Badge>
              {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
                const count = logs.filter(l => l.event?.toLowerCase() === key).length;
                if (count === 0) return null;
                const Icon = cfg.icon;
                return (
                  <Badge
                    key={key}
                    variant={filterEvent === key ? 'filled' : 'light'}
                    color={filterEvent === key ? 'orange' : 'gray'}
                    radius="xl"
                    size="md"
                    leftSection={<Icon size={12} />}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setFilterEvent(filterEvent === key ? null : key)}
                  >
                    {cfg.label} ({count})
                  </Badge>
                );
              })}
            </Group>
          </Group>
          <TextInput
            placeholder="ค้นหาชื่อผู้ใช้..."
            size="xs"
            radius="xl"
            value={filterUser}
            onChange={(e) => setFilterUser(e.currentTarget.value)}
            style={{ width: 200 }}
            styles={{ input: { border: '1px solid #eee' } }}
          />
        </Group>
      </Paper>

      {/* ═══ Table ═══ */}
      <Box
        className="ald-animate ald-delay-4"
        style={{
          flex: 1,
          margin: '0 24px 24px 24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
        }}
      >
        {filteredLogs.length === 0 && logs.length === 0 ? (
          <Paper
            className="ald-glass-card"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            radius="lg"
          >
            <Center style={{ flexDirection: 'column', gap: 16 }}>
              <ThemeIcon size={80} radius="xl" color="orange" variant="light">
                <FolderOpen size={40} />
              </ThemeIcon>
              <Stack gap={4} align="center">
                <Text c="dimmed" size="lg" fw={600}>รอรับข้อมูล NAS Syslog...</Text>
                <Text c="dimmed" size="sm">ตรวจสอบให้แน่ใจว่า NAS ส่ง Log มาที่ Server IP พอร์ต UDP 5514</Text>
                <Badge color="orange" variant="light" size="lg" radius="xl" mt="sm">
                  <Group gap={4}>
                    <Clock size={14} />
                    <span>Listening on port 5514</span>
                  </Group>
                </Badge>
              </Stack>
            </Center>
          </Paper>
        ) : (
          <div className="ald-table-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef}>
              <Table stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 85 }}>เวลา</Table.Th>
                    <Table.Th style={{ width: 130 }}>การกระทำ</Table.Th>
                    <Table.Th style={{ width: 150 }}>ผู้ใช้</Table.Th>
                    <Table.Th style={{ width: 130 }}>IP Address</Table.Th>
                    <Table.Th style={{ width: 100 }}>ประเภท</Table.Th>
                    <Table.Th style={{ width: 100 }}>ขนาด</Table.Th>
                    <Table.Th>ชื่อไฟล์ / เส้นทาง</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredLogs.map((log, i) => {
                    const eventInfo = getEventInfo(log.event);
                    const EventIcon = eventInfo.icon;
                    return (
                      <Table.Tr key={i}>
                        <Table.Td>
                          <Text size="sm" c="dimmed" ff="monospace">{formatTime(log.timestamp)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            radius="xl"
                            size="md"
                            leftSection={<EventIcon size={14} />}
                            style={{
                              backgroundColor: eventInfo.bg,
                              color: eventInfo.color,
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {eventInfo.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            <div className="ald-avatar" style={{ width: 24, height: 24 }}>
                              <span style={{ fontSize: 10 }}>{log.user?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <Text size="sm" fw={600} truncate style={{ maxWidth: 120 }}>{log.user || '-'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="#FF8A5C" ff="monospace">{log.ip || log.senderIp || '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color="orange"
                            radius="xl"
                          >
                            {log.fileType || '-'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{log.size || '-'}</Text>
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 300 }}>
                          <Tooltip label={log.path} position="top-start" multiline maw={500} withArrow>
                            <Box>
                              <Text size="sm" fw={600} truncate>{getFileName(log.path)}</Text>
                              <Text size="xs" c="dimmed" truncate>{getShortPath(log.path)}</Text>
                            </Box>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </Box>
    </div>
  );
}
