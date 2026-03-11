import dgram from 'dgram';

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
    const timeMatch = messageContent.match(/^([A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+/);
    if (timeMatch) {
      const year = new Date().getFullYear();
      const parsed = new Date(`${timeMatch[1]} ${year}`);
      if (!isNaN(parsed.getTime())) {
        result.timestamp = parsed.toISOString();
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

export function initSyslogServer(io, port = 5514) {
  const server = dgram.createSocket('udp4');

  server.on('error', (err) => {
    console.error(`Syslog UDP server error:\n${err.stack}`);
    server.close();
  });

  server.on('message', (msg, rinfo) => {
    const rawString = msg.toString('utf8');
    const parsedObj = parseSyslogMessage(rawString);
    
    // Add sender IP if not already parsed from the message
    if (!parsedObj.ip) {
      parsedObj.ip = rinfo.address;
    }
    parsedObj.senderIp = rinfo.address;
    
    // Broadcast to everyone in 'syslog:nas' room
    const room = io.sockets.adapter.rooms.get('syslog:nas');
    const clientCount = room ? room.size : 0;
    
    io.to('syslog:nas').emit('syslog:new_log', parsedObj);
    
    // Debug logging
    console.log(`📡 [Syslog] ${parsedObj.event || 'unknown'} by ${parsedObj.user || 'N/A'} from ${parsedObj.ip} | Clients: ${clientCount}`);
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`📡 [Syslog] NAS Log Receiver listening via UDP on ${address.address}:${address.port}`);
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
