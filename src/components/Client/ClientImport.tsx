/**
 * ClientImport Component
 * Component สำหรับนำเข้าข้อมูลลูกค้าจาก Excel
 */

import { useState } from 'react'
import {
  Modal,
  Stack,
  Button,
  Text,
  FileButton,
  Progress,
  Alert,
  Table,
  Group,
  Accordion,
  Anchor,
  List,
  Paper,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Code,
} from '@mantine/core'
import { TbUpload, TbAlertCircle, TbCheck, TbDownload, TbInfoCircle } from 'react-icons/tb'
import { useMutation, useQueryClient } from 'react-query'
import api from '../../services/api'

interface ClientImportProps {
  opened: boolean
  onClose: () => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  updated?: number
  skipped?: number
  errors: Array<{
    row: number
    build: string
    error: string
  }>
  warnings?: Array<{
    row: number
    build: string
    warning: string
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

export default function ClientImport({ opened, onClose }: ClientImportProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [previewData, setPreviewData] = useState<unknown[]>([])
  const [importing, setImporting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Import mutation
  const importMutation = useMutation(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post<{ success: boolean; message: string; data: ImportResult }>(
        '/clients/import',
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
        queryClient.invalidateQueries(['clients'])
        setFile(null)
        setPreviewData([])
      },
    }
  )

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return

    setFile(selectedFile)
    setValidationResult(null)
    setPreviewData([])

    // Validate file immediately
    setValidating(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await api.post<{ success: boolean; data: ValidationResult }>(
        '/clients/import/validate',
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
    const templateUrl = '/templates/client_import_template.xlsx'
    const link = document.createElement('a')
    link.href = templateUrl
    link.download = 'client_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="นำเข้าข้อมูลลูกค้าจาก Excel" size="xl">
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
                      <strong>ขั้นตอนที่ 2:</strong> กรอกข้อมูลลูกค้าใน Excel ตามรูปแบบที่กำหนด
                    </List.Item>
                    <List.Item>
                      <strong>ขั้นตอนที่ 3:</strong> ตรวจสอบข้อมูลให้ถูกต้อง (Build Code และชื่อบริษัท ต้องกรอก)
                    </List.Item>
                    <List.Item>
                      <strong>ขั้นตอนที่ 4:</strong> บันทึกไฟล์และอัพโหลด
                    </List.Item>
                  </List>
                  <Alert color="blue" mt="xs">
                    <Text size="xs">
                      <strong>Required Fields (บังคับกรอก):</strong> Build Code, ชื่อบริษัท
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>รูปแบบวันที่:</strong> YYYY-MM-DD (เช่น: 2024-01-15) หรือ Excel Date Format
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>ประเภทกิจการ:</strong> บริษัทจำกัด, บริษัทมหาชนจำกัด, ห้างหุ้นส่วน
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>สถานะบริษัท:</strong> รายเดือน, รายเดือน / วางมือ, รายเดือน / จ่ายรายปี, รายเดือน / เดือนสุดท้าย, ยกเลิกทำ
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>ไซต์บริษัท:</strong> SS, S, MM, M, LL, L, XL, XXL
                    </Text>
                    <Text size="xs" mt="xs">
                      <strong>สถานะจดภาษีมูลค่าเพิ่ม:</strong> จดภาษีมูลค่าเพิ่ม, ยังไม่จดภาษีมูลค่าเพิ่ม
                    </Text>
                  </Alert>
                  <Anchor
                    href="/Documentation/Client/EXCEL_TEMPLATE_GUIDE.md"
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
              <Alert color="orange" title="⚠️ คำเตือน - ข้อมูลที่ซ้ำกัน">
                <Stack gap="xs">
                  <Text size="sm">
                    พบข้อมูลที่ซ้ำกัน {validationResult.warnings.length} รายการ 
                    ระบบจะนำเข้าข้อมูลได้ แต่จะอัพเดทหรือข้ามข้อมูลที่ซ้ำกัน
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
                  <Text size="xs" c="dimmed" mt="xs">
                    💡 คุณสามารถนำเข้าข้อมูลได้ และแก้ไขข้อมูลทีหลังได้ในหน้า "ข้อมูลลูกค้า"
                  </Text>
                </Stack>
              </Alert>
            )}
          </Stack>
        )}

        {/* Import Progress */}
        {importing && (
          <div>
            <Text size="sm" mb="xs">
              กำลังนำเข้าข้อมูล...
            </Text>
            <Progress value={50} animated />
          </div>
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

            {/* Warnings Section */}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <Alert color="orange" title="⚠️ คำเตือน - ข้อมูลที่ซ้ำกัน">
                <Stack gap="xs">
                  <Text size="sm">
                    พบข้อมูลที่ซ้ำกัน {importResult.warnings.length} รายการ 
                    ระบบได้อัพเดทหรือข้ามข้อมูลที่ซ้ำกันแล้ว
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
                        {importResult.warnings.map((warning, index) => (
                          <Table.Tr key={index}>
                            <Table.Td>{warning.row}</Table.Td>
                            <Table.Td>{warning.build}</Table.Td>
                            <Table.Td>
                              <Text size="sm" c="orange">
                                {warning.warning}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                  <Text size="xs" c="dimmed" mt="xs">
                    💡 คุณสามารถแก้ไขข้อมูลได้ในหน้า "ข้อมูลลูกค้า"
                  </Text>
                </Stack>
              </Alert>
            )}
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
            color={validationResult && validationResult.warnings && validationResult.warnings.length > 0 ? 'orange' : undefined}
          >
            {validationResult && validationResult.warnings && validationResult.warnings.length > 0
              ? 'นำเข้าข้อมูล (มีคำเตือน)'
              : 'นำเข้าข้อมูล'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
