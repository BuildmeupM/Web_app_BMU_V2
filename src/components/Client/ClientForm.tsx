/**
 * ClientForm Component
 * Form สำหรับเพิ่ม/แก้ไขข้อมูลลูกค้า (ข้อมูลพื้นฐาน + BOI + ค่าทำบัญชีเบื้องต้น)
 * ส่วนค่าธรรมเนียมรายเดือน, Line Chat, DBD, รหัสหน่วยงานราชการ จะกรอกในหน้ารายละเอียดแยก
 */

import { useEffect, useState } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
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
import { notifications } from '@mantine/notifications'
import { TbAlertCircle, TbWand } from 'react-icons/tb'
import { Client } from '../../services/clientsService'
import { parseThaiAddress } from '../../utils/addressParser'

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
  { value: 'มูลนิธิ', label: 'มูลนิธิ' },
  { value: 'สมาคม', label: 'สมาคม' },
  { value: 'กิจการร่วมค้า', label: 'กิจการร่วมค้า' },
  { value: 'อื่น ๆ', label: 'อื่น ๆ' },
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
      // === Basic Info ===
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
      company_status: 'รายเดือน',
      // === Address ===
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
      // === Accounting Fees (basic only) ===
      peak_code: '',
      accounting_start_date: null as DateValue | null,
      accounting_end_date: null as DateValue | null,
      accounting_end_reason: '',
      fee_year: new Date().getFullYear(),
      // === BOI Info ===
      boi_approval_date: null as DateValue | null,
      boi_first_use_date: null as DateValue | null,
      boi_expiry_date: null as DateValue | null,
    },
    validate: {
      build: (value) => {
        if (!value) return 'กรุณากรอก Build code'
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
      company_status: (value) => (!value ? 'กรุณาเลือกสถานะบริษัท' : null),
      tax_registration_status: (value) => (!value ? 'กรุณาเลือกสถานะจดภาษีมูลค่าเพิ่ม' : null),
      vat_registration_date: (value, values) => {
        if (values.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม' && !value) {
          return 'กรุณาเลือกวันที่จดภาษีมูลค่าเพิ่ม (บังคับเมื่อเลือก "จดภาษีมูลค่าเพิ่ม")'
        }
        return null
      },
      peak_code: (value) => (!value ? 'กรุณากรอก Peak Code' : null),
      accounting_start_date: (value) => (!value ? 'กรุณาเลือกวันเริ่มทำบัญชี' : null),
      postal_code: (value) =>
        value && !/^\d{5}$/.test(value) ? 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' : null,
    },
  })

  const parseDate = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null
    const dateOnly = dateString.split('T')[0]
    const [year, month, day] = dateOnly.split('-').map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    return new Date(year, month - 1, day)
  }

  useEffect(() => {
    if (opened) {
      if (isEditMode && client) {
        const af = client.accounting_fees
        const boi = client.boi_info

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
          company_status: client.company_status || 'รายเดือน',
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
          // Accounting Fees (basic)
          peak_code: af?.peak_code || '',
          accounting_start_date: parseDate(af?.accounting_start_date),
          accounting_end_date: parseDate(af?.accounting_end_date),
          accounting_end_reason: af?.accounting_end_reason || '',
          fee_year: af?.fee_year || new Date().getFullYear(),
          // BOI Info
          boi_approval_date: parseDate(boi?.boi_approval_date),
          boi_first_use_date: parseDate(boi?.boi_first_use_date),
          boi_expiry_date: parseDate(boi?.boi_expiry_date),
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

  // Controlled accordion state
  const [openedSections, setOpenedSections] = useState<string[]>(['basic'])

  // Map fields to their accordion sections
  const fieldToSection: Record<string, string> = {
    build: 'basic',
    business_type: 'basic',
    company_name: 'basic',
    legal_entity_number: 'basic',
    company_status: 'basic',
    tax_registration_status: 'tax',
    vat_registration_date: 'tax',
    postal_code: 'address',
    peak_code: 'fees',
    accounting_start_date: 'fees',
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Run Mantine validation manually
    const validation = form.validate()
    if (validation.hasErrors) {
      // Find the first error field and expand its accordion section
      const errorFields = Object.keys(validation.errors)
      const errorMessages = Object.values(validation.errors).filter(Boolean)
      const sectionsToOpen = new Set<string>(openedSections)
      errorFields.forEach((field) => {
        const section = fieldToSection[field]
        if (section) sectionsToOpen.add(section)
      })
      setOpenedSections(Array.from(sectionsToOpen))

      // Show notification with error info
      notifications.show({
        title: 'กรุณาตรวจสอบข้อมูล',
        message: errorMessages.join(', '),
        color: 'red',
        icon: <TbAlertCircle size={16} />,
        autoClose: 5000,
      })
      return
    }

    // Validation passed — build the submit data
    const values = form.values
    const cleanedLegalEntityNumber = values.legal_entity_number.replace(/-/g, '')

    const hasAccountingFees = values.peak_code || values.accounting_start_date
    const hasBoiInfo = values.boi_approval_date || values.boi_first_use_date || values.boi_expiry_date

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
      // Accounting fees (basic info only — monthly fees added separately)
      accounting_fees: hasAccountingFees ? {
        peak_code: values.peak_code || null,
        accounting_start_date: values.accounting_start_date ? formatDateToLocal(values.accounting_start_date) : null,
        accounting_end_date: values.accounting_end_date ? formatDateToLocal(values.accounting_end_date) : null,
        accounting_end_reason: values.accounting_end_reason || null,
        fee_year: values.fee_year,
      } : undefined,
      boi_info: hasBoiInfo ? {
        boi_approval_date: values.boi_approval_date ? formatDateToLocal(values.boi_approval_date) : null,
        boi_first_use_date: values.boi_first_use_date ? formatDateToLocal(values.boi_first_use_date) : null,
        boi_expiry_date: values.boi_expiry_date ? formatDateToLocal(values.boi_expiry_date) : null,
      } : undefined,
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
      styles={{
        body: { maxHeight: '80vh', overflowY: 'auto' },
      }}
    >
      <form onSubmit={handleFormSubmit} noValidate>
        <Stack gap="md">
          <Accordion multiple value={openedSections} onChange={setOpenedSections} variant="separated">
            {/* ========== 1. ข้อมูลพื้นฐาน ========== */}
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

            {/* ========== 2. ข้อมูลภาษี ========== */}
            <Accordion.Item value="tax">
              <Accordion.Control>ข้อมูลภาษี</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="สถานะจดภาษีมูลค่าเพิ่ม"
                        placeholder="เลือกสถานะ"
                        withAsterisk
                        data={taxRegistrationStatusOptions}
                        {...form.getInputProps('tax_registration_status')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <DateInput
                        label="วันที่จดภาษีมูลค่าเพิ่ม"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        required={form.values.tax_registration_status === 'จดภาษีมูลค่าเพิ่ม'}
                        {...form.getInputProps('vat_registration_date')}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* ========== 3. ที่อยู่ ========== */}
            <Accordion.Item value="address">
              <Accordion.Control>ที่อยู่</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Textarea
                    label="ที่อยู่รวม"
                    placeholder="กรอกที่อยู่รวมทั้งหมด เช่น เลขที่ 633 ซอย อ่อนนุช30 หมู่ ถนน แขวง/ตำบล อ่อนนุช อำเภอ/เขต สวนหลวง จังหวัด กรุงเทพมหานคร รหัสไปรษณีย์ 20180"
                    minRows={3}
                    {...form.getInputProps('full_address')}
                  />
                  <Group justify="center" gap="sm">
                    <Button
                      variant="light"
                      color="orange"
                      size="sm"
                      leftSection={<TbWand size={16} />}
                      onClick={() => {
                        const fullAddr = form.values.full_address?.trim()
                        if (!fullAddr) {
                          notifications.show({
                            title: 'ไม่มีที่อยู่รวม',
                            message: 'กรุณากรอกที่อยู่รวมก่อนกดแยกอัตโนมัติ',
                            color: 'yellow',
                          })
                          return
                        }
                        const parsed = parseThaiAddress(fullAddr)
                        form.setValues({
                          ...form.values,
                          village: parsed.village || form.values.village,
                          building: parsed.building || form.values.building,
                          room_number: parsed.room_number || form.values.room_number,
                          floor_number: parsed.floor_number || form.values.floor_number,
                          address_number: parsed.address_number || form.values.address_number,
                          soi: parsed.soi || form.values.soi,
                          moo: parsed.moo || form.values.moo,
                          road: parsed.road || form.values.road,
                          subdistrict: parsed.subdistrict || form.values.subdistrict,
                          district: parsed.district || form.values.district,
                          province: parsed.province || form.values.province,
                          postal_code: parsed.postal_code || form.values.postal_code,
                        })
                        notifications.show({
                          title: 'แยกที่อยู่สำเร็จ',
                          message: 'ระบบแยกที่อยู่รวมเป็นฟิลด์ย่อยเรียบร้อยแล้ว กรุณาตรวจสอบความถูกต้อง',
                          color: 'green',
                        })
                      }}
                    >
                      แยกที่อยู่อัตโนมัติ
                    </Button>
                    <Text size="xs" c="dimmed">
                      หรือกรอกรายละเอียดแยกฟิลด์ด้านล่าง
                    </Text>
                  </Group>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="หมู่บ้าน" placeholder="กรอกหมู่บ้าน" {...form.getInputProps('village')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="อาคาร" placeholder="กรอกอาคาร" {...form.getInputProps('building')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="ห้องเลขที่" placeholder="กรอกห้องเลขที่" {...form.getInputProps('room_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="ชั้นที่" placeholder="กรอกชั้นที่" {...form.getInputProps('floor_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="เลขที่" placeholder="กรอกเลขที่" {...form.getInputProps('address_number')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="ซอย/ตรอก" placeholder="กรอกซอย/ตรอก" {...form.getInputProps('soi')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="หมู่ที่" placeholder="กรอกหมู่ที่" {...form.getInputProps('moo')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="ถนน" placeholder="กรอกถนน" {...form.getInputProps('road')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="แขวง/ตำบล" placeholder="กรอกแขวง/ตำบล" {...form.getInputProps('subdistrict')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="อำเภอ/เขต" placeholder="กรอกอำเภอ/เขต" {...form.getInputProps('district')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="จังหวัด" placeholder="กรอกจังหวัด" {...form.getInputProps('province')} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput label="รหัสไปรษณีย์" placeholder="12345" {...form.getInputProps('postal_code')} />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* ========== 4. ค่าทำบัญชี / ค่าบริการ HR ========== */}
            <Accordion.Item value="fees">
              <Accordion.Control>ค่าทำบัญชี / ค่าบริการ HR</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="Peak Code"
                        placeholder="กรอก Peak Code"
                        withAsterisk
                        {...form.getInputProps('peak_code')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <DateInput
                        label="วันเริ่มทำบัญชี"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        withAsterisk
                        {...form.getInputProps('accounting_start_date')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <DateInput
                        label="วันสิ้นสุดทำบัญชี"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('accounting_end_date')}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="เหตุผลสิ้นสุด"
                        placeholder="กรอกเหตุผล (ถ้ามี)"
                        {...form.getInputProps('accounting_end_reason')}
                      />
                    </Grid.Col>
                  </Grid>
                  <Text size="xs" c="dimmed" ta="center" fs="italic">
                    * ค่าทำบัญชีรายเดือนและ Line Chat/Billing สามารถเพิ่มได้ในหน้ารายละเอียดลูกค้า
                  </Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* ========== 5. ข้อมูล BOI ========== */}
            <Accordion.Item value="boi">
              <Accordion.Control>ข้อมูลสิทธิ์ BOI</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <DateInput
                        label="วันที่อนุมัติ BOI"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('boi_approval_date')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <DateInput
                        label="วันที่เริ่มใช้สิทธิ์ BOI"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('boi_first_use_date')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <DateInput
                        label="วันที่หมดอายุ BOI"
                        placeholder="เลือกวันที่"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps('boi_expiry_date')}
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
