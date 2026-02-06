/**
 * Queue Service
 * Simple in-memory queue system สำหรับ background processing
 * 
 * Features:
 * - Add jobs to queue
 * - Process jobs in background
 * - Track job status (pending, processing, completed, failed)
 * - Return job ID immediately for polling
 * 
 * Note: สำหรับ production scale, พิจารณาใช้ Redis-based queue (BullMQ) แทน
 */

/**
 * Job Status
 */
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

/**
 * Job Store
 * In-memory storage for jobs
 */
const jobs = new Map() // Map<jobId, job>
const queue = [] // Array of job IDs (FIFO queue)

/**
 * Generate unique job ID
 */
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a new job and add to queue
 * @param {string} type - Job type (e.g., 'bulk-assignment', 'excel-import')
 * @param {object} data - Job data
 * @param {function} processor - Async function to process the job
 * @returns {string} Job ID
 */
export function addJob(type, data, processor) {
  const jobId = generateJobId()
  const job = {
    id: jobId,
    type,
    data,
    processor,
    status: JOB_STATUS.PENDING,
    progress: 0,
    total: 0,
    result: null,
    error: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  }

  jobs.set(jobId, job)
  queue.push(jobId)

  // Start processing if queue is not busy
  processQueue()

  return jobId
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {object|null} Job object or null if not found
 */
export function getJob(jobId) {
  return jobs.get(jobId) || null
}

/**
 * Process queue (process one job at a time)
 */
let isProcessing = false

async function processQueue() {
  // Skip if already processing
  if (isProcessing || queue.length === 0) {
    return
  }

  isProcessing = true

  while (queue.length > 0) {
    const jobId = queue.shift()
    const job = jobs.get(jobId)

    if (!job) {
      continue
    }

    // Skip if job is not pending
    if (job.status !== JOB_STATUS.PENDING) {
      continue
    }

    // Update job status to processing
    job.status = JOB_STATUS.PROCESSING
    job.startedAt = new Date()

    try {
      // Process job with progress callback
      const updateProgress = (current, total) => {
        job.progress = current
        job.total = total
      }

      // Call processor function
      const result = await job.processor(job.data, updateProgress)

      // Update job status to completed
      job.status = JOB_STATUS.COMPLETED
      job.result = result
      job.completedAt = new Date()
      job.progress = job.total // Ensure progress is 100%
    } catch (error) {
      // Update job status to failed
      job.status = JOB_STATUS.FAILED
      job.error = {
        message: error.message,
        stack: error.stack,
      }
      job.completedAt = new Date()
    }
  }

  isProcessing = false
}

/**
 * Clean up old completed/failed jobs (older than 1 hour)
 */
export function cleanupOldJobs() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  for (const [jobId, job] of jobs.entries()) {
    if (
      (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) &&
      job.completedAt &&
      job.completedAt < oneHourAgo
    ) {
      jobs.delete(jobId)
    }
  }
}

// Clean up old jobs every 30 minutes
setInterval(cleanupOldJobs, 30 * 60 * 1000)

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const stats = {
    total: jobs.size,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  }

  for (const job of jobs.values()) {
    stats[job.status] = (stats[job.status] || 0) + 1
  }

  return stats
}

export default {
  addJob,
  getJob,
  getQueueStats,
  JOB_STATUS,
}
