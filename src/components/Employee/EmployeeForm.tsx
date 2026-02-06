/**
 * EmployeeForm Component
 * Form สำหรับเพิ่ม/แก้ไขข้อมูลพนักงาน
 */

import { useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  FileButton,
  Button,
  Group,
  Text,
  Accordion,
  Grid,
  PasswordInput,
} from '@mantine/core'
import { DateInput, DateValue } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../../services/employeeService'
import { useAuthStore } from '../../store/authStore'

interface EmployeeFormProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: CreateEmployeeDto | UpdateEmployeeDto) => Promise<void>
  employee?: Employee | null
  mode: 'create' | 'edit'
}

export default function EmployeeForm({
  opened,
  onClose,
  onSubmit,
  employee,
  mode,
}: EmployeeFormProps) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isAdminOrHR = user?.role === 'admin' || (user?.role as string) === 'hr'
  const isEditMode = mode === 'edit'
  const isOwnData = !isAdminOrHR && employee && user?.employee_id === employee.employee_id

  const form = useForm({
    initialValues: {
      employee_id: '',
      position: '',
      id_card: '',
      gender: '' as 'male' | 'female' | 'other' | '',
      first_name: '',
      last_name: '',
      english_name: '',
      nick_name: '',
      birth_date: null as DateValue | null,
      phone: '',
      personal_email: '',
      company_email: '',
      company_email_password: '',
      hire_date: null as DateValue | null,
      probation_end_date: null as DateValue | null,
      resignation_date: null as DateValue | null,
      status: 'active' as 'active' | 'resigned',
      address_full: '',
      village: '',
      building: '',
      room_number: '',
      floor_number: '',
      house_number: '',
      soi_alley: '',
      moo: '',
      road: '',
      sub_district: '',
      district: '',
      province: '',
      postal_code: '',
      profile_image: '',
    },
    validate: {
      employee_id: (value) => (!value ? 'กรุณากรอกรหัสพนักงาน' : null),
      position: (value) => (!value ? 'กรุณากรอกตำแหน่ง' : null),
      id_card: (value) =>
        !value
          ? 'กรุณากรอกรหัสบัตรประชาชน'
          : !/^\d{13}$/.test(value.replace(/-/g, ''))
            ? 'รหัสบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
            : null,
      gender: (value) => (!value ? 'กรุณาเลือกเพศ' : null),
      first_name: (value) => (!value ? 'กรุณากรอกชื่อจริง' : null),
      last_name: (value) => (!value ? 'กรุณากรอกนามสกุล' : null),
      hire_date: (value) => (!value ? 'กรุณาเลือกวันเริ่มงาน' : null),
      personal_email: (value) =>
        value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'รูปแบบอีเมลไม่ถูกต้อง' : null,
      company_email: (value) =>
        value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'รูปแบบอีเมลไม่ถูกต้อง' : null,
      postal_code: (value) =>
        value && !/^\d{5}$/.test(value) ? 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' : null,
    },
  })

  // Helper function to parse date string (YYYY-MM-DD) to Date object
  const parseDate = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null
    // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
    const dateOnly = dateString.split('T')[0] // Get YYYY-MM-DD part only
    const [year, month, day] = dateOnly.split('-').map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    // Create date in local timezone to avoid timezone issues
    const date = new Date(year, month - 1, day)
    return date
  }

  useEffect(() => {
    if (isEditMode && employee && opened) {
      // Populate form with employee data
      form.setValues({
        employee_id: employee.employee_id || '',
        position: employee.position || '',
        id_card: employee.id_card || '',
        gender: employee.gender || '',
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        english_name: employee.english_name || '',
        nick_name: employee.nick_name || '',
        birth_date: parseDate(employee.birth_date),
        phone: employee.phone || '',
        personal_email: employee.personal_email || '',
        company_email: employee.company_email || '',
        company_email_password: '', // Don't load password
        hire_date: parseDate(employee.hire_date),
        probation_end_date: parseDate(employee.probation_end_date),
        resignation_date: parseDate(employee.resignation_date),
        status: employee.status || 'active',
        address_full: employee.address_full || '',
        village: employee.village || '',
        building: employee.building || '',
        room_number: employee.room_number || '',
        floor_number: employee.floor_number || '',
        house_number: employee.house_number || '',
        soi_alley: employee.soi_alley || '',
        moo: employee.moo || '',
        road: employee.road || '',
        sub_district: employee.sub_district || '',
        district: employee.district || '',
        province: employee.province || '',
        postal_code: employee.postal_code || '',
        profile_image: employee.profile_image || '',
      })
    } else if (!isEditMode && opened) {
      // Reset form for create mode
      form.reset()
    }
  }, [employee, isEditMode, opened])

  const handleSubmit = async (values: typeof form.values) => {
    // Helper function to format date as YYYY-MM-DD in local timezone (not UTC)
    const formatLocalDate = (date: Date | null): string | null => {
      if (!date) return null
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    try {
      const submitData: any = {
        ...values,
        id_card: values.id_card.replace(/-/g, ''),
        birth_date: formatLocalDate(values.birth_date),
        hire_date: formatLocalDate(values.hire_date),
        probation_end_date: formatLocalDate(values.probation_end_date),
        resignation_date: formatLocalDate(values.resignation_date),
      }

      // Remove empty strings
      Object.keys(submitData).forEach((key) => {
        if (submitData[key] === '') {
          submitData[key] = null
        }
      })

      // For employee editing own data, only send allowed fields
      if (isOwnData) {
        const allowedFields = [
          'phone',
          'personal_email',
          'address_full',
          'village',
          'building',
          'room_number',
          'floor_number',
          'house_number',
          'soi_alley',
          'moo',
          'road',
          'sub_district',
          'district',
          'province',
          'postal_code',
          'profile_image',
        ]
        const filteredData: any = {}
        allowedFields.forEach((field) => {
          if (submitData[field] !== undefined) {
            filteredData[field] = submitData[field]
          }
        })
        await onSubmit(filteredData)
      } else {
        await onSubmit(submitData)
      }

      // Show success notification
      notifications.show({
        title: isEditMode ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มพนักงานสำเร็จ',
        message: isEditMode ? 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว' : 'เพิ่มข้อมูลพนักงานใหม่เรียบร้อยแล้ว',
        color: 'green',
        autoClose: 3000,
      })

      form.reset()
      onClose()
    } catch (error: any) {
      console.error('Form submit error:', error)

      // Show error notification to user
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'

      notifications.show({
        title: 'ไม่สามารถบันทึกข้อมูลได้',
        message: errorMessage,
        color: 'red',
        autoClose: 5000,
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
      size="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          {/* Basic Information */}
          <Accordion multiple defaultValue={isAdmin ? ['basic', 'employment'] : ['basic']}>
            <Accordion.Item value="basic">
              <Accordion.Control>ข้อมูลพื้นฐาน</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="รหัสพนักงาน"
                        placeholder="AC00010"
                        withAsterisk
                        disabled={isEditMode}
                        {...form.getInputProps('employee_id')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="ตำแหน่ง"
                        placeholder="ผู้จัดการ"
                        withAsterisk
                        disabled={!isAdmin && isEditMode}
                        {...form.getInputProps('position')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="รหัสบัตรประชาชน"
                        placeholder="1234567890123"
                        withAsterisk
                        disabled={isEditMode}
                        maxLength={13}
                        {...form.getInputProps('id_card')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="เพศ"
                        placeholder="เลือกเพศ"
                        withAsterisk
                        disabled={!isAdmin && isEditMode}
                        data={[
                          { value: 'male', label: 'ชาย' },
                          { value: 'female', label: 'หญิง' },
                          { value: 'other', label: 'อื่นๆ' },
                        ]}
                        {...form.getInputProps('gender')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="ชื่อจริง"
                        placeholder="ยุทธนา"
                        withAsterisk
                        disabled={!isAdmin && isEditMode}
                        {...form.getInputProps('first_name')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="นามสกุล"
                        placeholder="(เอ็ม)"
                        withAsterisk
                        disabled={!isAdmin && isEditMode}
                        {...form.getInputProps('last_name')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="ชื่อภาษาอังกฤษ"
                        placeholder="Yuttana"
                        disabled={!isAdmin && isEditMode}
                        {...form.getInputProps('english_name')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="ชื่อเล่น"
                        placeholder="เอ็ม"
                        disabled={!isAdmin && isEditMode}
                        {...form.getInputProps('nick_name')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <DateInput
                        label="วันเกิด"
                        placeholder="เลือกวันเกิด"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('birth_date')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Contact Information */}
            <Accordion.Item value="contact">
              <Accordion.Control>ข้อมูลการติดต่อ</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="เบอร์โทร"
                        placeholder="0812345678"
                        {...form.getInputProps('phone')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="อีเมลส่วนตัว"
                        placeholder="personal@email.com"
                        type="email"
                        {...form.getInputProps('personal_email')}
                      />
                    </Grid.Col>
                    {isAdmin && (
                      <>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="อีเมลบริษัท"
                            placeholder="employee@bmu.local"
                            type="email"
                            disabled={isEditMode}
                            {...form.getInputProps('company_email')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <PasswordInput
                            label="รหัสผ่านอีเมลบริษัท"
                            placeholder="••••••••"
                            {...form.getInputProps('company_email_password')}
                          />
                        </Grid.Col>
                      </>
                    )}
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Employment Information - Visible for all in edit mode, but only editable by Admin/HR */}
            {isEditMode && (
              <Accordion.Item value="employment">
                <Accordion.Control>ข้อมูลการทำงาน</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <DateInput
                          label="วันเริ่มงาน"
                          placeholder="เลือกวันเริ่มงาน"
                          withAsterisk
                          disabled={!isAdminOrHR}
                          valueFormat="DD/MM/YYYY"
                          {...form.getInputProps('hire_date')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <DateInput
                          label="วันผ่านงาน"
                          placeholder="เลือกวันผ่านงาน"
                          disabled={!isAdminOrHR}
                          valueFormat="DD/MM/YYYY"
                          {...form.getInputProps('probation_end_date')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <DateInput
                          label="วันสิ้นสุด"
                          placeholder="เลือกวันสิ้นสุด"
                          disabled={!isAdminOrHR}
                          valueFormat="DD/MM/YYYY"
                          {...form.getInputProps('resignation_date')}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Select
                          label="สถานะงาน"
                          withAsterisk
                          disabled={!isAdminOrHR}
                          data={[
                            { value: 'active', label: 'ทำงานอยู่' },
                            { value: 'resigned', label: 'ลาออก' },
                          ]}
                          {...form.getInputProps('status')}
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Address Information */}
            <Accordion.Item value="address">
              <Accordion.Control>ที่อยู่</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Group align="flex-end" gap="sm">
                    <Textarea
                      label="ที่อยู่รวม"
                      placeholder="123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร 10110"
                      rows={3}
                      style={{ flex: 1 }}
                      {...form.getInputProps('address_full')}
                    />
                    <Button
                      variant="light"
                      color="orange"
                      onClick={() => {
                        const fullAddress = form.values.address_full
                        if (!fullAddress) return

                        // Parse Thai address - improved version
                        const parsed: Record<string, string> = {}
                        let addr = fullAddress.trim()

                        // Extract postal code (5 digits, may have รหัสไปรษณีย์ prefix)
                        const postalMatch = addr.match(/(?:รหัสไปรษณีย์\s*)?(\d{5})(?:\s*$)/)
                        if (postalMatch) {
                          parsed.postal_code = postalMatch[1]
                          // Remove postal code part for cleaner parsing
                          addr = addr.replace(/(?:รหัสไปรษณีย์\s*)?\d{5}\s*$/, '').trim()
                        }

                        // Extract province (จังหวัด or กรุงเทพมหานคร)
                        const provincePatterns = [
                          /(?:จังหวัด|จ\.?)\s*([ก-๙]+)/,
                          /(กรุงเทพมหานคร|กรุงเทพฯ|กทม\.?)/,
                        ]
                        for (const pattern of provincePatterns) {
                          const match = addr.match(pattern)
                          if (match) {
                            parsed.province = match[1].trim()
                            break
                          }
                        }

                        // Extract district (อำเภอ/เขต)
                        const districtMatch = addr.match(/(?:อำเภอ|อ\.|เขต)(?:\/เขต)?\s*([ก-๙]+)/)
                        if (districtMatch) {
                          parsed.district = districtMatch[1].trim()
                        }

                        // Extract sub-district (ตำบล/แขวง)
                        const subDistrictMatch = addr.match(/(?:ตำบล|ต\.|แขวง)(?:\/ตำบล)?\s*([ก-๙]+)/)
                        if (subDistrictMatch) {
                          parsed.sub_district = subDistrictMatch[1].trim()
                        }

                        // Extract road (ถนน)
                        const roadMatch = addr.match(/(?:ถนน|ถ\.)\s*([ก-๙a-zA-Z0-9\s]+?)(?=\s*(?:แขวง|ตำบล|ต\.|เขต|อำเภอ|อ\.|$))/)
                        if (roadMatch) {
                          parsed.road = roadMatch[1].trim()
                        }

                        // Extract soi (ซอย)
                        const soiMatch = addr.match(/(?:ซอย|ซ\.)\s*([ก-๙a-zA-Z0-9\s\/]+?)(?=\s*(?:ถนน|ถ\.|แขวง|ตำบล|$))/)
                        if (soiMatch) {
                          parsed.soi_alley = soiMatch[1].trim()
                        }

                        // Extract moo (หมู่ที่)
                        const mooMatch = addr.match(/(?:หมู่ที่|หมู่|ม\.)\s*(\d+)/)
                        if (mooMatch) {
                          parsed.moo = mooMatch[1]
                        }

                        // Extract house number (เลขที่ or starting number)
                        const houseMatch = addr.match(/(?:เลขที่\s*)?(\d+(?:\/\d+)?(?:-\d+)?)(?=\s|$)/)
                        if (houseMatch) {
                          parsed.house_number = houseMatch[1]
                        }

                        // Set parsed values to form
                        Object.entries(parsed).forEach(([key, value]) => {
                          if (value) {
                            form.setFieldValue(key, value)
                          }
                        })
                      }}
                      style={{ marginBottom: '1.8rem' }}
                    >
                      กระจายที่อยู่
                    </Button>
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="หมู่บ้าน" {...form.getInputProps('village')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="อาคาร" {...form.getInputProps('building')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput label="ห้องเลขที่" {...form.getInputProps('room_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput label="ชั้นที่" {...form.getInputProps('floor_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput label="เลขที่" {...form.getInputProps('house_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="ซอย/ตรอก" {...form.getInputProps('soi_alley')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="หมู่ที่" {...form.getInputProps('moo')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="ถนน" {...form.getInputProps('road')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="แขวง/ตำบล" {...form.getInputProps('sub_district')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="อำเภอ/เขต" {...form.getInputProps('district')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput label="จังหวัด" {...form.getInputProps('province')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="รหัสไปรษณีย์"
                        placeholder="10110"
                        maxLength={5}
                        {...form.getInputProps('postal_code')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {/* Profile Image */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              รูปภาพพนักงาน
            </Text>
            <Group>
              <TextInput
                placeholder="URL หรือ path ของรูปภาพ"
                style={{ flex: 1 }}
                {...form.getInputProps('profile_image')}
              />
              <FileButton
                accept="image/*"
                onChange={(file) => {
                  // TODO: Upload file and get URL
                  if (file) {
                    // For now, just set filename
                    form.setFieldValue('profile_image', file.name)
                  }
                }}
              >
                {(props) => <Button {...props}>เลือกรูปภาพ</Button>}
              </FileButton>
            </Group>
          </div>

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={false}>
              {isEditMode ? 'บันทึก' : 'เพิ่มพนักงาน'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
