/**
 * Submission Count Badge Component
 * Component สำหรับแสดงครั้งที่ส่งงาน (submission_count)
 */

import { Badge } from '@mantine/core'

interface SubmissionCountBadgeProps {
  submissionCount: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export default function SubmissionCountBadge({ submissionCount, size = 'md' }: SubmissionCountBadgeProps) {
  return (
    <Badge
      size={size}
      variant="outline"
      style={{
        backgroundColor: '#fff',
        borderColor: '#ff6b35',
        color: '#ff6b35',
      }}
    >
      ครั้งที่ {submissionCount}
    </Badge>
  )
}
