import dgram from 'dgram';
import net from 'net';
import pool from '../config/database.js';

// Buffer for batch INSERT (flush every 15 seconds)
const logBuffer = [];
const FLUSH_INTERVAL_MS = 15_000;
const EXCLUDED_EVENTS = ['read', 'host', 'user'];

/**
 * Parse Synology NAS Syslog message into structured fields
 * Example input:
 * <14>Mar 11 17:30:01 BMU WinFileService Event: read, Path: /AA.โฟลเดอร์หลัก/Build384/.../file.xlsx, File/Folder: File, Size: 24.23 KB, User: Baifren, IP: 192.168.1.174
 */
function parseSyslogMessage(rawMessage) {
  const result = {
    raw: rawMessage,
    timestamp: new Date().toISOString(),
    severity: 'info',
    host: 'unknown',
    service: '',
    event: '',
    path: '',
    fileType: '',
    size: '',
    user: '',
    ip: '',
    message: rawMessage
  };

  try {
    // 1. Extract PRI and severity
    const priMatch = rawMessage.match(/^<(\d+)>/);
    let messageContent = rawMessage;

    if (priMatch) {
      const pri = parseInt(priMatch[1], 10);
      const sevCode = pri % 8;
      const severityMap = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'];
      result.severity = severityMap[sevCode] || 'info';
      messageContent = rawMessage.substring(priMatch[0].length);
    }

    // 2. Extract timestamp (e.g. "Mar 11 17:30:01")
    // NAS always sends time in Thailand timezone (UTC+7).
    // Normalize to correct UTC regardless of server timezone.
    const timeMatch = messageContent.match(/^([A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+/);
    if (timeMatch) {
      const year = new Date().getFullYear();
      const parsed = new Date(`${timeMatch[1]} ${year}`);
      if (!isNaN(parsed.getTime())) {
        // parsed interprets in server's local TZ. We know it's actually UTC+7 (offset = -420 min).
        // Adjust so the stored UTC is correct on any server.
        const NAS_TZ_OFFSET = -420; // UTC+7 in minutes
        const adjustment = (parsed.getTimezoneOffset() - NAS_TZ_OFFSET) * 60 * 1000;
        const corrected = new Date(parsed.getTime() - adjustment);
        result.timestamp = corrected.toISOString();
      }
      messageContent = messageContent.substring(timeMatch[0].length);
    }

    // 3. Extract hostname (e.g. "BMU")
    const hostMatch = messageContent.match(/^(\S+)\s+/);
    if (hostMatch) {
      result.host = hostMatch[1];
      messageContent = messageContent.substring(hostMatch[0].length);
    }

    // 4. Extract service name (e.g. "WinFileService Event" or "FileStation Event")
    const serviceMatch = messageContent.match(/^(\S+\s+Event):\s*/i);
    if (serviceMatch) {
      result.service = serviceMatch[1];
      messageContent = messageContent.substring(serviceMatch[0].length);
    } else {
      // Fallback: extract app/tag before colon
      const tagMatch = messageContent.match(/^([^:]+):\s*/);
      if (tagMatch) {
        result.service = tagMatch[1].trim();
        messageContent = messageContent.substring(tagMatch[0].length);
      }
    }

    // 5. Parse key-value pairs from Synology NAS format
    // Pattern: "read, Path: /some/path, File/Folder: File, Size: 24.23 KB, User: Baifren, IP: 192.168.1.174"
    
    // Extract event action (first word before comma)
    const eventMatch = messageContent.match(/^(\w+),?\s*/);
    if (eventMatch) {
      result.event = eventMatch[1];
      messageContent = messageContent.substring(eventMatch[0].length);
    }

    // Extract User
    const userMatch = messageContent.match(/User:\s*([^,]+)/i);
    if (userMatch) result.user = userMatch[1].trim();

    // Extract IP
    const ipMatch = messageContent.match(/IP:\s*([^\s,]+)/i);
    if (ipMatch) result.ip = ipMatch[1].trim();

    // Extract Path
    const pathMatch = messageContent.match(/Path:\s*([^,]+)/i);
    if (pathMatch) result.path = pathMatch[1].trim();

    // Extract File/Folder type
    const typeMatch = messageContent.match(/File\/Folder:\s*([^,]+)/i);
    if (typeMatch) result.fileType = typeMatch[1].trim();

    // Extract Size
    const sizeMatch = messageContent.match(/Size:\s*([^,]+)/i);
    if (sizeMatch) result.size = sizeMatch[1].trim();

    // Keep the full message content
    result.message = messageContent.trim();

  } catch (err) {
    console.error('Syslog parse error:', err);
  }

  return result;
}

/**
 * Flush buffered logs to MySQL via batch INSERT
 */
async function flushLogBuffer() {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0, logBuffer.length);

  try {
    const values = batch.map(log => [
      log.timestamp ? new Date(log.timestamp) : new Date(),
      log.severity || null,
      log.service || null,
      log.event || '',
      log.user || null,
      log.ip || null,
      log.fileType || null,
      log.size || null,
      log.path || null,
      log.raw || null,
    ]);

    await pool.query(
      `INSERT INTO nas_syslog (timestamp, severity, service, event, user, ip, file_type, size, path, raw_message)
       VALUES ?`,
      [values]
    );

    console.log(`💾 [Syslog] Flushed ${batch.length} logs to database`);
  } catch (err) {
    console.error('❌ [Syslog] DB flush error:', err.message);
    // Push back to buffer on failure (with cap to prevent memory leak)
    if (logBuffer.length < 5000) {
      logBuffer.push(...batch);
    }
  }
}

/**
 * Process a syslog message: parse, broadcast via Socket.io, and buffer for DB
 */
function processSyslogMessage(rawString, senderIp, io) {
  const parsedObj = parseSyslogMessage(rawString);
  
  // Add sender IP if not already parsed from the message
  if (!parsedObj.ip) {
    parsedObj.ip = senderIp;
  }
  parsedObj.senderIp = senderIp;
  
  // Broadcast to everyone in 'syslog:nas' room (real-time)
  const room = io.sockets.adapter.rooms.get('syslog:nas');
  const clientCount = room ? room.size : 0;
  
  io.to('syslog:nas').emit('syslog:new_log', parsedObj);

  // Buffer for DB storage (exclude read/host/user events)
  const eventLower = (parsedObj.event || '').toLowerCase();
  if (!EXCLUDED_EVENTS.includes(eventLower) && eventLower !== '') {
    logBuffer.push(parsedObj);
  }
  
  // Debug logging
  console.log(`📡 [Syslog] ${parsedObj.event || 'unknown'} by ${parsedObj.user || 'N/A'} from ${parsedObj.ip} | Clients: ${clientCount}`);
}

/**
 * Initialize UDP Syslog Server (for local/LAN usage)
 */
export function initSyslogServer(io, port = 5514) {
  const server = dgram.createSocket('udp4');

  // Start periodic flush timer
  const flushTimer = setInterval(flushLogBuffer, FLUSH_INTERVAL_MS);

  server.on('error', (err) => {
    console.error(`Syslog UDP server error:\n${err.stack}`);
    clearInterval(flushTimer);
    server.close();
  });

  server.on('message', (msg, rinfo) => {
    const rawString = msg.toString('utf8');
    processSyslogMessage(rawString, rinfo.address, io);
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`📡 [Syslog] NAS Log Receiver listening via UDP on ${address.address}:${address.port}`);
    console.log(`💾 [Syslog] DB buffering enabled — flush every ${FLUSH_INTERVAL_MS / 1000}s, excluding: ${EXCLUDED_EVENTS.join(', ')}`);
  });

  try {
    const bindPort = parseInt(port, 10) || 5514;
    server.bind(bindPort, '0.0.0.0');
    console.log(`📡 [Syslog] Attempting to bind UDP on port ${bindPort}...`);
  } catch (e) {
    console.error(`[Syslog] Failed to bind to port ${port}: ${e.message}`);
  }

  return server;
}

/**
 * Initialize TCP Syslog Server (for Railway / Cloud deployment)
 * NAS sends syslog via TCP; Railway TCP Proxy forwards traffic to this port.
 * TCP syslog messages are newline-delimited (RFC 3164 over TCP).
 */
export function initTcpSyslogServer(io, port = 5514) {
  const server = net.createServer((socket) => {
    const clientAddr = socket.remoteAddress;
    console.log(`📡 [Syslog-TCP] Client connected from ${clientAddr}`);

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString('utf8');

      // Split on newline — TCP syslog messages are newline-delimited
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          processSyslogMessage(trimmed, clientAddr, io);
        }
      }
    });

    socket.on('end', () => {
      // Process any remaining data in buffer
      if (buffer.trim().length > 0) {
        processSyslogMessage(buffer.trim(), clientAddr, io);
      }
      console.log(`📡 [Syslog-TCP] Client disconnected: ${clientAddr}`);
    });

    socket.on('error', (err) => {
      console.error(`📡 [Syslog-TCP] Socket error from ${clientAddr}:`, err.message);
    });
  });

  // Start periodic flush timer
  setInterval(flushLogBuffer, FLUSH_INTERVAL_MS);

  server.on('error', (err) => {
    console.error(`[Syslog-TCP] Server error: ${err.message}`);
  });

  const bindPort = parseInt(port, 10) || 5514;
  server.listen(bindPort, '0.0.0.0', () => {
    console.log(`📡 [Syslog-TCP] NAS Log Receiver listening via TCP on 0.0.0.0:${bindPort}`);
    console.log(`💾 [Syslog-TCP] DB buffering enabled — flush every ${FLUSH_INTERVAL_MS / 1000}s, excluding: ${EXCLUDED_EVENTS.join(', ')}`);
    console.log(`🌐 [Syslog-TCP] Ready for Railway TCP Proxy connections`);
  });

  return server;
}
