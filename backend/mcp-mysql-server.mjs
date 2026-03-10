#!/usr/bin/env node
/* global process */
/**
 * Custom MCP MySQL Server for BMU Work Management
 * Uses mysql2 package already installed in backend
 * Protocol: JSON-RPC 2.0 over stdio (MCP standard)
 */

import mysql from 'mysql2/promise'
import readline from 'readline'

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DB || 'bmu_work_management',
  charset: 'utf8mb4',
  timezone: '+07:00',
}

let pool = null

async function getPool() {
  if (!pool) {
    pool = await mysql.createPool({ ...DB_CONFIG, connectionLimit: 5 })
  }
  return pool
}

async function executeQuery(sql) {
  const db = await getPool()
  const [rows] = await db.execute(sql)
  return rows
}

function sendResponse(id, result) {
  const response = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(response + '\n')
}

function sendError(id, code, message) {
  const response = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })
  process.stdout.write(response + '\n')
}

const TOOLS = [
  {
    name: 'mysql_query',
    description: 'Run a SQL SELECT/INSERT/UPDATE query against the BMU Work Management MySQL database',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'The SQL query to execute' },
      },
      required: ['sql'],
    },
  },
]

async function handleRequest(request) {
  const { id, method, params } = request

  switch (method) {
    case 'initialize':
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'bmu-mysql-mcp', version: '1.0.0' },
      })
      break

    case 'tools/list':
      sendResponse(id, { tools: TOOLS })
      break

    case 'tools/call': {
      const { name, arguments: args } = params
      if (name !== 'mysql_query') {
        sendError(id, -32601, `Unknown tool: ${name}`)
        return
      }

      const sql = args?.sql?.trim()
      if (!sql) {
        sendError(id, -32602, 'sql parameter is required')
        return
      }

      // Safety: block destructive operations
      const upperSql = sql.toUpperCase()
      if (upperSql.startsWith('DROP') || upperSql.startsWith('TRUNCATE')) {
        sendError(id, -32602, 'DROP and TRUNCATE are not allowed')
        return
      }

      try {
        const rows = await executeQuery(sql)
        const content = [
          {
            type: 'text',
            text: JSON.stringify(rows, null, 2),
          },
        ]
        sendResponse(id, { content })
      } catch (err) {
        sendError(id, -32603, `Query error: ${err.message}`)
      }
      break
    }

    case 'notifications/initialized':
      // no response needed
      break

    default:
      sendError(id, -32601, `Method not found: ${method}`)
  }
}

// Read line-by-line from stdin (MCP uses newline-delimited JSON)
const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    const request = JSON.parse(trimmed)
    await handleRequest(request)
  } catch (err) {
    process.stderr.write(`Parse error: ${err.message}\n`)
  }
})

rl.on('close', async () => {
  if (pool) await pool.end()
  process.exit(0)
})

process.on('SIGINT', async () => {
  if (pool) await pool.end()
  process.exit(0)
})
