/**
 * Document Sorting Page
 * หน้าคัดแยกเอกสาร - สำหรับคัดแยกข้อมูลเอกสารและส่งข้อมูลเข้าไปยัง document_entry_work
 */

import { Container, Stack, Card, Button, Group, Text, Paper, Divider, Modal, Alert } from '@mantine/core'
import { TbCheck, TbX, TbLoader, TbRefresh, TbAlertCircle } from 'react-icons/tb'
import CompanyTable from '../components/DocumentSorting/CompanyTable'
import SubmissionCountBadge from '../components/DocumentSorting/SubmissionCountBadge'
import SubmissionHistory from '../components/DocumentSorting/SubmissionHistory'
import DocumentKeyingSection from '../components/DocumentSorting/DocumentKeyingSection'
import BotSubmissionSection from '../components/DocumentSorting/BotSubmissionSection'
import CommentsSection from '../components/DocumentSorting/CommentsSection'
import LoadingSpinner from '../components/Loading/LoadingSpinner'
import SummaryStats from '../components/DocumentSorting/SummaryStats'
import AcknowledgmentModal from '../components/TaxInspection/AcknowledgmentModal'
import { useDocumentSorting } from '../components/DocumentSorting/useDocumentSorting'

export default function DocumentSorting() {
  const { state, setters, actions } = useDocumentSorting()

  const {
    currentTaxMonth,
    selectedBuild,
    selectedCompanyName,
    whtDocumentCount,
    vatDocumentCount,
    nonVatDocumentCount,
    bots,
    submissionComment,
    returnComment,
    submissionCount,
    existingDocumentEntryWorkId,
    existingRecordSubmissionCount,
    unsavedModalOpened,
    pendingSelection,
    acknowledgmentOpened,
    acknowledgmentSections,
    acknowledgmentRecord,
    isLoadingExisting,
    isErrorExisting,
    isSubmitting,
    isRefreshing,
    isVatAllowed,
  } = state

  const {
    setWhtDocumentCount,
    setVatDocumentCount,
    setNonVatDocumentCount,
    setBots,
    setSubmissionComment,
    setReturnComment,
    setUnsavedModalOpened,
    setAcknowledgmentOpened,
  } = setters

  const {
    handleCompanyChange,
    handleClearSelection,
    handleAcknowledgmentConfirm,
    handleEditEntry,
    handleSubmit,
    handleRefresh,
    confirmSelectCompany,
    proceedWithClearSelection,
    refetchExisting,
  } = actions

  return (
    <Container fluid px="xl" py="md">
      {/* Unsaved Changes Guard Modal */}
      <Modal
        opened={unsavedModalOpened}
        onClose={() => setUnsavedModalOpened(false)}
        title={<Text fw={600}>มีข้อมูลที่ยังไม่ถูกบันทึก</Text>}
        centered
      >
        <Text size="sm" mb="lg">
          คุณได้ทำการแก้ไขข้อมูลในบริษัท <strong>{selectedCompanyName || selectedBuild}</strong> ค้างไว้ 
          หากเปลี่ยนหน้าหรือล้างการค้นหา ข้อมูลที่กรอกไว้จะสูญหาย 
          คุณต้องการดำเนินการต่อใช่หรือไม่?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setUnsavedModalOpened(false)}>ยกเลิก</Button>
          <Button color="red" onClick={() => {
             if (pendingSelection) {
                confirmSelectCompany(pendingSelection.buildId, pendingSelection.companyName)
             } else {
                proceedWithClearSelection()
             }
          }}>ใช่, ดำเนินการต่อ (ข้อมูลจะหาย)</Button>
        </Group>
      </Modal>

      <Stack gap="lg">
        {/* Header Section */}
        <Card
          bg="orange"
          radius="lg"
          p="md"
          style={{ borderTopLeftRadius: 'var(--mantine-radius-lg)', borderTopRightRadius: 'var(--mantine-radius-lg)' }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Text size="xl" fw={700} c="white">
                คัดแยกเอกสาร
              </Text>
              <Text size="sm" c="white" opacity={0.9}>
                คัดแยกข้อมูลเอกสารและส่งข้อมูลเข้าไปยัง document_entry_work
              </Text>
            </div>
            <Button
              variant="white"
              color="orange"
              leftSection={isRefreshing ? <TbLoader size={18} /> : <TbRefresh size={18} />}
              onClick={handleRefresh}
              disabled={isSubmitting || isRefreshing}
              loading={isRefreshing}
              radius="md"
            >
              รีเฟรชข้อมูล
            </Button>
          </Group>
        </Card>

        {/* Form Section */}
        <Paper withBorder p="lg" radius="md">
          <Stack gap="lg">
            {/* Summary Stats */}
            <SummaryStats year={currentTaxMonth.year} month={currentTaxMonth.month} onSelectCompany={handleCompanyChange} />

            {/* Company Selection */}
            <Stack gap="md">
              <Text size="lg" fw={600}>
                เลือกบริษัท
              </Text>
              <CompanyTable
                onSelectCompany={handleCompanyChange}
                selectedBuild={selectedBuild}
                disabled={isSubmitting}
              />
            </Stack>

            {/* Acknowledgment Modal (ก่อนเปิดฟอร์มเมื่อเลือกบริษัท) */}
            <AcknowledgmentModal
              opened={acknowledgmentOpened}
              onClose={() => setAcknowledgmentOpened(false)}
              sectionsWithData={acknowledgmentSections}
              record={acknowledgmentRecord}
              onConfirm={handleAcknowledgmentConfirm}
            />

            {isLoadingExisting && selectedBuild ? (
              <LoadingSpinner />
            ) : selectedBuild ? (
              <>
                <Divider />

                {/* Clear Selection Button */}
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<TbX size={16} />}
                    onClick={handleClearSelection}
                    disabled={isSubmitting}
                    size="sm"
                  >
                    ปิด/ล้างการเลือกบริษัท
                  </Button>
                </Group>

                {isErrorExisting ? (
                  <Alert icon={<TbAlertCircle size={16} />} title="ไม่สามารถแสดงข้อมูลได้" color="red">
                     เกิดข้อผิดพลาดในการดึงข้อมูลงานคีย์ของบริษัทนี้ กรุณาลองใหม่อีกครั้ง
                     <div style={{ marginTop: 10 }}>
                       <Button size="xs" color="red" variant="light" onClick={() => refetchExisting()}>
                         ลองใหม่ (Try Again)
                       </Button>
                     </div>
                  </Alert>
                ) : (
                  <>
                    {/* ส่วนที่จะต้องกรอกข้อมูล — ไว้ด้านบนของประวัติการส่งข้อมูล */}
                    <Group gap="xs" mb="md">
                      <Text size="sm" c="dimmed">
                        {existingDocumentEntryWorkId && existingRecordSubmissionCount !== null
                          ? 'กำลังแก้ไขข้อมูลการส่งงานคีย์ของบริษัท'
                          : 'การส่งงานคีย์ของบริษัท'}
                      </Text>
                      <Text size="sm" fw={600} c="orange">
                        {selectedCompanyName || selectedBuild}
                      </Text>
                      <Text size="sm" c="dimmed">
                        ครั้งที่
                      </Text>
                      <SubmissionCountBadge
                        submissionCount={
                          existingDocumentEntryWorkId && existingRecordSubmissionCount !== null
                            ? existingRecordSubmissionCount
                            : (submissionCount || 0) + 1
                        }
                      />
                    </Group>

                    <div data-form-section>
                      <DocumentKeyingSection
                        whtDocumentCount={whtDocumentCount}
                        vatDocumentCount={vatDocumentCount}
                        nonVatDocumentCount={nonVatDocumentCount}
                        onWhtChange={(val) => setWhtDocumentCount(typeof val === 'number' ? val : 0)}
                        onVatChange={(val) => setVatDocumentCount(typeof val === 'number' ? val : 0)}
                        onNonVatChange={(val) => setNonVatDocumentCount(typeof val === 'number' ? val : 0)}
                        disabled={isSubmitting}
                        vatDisabled={!isVatAllowed}
                      />

                      <Divider />

                      <BotSubmissionSection bots={bots} onChange={setBots} disabled={isSubmitting} />

                      <Divider />

                      <CommentsSection
                        submissionComment={submissionComment}
                        returnComment={returnComment}
                        onSubmissionCommentChange={setSubmissionComment}
                        onReturnCommentChange={setReturnComment}
                        disabled={isSubmitting}
                      />

                      <Divider />

                      <Group justify="flex-end">
                        <Button
                          onClick={handleSubmit}
                          loading={isSubmitting}
                          leftSection={isSubmitting ? <TbLoader size={16} /> : <TbCheck size={16} />}
                          size="md"
                        >
                          {existingDocumentEntryWorkId ? 'อัพเดทข้อมูล' : 'เริ่มต้นการคัดแยกเอกสาร'}
                        </Button>
                      </Group>
                    </div>

                    <Divider />

                    {/* ประวัติการส่งข้อมูลก่อนหน้านี้ */}
                    <SubmissionHistory
                      build={selectedBuild}
                      year={currentTaxMonth.year}
                      month={currentTaxMonth.month}
                      onEditEntry={handleEditEntry}
                    />
                  </>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                กรุณาเลือกบริษัทเพื่อเริ่มต้นการคัดแยกเอกสาร
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
