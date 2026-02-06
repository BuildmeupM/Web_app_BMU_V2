/**
 * Comments Section Component
 * Component สำหรับกรอกความคิดเห็น (submission_comment, return_comment)
 */

import { Stack, Text, Textarea } from '@mantine/core'

interface CommentsSectionProps {
  submissionComment: string
  returnComment: string
  onSubmissionCommentChange: (value: string) => void
  onReturnCommentChange: (value: string) => void
  disabled?: boolean
}

export default function CommentsSection({
  submissionComment,
  returnComment,
  onSubmissionCommentChange,
  onReturnCommentChange,
  disabled = false,
}: CommentsSectionProps) {
  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>
        ส่วนการกรอกความคิดเห็น
      </Text>
      <Text size="sm" c="dimmed">
        กรอกความคิดเห็นสำหรับการส่งมอบและส่งคืนงานคีย์
      </Text>

      <Textarea
        label="ความคิดเห็นส่งมอบงานคีย์"
        placeholder="กรอกความคิดเห็นส่งมอบงานคีย์"
        value={submissionComment}
        onChange={(e) => onSubmissionCommentChange(e.target.value)}
        disabled={disabled}
        minRows={3}
      />

      <Textarea
        label="ความคิดเห็นส่งคืนงานคีย์"
        placeholder="กรอกความคิดเห็นส่งคืนงานคีย์"
        value={returnComment}
        onChange={(e) => onReturnCommentChange(e.target.value)}
        disabled={true}
        minRows={3}
        styles={{
          input: {
            backgroundColor: '#f5f5f5',
            cursor: 'not-allowed',
          },
        }}
      />
    </Stack>
  )
}
