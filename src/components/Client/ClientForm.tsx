/**
 * ClientForm Component
 * Form สำหรับเพิ่ม/แก้ไขข้อมูลลูกค้า
 */

import { useEffect } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Grid,
  Accordion,
} from '@mantine/core'
import { DateInput, DateValue } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { Client } from '../../services/clientsService'

interface ClientFormProps {
  opened: boolean
  onClose: () => void
  onSubmit: (data: Partial<Client>) => Promise<void>
  client?: Client | null
  mode: 'create' | 'edit'
}

const businessTypeOptions = [
  { value: 'บริษัทจำกัด', label: 'บริษัทจำกัด' },
  { value: 'บริษัทมหาชนจำกัด', label: 'บริษัทมหาชนจำกัด' },
  { value: 'ห้างหุ้นส่วน', label: 'ห้างหุ้นส่วน' },
]

const companyStatusOptions = [
  { value: 'รายเดือน', label: 'รายเดือน' },
  { value: 'รายเดือน / วางมือ', label: 'รายเดือน / วางมือ' },
  { value: 'รายเดือน / จ่ายรายปี', label: 'รายเดือน / จ่ายรายปี' },
  { value: 'รายเดือน / เดือนสุดท้าย', label: 'รายเดือน / เดือนสุดท้าย' },
  { value: 'ยกเลิกทำ', label: 'ยกเลิกทำ' },
]

const companySizeOptions = [
  { value: 'SS', label: 'SS' },
  { value: 'S', label: 'S' },
  { value: 'MM', label: 'MM' },
  { value: 'M', label: 'M' },
  { value: 'LL', label: 'LL' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
]

const taxRegistrationStatusOptions = [
  { value: 'จดภาษีมูลค่าเพิ่ม', label: 'จดภาษีมูลค่าเพิ่ม' },
  { value: 'ยังไม่จดภาษีมูลค่าเพิ่ม', label: 'ยังไม่จดภาษีมูลค่าเพิ่ม' },
]

export default function ClientForm({
  opened,
  onClose,
  onSubmit,
  client,
  mode,
}: ClientFormProps) {
  const isEditMode = mode === 'edit'

  const form = useForm({
    initialValues: {
      build: '',
      business_type: '',
      company_name: '',
      legal_entity_number: '',
      establishment_date: null as DateValue | null,
      business_category: '',
      business_subcategory: '',
      company_size: '',
      tax_registration_status: '',
      vat_registration_date: null as DateValue | null,
      full_address: '',
      village: '',
      building: '',
      room_number: '',
      floor_number: '',
      address_number: '',
      soi: '',
      moo: '',
      road: '',
      subdistrict: '',
      district: '',
      province: '',
      postal_code: '',
      company_status: 'รายเดือน',
    },
    validate: {
      build: (value) => {
        if (!value) return 'กรุณากรอก Build code'
        // Build Code can be:
        // - Pure numbers: at least 3 digits (e.g., 001, 122, 375)
        // - Numbers with decimal: at least 3 characters total (e.g., 122.1, 214.2)
        // - Maximum 10 characters (database VARCHAR(10))
        const str = String(value).trim()
        if (str.length < 3 || str.length > 10) {
          return 'Build code ต้องมีความยาวอย่างน้อย 3 ตัวอักษร และไม่เกิน 10 ตัวอักษร'
        }
        if (!/^\d{3,}(\.[\d]+)?$/.test(str)) {
          return 'Build code ต้องเป็นตัวเลขอย่างน้อย 3 หลัก (รองรับจุดทศนิยม เช่น 122.1)'
        }
        return null
      },
      business_type: (value) => (!value ? 'กรุณาเลือกประเภทกิจการ' : null),
      company_name: (value) => (!value ? 'กรุณากรอกชื่อบริษัท' : null),
      legal_entity_number: (value) => {
        if (!value) return 'กรุณากรอกเลขทะเบียนนิติบุคคล'
        const cleaned = value.replace(/-/g, '')
        if (!/^\d{13}$/.test(cleaned)) return 'เลขทะเบียนนิติบุคคลต้องเป็นตัวเลข 13 หลัก'
        return null
      },
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
    if (opened) {
      if (isEditMode && client) {
        form.setValues({
          build: client.build,
          business_type: client.business_type,
          company_name: client.company_name,
          legal_entity_number: client.legal_entity_number,
          establishment_date: parseDate(client.establishment_date),
          business_category: client.business_category || '',
          business_subcategory: client.business_subcategory || '',
          company_size: client.company_size || '',
          tax_registration_status: client.tax_registration_status || '',
          vat_registration_date: parseDate(client.vat_registration_date),
          full_address: client.full_address || '',
          village: client.village || '',
          building: client.building || '',
          room_number: client.room_number || '',
          floor_number: client.floor_number || '',
          address_number: client.address_number || '',
          soi: client.soi || '',
          moo: client.moo || '',
          road: client.road || '',
          subdistrict: client.subdistrict || '',
          district: client.district || '',
          province: client.province || '',
          postal_code: client.postal_code || '',
          company_status: client.company_status || 'รายเดือน',
        })
      } else {
        form.reset()
      }
    }
  }, [opened, isEditMode, client])

  const formatDateToLocal = (date: Date | null): string | null => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSubmit = async (values: typeof form.values) => {
    const cleanedLegalEntityNumber = values.legal_entity_number.replace(/-/g, '')
    
    const submitData: Partial<Client> = {
      build: values.build,
      business_type: values.business_type,
      company_name: values.company_name,
      legal_entity_number: cleanedLegalEntityNumber,
      establishment_date: values.establishment_date
        ? formatDateToLocal(values.establishment_date)
        : null,
      business_category: values.business_category || null,
      business_subcategory: values.business_subcategory || null,
      company_size: values.company_size || null,
      tax_registration_status: values.tax_registration_status || null,
      vat_registration_date: values.vat_registration_date
        ? formatDateToLocal(values.vat_registration_date)
        : null,
      full_address: values.full_address || null,
      village: values.village || null,
      building: values.building || null,
      room_number: values.room_number || null,
      floor_number: values.floor_number || null,
      address_number: values.address_number || null,
      soi: values.soi || null,
      moo: values.moo || null,
      road: values.road || null,
      subdistrict: values.subdistrict || null,
      district: values.district || null,
      province: values.province || null,
      postal_code: values.postal_code || null,
      company_status: values.company_status,
    }

    await onSubmit(submitData)
    form.reset()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditMode ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
      size="xl"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Basic Information */}
          <Accordion defaultValue="basic" variant="separated">
            <Accordion.Item value="basic">
              <Accordion.Control>ข้อมูลพื้นฐาน</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Build Code"
                        placeholder="001"
                        required
                        disabled={isEditMode}
                        {...form.getInputProps('build')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="ประเภทกิจการ"
                        placeholder="เลือกประเภทกิจการ"
                        required
                        data={businessTypeOptions}
                        {...form.getInputProps('business_type')}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="ชื่อบริษัท"
                        placeholder="กรอกชื่อบริษัท"
                        required
                        {...form.getInputProps('company_name')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="เลขทะเบียนนิติบุคคล"
                        placeholder="1234567890123"
                        required
                        disabled={isEditMode}
                        {...form.getInputProps('legal_entity_number')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="สถานะบริษัท"
                        placeholder="เลือกสถานะ"
                        required
                        data={companyStatusOptions}
                        {...form.getInputProps('company_status')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <DateInput
                        label="วันจัดตั้งกิจการ"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('establishment_date')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="ไซต์บริษัท"
                        placeholder="เลือกไซต์"
                        data={companySizeOptions}
                        clearable
                        {...form.getInputProps('company_size')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ประเภทธุรกิจ"
                        placeholder="กรอกประเภทธุรกิจ"
                        {...form.getInputProps('business_category')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ประเภทธุรกิจย่อย"
                        placeholder="กรอกประเภทธุรกิจย่อย"
                        {...form.getInputProps('business_subcategory')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Tax Information */}
            <Accordion.Item value="tax">
              <Accordion.Control>ข้อมูลภาษี</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="สถานะจดภาษีมูลค่าเพิ่ม"
                        placeholder="เลือกสถานะ"
                        data={taxRegistrationStatusOptions}
                        clearable
                        {...form.getInputProps('tax_registration_status')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <DateInput
                        label="วันที่จดภาษีมูลค่าเพิ่ม"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('vat_registration_date')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Address */}
            <Accordion.Item value="address">
              <Accordion.Control>ที่อยู่</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Textarea
                    label="ที่อยู่รวม"
                    placeholder="กรอกที่อยู่รวมทั้งหมด"
                    minRows={3}
                    {...form.getInputProps('full_address')}
                  />
                  <Text size="sm" c="dimmed" ta="center">
                    หรือกรอกรายละเอียดแยกฟิลด์ด้านล่าง
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="หมู่บ้าน"
                        placeholder="กรอกหมู่บ้าน"
                        {...form.getInputProps('village')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="อาคาร"
                        placeholder="กรอกอาคาร"
                        {...form.getInputProps('building')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ห้องเลขที่"
                        placeholder="กรอกห้องเลขที่"
                        {...form.getInputProps('room_number')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ชั้นที่"
                        placeholder="กรอกชั้นที่"
                        {...form.getInputProps('floor_number')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="เลขที่"
                        placeholder="กรอกเลขที่"
                        {...form.getInputProps('address_number')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ซอย/ตรอก"
                        placeholder="กรอกซอย/ตรอก"
                        {...form.getInputProps('soi')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="หมู่ที่"
                        placeholder="กรอกหมู่ที่"
                        {...form.getInputProps('moo')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="ถนน"
                        placeholder="กรอกถนน"
                        {...form.getInputProps('road')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="แขวง/ตำบล"
                        placeholder="กรอกแขวง/ตำบล"
                        {...form.getInputProps('subdistrict')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="อำเภอ/เขต"
                        placeholder="กรอกอำเภอ/เขต"
                        {...form.getInputProps('district')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="จังหวัด"
                        placeholder="กรอกจังหวัด"
                        {...form.getInputProps('province')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="รหัสไปรษณี"
                        placeholder="12345"
                        {...form.getInputProps('postal_code')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" color="orange">
              {isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
