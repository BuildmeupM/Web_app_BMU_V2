/**
 * WorkAssignmentImport Component
 * Component สำหรับนำเข้าข้อมูลการจัดงานรายเดือนจาก Excel
 */

import { useState } from 'react'
import {
  Modal,
  Stack,
  Button,
  Text,
  FileButton,
  Alert,
  Table,
  Group,
  Accordion,
  Anchor,
  List,
  Paper,
} from '@mantine/core'
import { TbUpload, TbAlertCircle, TbCheck, TbDownload, TbInfoCircle } from 'react-icons/tb'
import { useMutation, useQueryClient } from 'react-query'
import api from '../../services/api'

interface WorkAssignmentImportProps {
  opened: boolean
  onClose: () => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  updated?: number
  errors: Array<{
    row: number
    build: string
    error: string
  }>
  warnings?: Array<{
    row: number
    build: string
    warnings: string[]
  }>
}

interface ValidationResult {
  total: number
  valid: number
  invalid: number
  errors: Array<{
    row: number
    build: string
    missingFields: string[]
    errors: string[]
    warnings?: string[]
  }>
  warnings?: Array<{
    row: number
    build: string
    warnings: string[]
  }>
}

export default function WorkAssignmentImport({ opened, onClose }: WorkAssignmentImportProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Import mutation
  const importMutation = useMutation(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post<{ success: boolean; message: string; data: ImportResult }>(
        '/work-assignments/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      return response.data.data
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onSuccess: (data) => {
        // Invalidate และ refetch ทุก query ที่เกี่ยวข้องกับ work-assignments
        queryClient.invalidateQueries(['work-assignments'])
        // Force refetch เพื่อให้ข้อมูลใหม่แสดงทันที
        queryClient.refetchQueries(['work-assignments'], { active: true })
        setFile(null)
        setValidationResult(null)
      },
    }
  )

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return

    setFile(selectedFile)
    setValidationResult(null)

    // Validate file immediately
    setValidating(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await api.post<{ success: boolean; data: ValidationResult }>(
        '/work-assignments/import/validate',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setValidationResult(response.data.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Validation error:', error)
      
      // Check if it's a network error
      const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
      const errorMessage = isNetworkError
        ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001'
        : error?.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์'
      
      // Show error alert
      setValidationResult({
        total: 0,
        valid: 0,
        invalid: 1,
        errors: [
          {
            row: 0,
            build: '',
            missingFields: [],
            errors: [errorMessage],
          },
        ],
      })
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    try {
      await importMutation.mutateAsync(file)
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setImporting(false)
    }
  }

  const importResult = importMutation.data

  const handleDownloadTemplate = () => {
    // Create download link for template
    const templateUrl = '/templates/work_assignment_import_template.xlsx'
    const link = document.createElement('a')
    link.href = templateUrl
    link.download = 'work_assignment_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="นำเข้าข้อมูลการจัดงานรายเดือนจาก Excel" size="xl">
      <Stack gap="md">
        {/* Instructions */}
        <Paper p="md" withBorder>
          <Group mb="xs">
            <TbInfoCircle size={20} color="var(--mantine-color-blue-6)" />
            <Text size="sm" fw={500}>
              วิธีใช้งาน
            </Text>
          </Group>
          <Accordion>
            <Accordion.Item value="instructions">
              <Accordion.Control>
                <Text size="sm">📋 คู่มือการกรอกข้อมูล Excel</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="sm">ก่อนนำเข้าข้อมูล กรุณาดาวน์โหลด Template และทำตามขั้นตอน:</Text>
                  <List size="sm" spacing="xs">
                    <List.Item>
                      <strong>ขั้นตอนที่ 1:</strong> ดาวน์โหลด Template โดยคลิกปุ่ม "ดาวน์โหลด Template" ด้านล่าง
                    </List.Item>
                    <List.Item>
                      <strong>ขั้นตอนที่ 2:</strong> กรอกข้อมูลการจัดงานใน Excel ตามรูปแบบที่กำหนด
                    </List.Item>
                    <List.Item>
                      <strong>ขั้นตอนที่ 3:</strong> ตรวจสอบข้อมูลให้ถูกต้อง (Build Code, ปีภาษี, เดือนภาษี ต้องกรอก)
                    </List.Item>
                    <List.Item>
                      <strong>ขั้นตอนที่ 4:</strong> บันทึกไฟล์และอัพโหลด
                    </List.Item>
                  </List>
                  <Alert color="blue" mt="xs">
                    <Text size="xs">
                      <strong>Required Fields (บังคับกรอก):</strong> Build Code, ปีภาษี, เดือนภาษี
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>ปีภาษี:</strong> ตัวเลขระหว่าง 2000-2100 (เช่น 2026)
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>เดือนภาษี:</strong> ตัวเลขระหว่าง 1-12 (เช่น 1 = มกราคม, 12 = ธันวาคม)
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>รหัสพนักงาน:</strong> รหัสพนักงานที่รับผิดชอบแต่ละหน้าที่ (เช่น AC00034)
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>หมายเหตุ:</strong> หมายเหตุเพิ่มเติม (ไม่บังคับ)
                    </Text>
                  </Alert>
                  <Anchor
                    href="/Documentation/WorkAssignment/EXCEL_TEMPLATE_GUIDE.md"
                    target="_blank"
                    size="xs"
                    mt="xs"
                  >
                    📖 อ่านคู่มือฉบับเต็ม
                  </Anchor>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Paper>

        {/* Download Template */}
        <Group>
          <Button
            variant="light"
            leftSection={<TbDownload size={16} />}
            onClick={handleDownloadTemplate}
          >
            ดาวน์โหลด Template
          </Button>
          <Text size="xs" c="dimmed">
            ดาวน์โหลดไฟล์ Excel template สำหรับกรอกข้อมูล
          </Text>
        </Group>

        {/* File Upload */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            เลือกไฟล์ Excel
          </Text>
          <Group>
            <FileButton
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
              disabled={importing || validating}
            >
              {(props) => (
                <Button leftSection={<TbUpload size={16} />} {...props} loading={validating}>
                  เลือกไฟล์
                </Button>
              )}
            </FileButton>
            {file && (
              <Text size="sm" c="dimmed">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </Text>
            )}
          </Group>
        </div>

        {/* Validation Results */}
        {validating && (
          <Alert color="blue">
            <Text size="sm">กำลังตรวจสอบข้อมูล...</Text>
          </Alert>
        )}

        {/* Network Error Alert */}
        {validationResult && validationResult.errors.length > 0 && 
         validationResult.errors[0]?.errors?.some((e: string) => e.includes('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')) && (
          <Alert color="red" icon={<TbAlertCircle size={16} />} title="ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์">
            <Stack gap="xs">
              <Text size="sm">
                กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ <strong>http://localhost:3001</strong>
              </Text>
              <Text size="xs" c="dimmed">
                วิธีรัน Backend Server:
              </Text>
              <List size="xs" spacing="xs">
                <List.Item>เปิด Terminal/Command Prompt</List.Item>
                <List.Item>เข้าไปที่โฟลเดอร์ backend: <code>cd backend</code></List.Item>
                <List.Item>รันคำสั่ง: <code>npm run dev</code> หรือ <code>npm start</code></List.Item>
              </List>
            </Stack>
          </Alert>
        )}

        {validationResult && (
          <Stack gap="md">
            <Alert
              icon={validationResult.invalid === 0 ? <TbCheck size={16} /> : <TbAlertCircle size={16} />}
              color={validationResult.invalid === 0 ? 'green' : 'yellow'}
              title="ผลการตรวจสอบข้อมูล"
            >
              <Stack gap="xs">
                <Text size="sm">
                  รวมทั้งหมด: {validationResult.total} รายการ | ถูกต้อง: {validationResult.valid} | 
                  {validationResult.invalid > 0 && (
                    <Text component="span" c="red" fw={500}>
                      {' '}ไม่ถูกต้อง: {validationResult.invalid}
                    </Text>
                  )}
                </Text>
                {validationResult.errors.length > 0 && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">
                      รายการข้อมูลที่ไม่ครบ:
                    </Text>
                    <Table.ScrollContainer minWidth={600}>
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>แถว</Table.Th>
                            <Table.Th>Build Code</Table.Th>
                            <Table.Th>ข้อมูลที่ไม่ครบ</Table.Th>
                            <Table.Th>ข้อผิดพลาดอื่นๆ</Table.Th>
                            <Table.Th>คำเตือน</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {validationResult.errors.map((error, index) => (
                            <Table.Tr key={index}>
                              <Table.Td>{error.row}</Table.Td>
                              <Table.Td>{error.build || '-'}</Table.Td>
                              <Table.Td>
                                {error.missingFields.length > 0 ? (
                                  <Text size="sm" c="red">
                                    {error.missingFields.join(', ')}
                                  </Text>
                                ) : (
                                  <Text size="sm" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                {error.errors.length > 0 ? (
                                  <Text size="sm" c="red">
                                    {error.errors.join(', ')}
                                  </Text>
                                ) : (
                                  <Text size="sm" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                {error.warnings && error.warnings.length > 0 ? (
                                  <Text size="sm" c="orange">
                                    {error.warnings.join(', ')}
                                  </Text>
                                ) : (
                                  <Text size="sm" c="dimmed">-</Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </div>
                )}
                {validationResult.invalid === 0 && (
                  <Text size="sm" c="green" fw={500}>
                    ✅ ข้อมูลครบถ้วนทั้งหมด พร้อมนำเข้าข้อมูล
                  </Text>
                )}
              </Stack>
            </Alert>

            {/* Warnings Section */}
            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <Alert color="orange" title="⚠️ คำเตือน">
                <Stack gap="xs">
                  <Text size="sm">
                    พบคำเตือน {validationResult.warnings.length} รายการ
                  </Text>
                  <Table.ScrollContainer minWidth={600}>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>แถว</Table.Th>
                          <Table.Th>Build Code</Table.Th>
                          <Table.Th>คำเตือน</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {validationResult.warnings.map((warning, index) => (
                          <Table.Tr key={index}>
                            <Table.Td>{warning.row}</Table.Td>
                            <Table.Td>{warning.build}</Table.Td>
                            <Table.Td>
                              <Text size="sm" c="orange">
                                {warning.warnings.join(', ')}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </Stack>
              </Alert>
            )}
          </Stack>
        )}

        {/* Import Results */}
        {importResult && (
          <Stack gap="md">
            <Alert
              icon={importResult.failed === 0 ? <TbCheck size={16} /> : <TbAlertCircle size={16} />}
              color={importResult.failed === 0 ? 'green' : 'yellow'}
              title="ผลการนำเข้า"
            >
              <Stack gap="xs">
                <Text>
                  รวมทั้งหมด: {importResult.total} รายการ | 
                  {' '}สร้างใหม่: {importResult.success - (importResult.updated || 0)} | 
                  {importResult.updated && importResult.updated > 0 && (
                    <Text component="span" c="blue">
                      {' '}อัพเดท: {importResult.updated} | 
                    </Text>
                  )}
                  {' '}ล้มเหลว: {importResult.failed}
                </Text>
                {importResult.errors.length > 0 && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">
                      ข้อผิดพลาด:
                    </Text>
                    <Table.ScrollContainer minWidth={400}>
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>แถว</Table.Th>
                            <Table.Th>Build Code</Table.Th>
                            <Table.Th>ข้อผิดพลาด</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {importResult.errors.map((error, index) => (
                            <Table.Tr key={index}>
                              <Table.Td>{error.row}</Table.Td>
                              <Table.Td>{error.build}</Table.Td>
                              <Table.Td>
                                <Text size="sm" c="red">
                                  {error.error}
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </div>
                )}
              </Stack>
            </Alert>
          </Stack>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={importing}>
            ปิด
          </Button>
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={!file || importing || validating || !!(validationResult && validationResult.invalid > 0)}
            leftSection={<TbUpload size={16} />}
          >
            นำเข้าข้อมูล
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
