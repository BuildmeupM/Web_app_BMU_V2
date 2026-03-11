import pool from './config/database.js';
import { getSubmissionCount, getDocumentEntryResponsible } from './routes/document-entry-work/helpers.js';
import { formatDateForResponse } from './utils/dateFormatter.js';

async function test() {
  const build = '491', year = '2026', month = '2';
  try {
    const [rows] = await pool.execute(
      `SELECT 
        dew.id,
        dew.build,
        c.company_name,
        c.tax_registration_status,
        dew.work_year,
        dew.work_month,
        dew.entry_timestamp,
        dew.submission_count,
        dew.responsible_employee_id,
        dew.current_responsible_employee_id,
        latest.total_wht as wht_document_count,
        CASE 
            WHEN latest.wht_doing_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.wht_undone_rounds > 0 AND latest.wht_done_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.wht_undone_rounds > 0 AND latest.wht_done_rounds = 0 THEN 'ยังไม่ดำเนินการ'
            WHEN latest.wht_done_rounds > 0 AND latest.wht_undone_rounds = 0 THEN 'ดำเนินการเสร็จแล้ว'
            ELSE dew.wht_entry_status
        END as wht_entry_status,
        dew.wht_entry_start_datetime,
        dew.wht_entry_completed_datetime,
        dew.wht_status_updated_by,
        latest.total_vat as vat_document_count,
        CASE 
            WHEN latest.vat_doing_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.vat_undone_rounds > 0 AND latest.vat_done_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.vat_undone_rounds > 0 AND latest.vat_done_rounds = 0 THEN 'ยังไม่ดำเนินการ'
            WHEN latest.vat_done_rounds > 0 AND latest.vat_undone_rounds = 0 THEN 'ดำเนินการเสร็จแล้ว'
            ELSE dew.vat_entry_status
        END as vat_entry_status,
        dew.vat_entry_start_datetime,
        dew.vat_entry_completed_datetime,
        dew.vat_status_updated_by,
        latest.total_non_vat as non_vat_document_count,
        CASE 
            WHEN latest.non_vat_doing_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.non_vat_undone_rounds > 0 AND latest.non_vat_done_rounds > 0 THEN 'กำลังดำเนินการ'
            WHEN latest.non_vat_undone_rounds > 0 AND latest.non_vat_done_rounds = 0 THEN 'ยังไม่ดำเนินการ'
            WHEN latest.non_vat_done_rounds > 0 AND latest.non_vat_undone_rounds = 0 THEN 'ดำเนินการเสร็จแล้ว'
            ELSE dew.non_vat_entry_status
        END as non_vat_entry_status,
        dew.non_vat_entry_start_datetime,
        dew.non_vat_entry_completed_datetime,
        dew.non_vat_status_updated_by,
        dew.submission_comment,
        dew.return_comment,
        dew.created_at,
        dew.updated_at
       FROM document_entry_work dew
       INNER JOIN (
         SELECT build, work_year, work_month, MAX(submission_count) as max_sub,
                SUM(wht_document_count) as total_wht, 
                SUM(vat_document_count) as total_vat, 
                SUM(non_vat_document_count) as total_non_vat,
                SUM(CASE WHEN wht_document_count > 0 AND wht_entry_status = 'ดำเนินการเสร็จแล้ว' THEN 1 ELSE 0 END) as wht_done_rounds,
                SUM(CASE WHEN wht_document_count > 0 AND wht_entry_status = 'กำลังดำเนินการ' THEN 1 ELSE 0 END) as wht_doing_rounds,
                SUM(CASE WHEN wht_document_count > 0 AND (wht_entry_status IS NULL OR wht_entry_status = 'ยังไม่ดำเนินการ') THEN 1 ELSE 0 END) as wht_undone_rounds,
                SUM(CASE WHEN vat_document_count > 0 AND vat_entry_status = 'ดำเนินการเสร็จแล้ว' THEN 1 ELSE 0 END) as vat_done_rounds,
                SUM(CASE WHEN vat_document_count > 0 AND vat_entry_status = 'กำลังดำเนินการ' THEN 1 ELSE 0 END) as vat_doing_rounds,
                SUM(CASE WHEN vat_document_count > 0 AND (vat_entry_status IS NULL OR vat_entry_status = 'ยังไม่ดำเนินการ') THEN 1 ELSE 0 END) as vat_undone_rounds,
                SUM(CASE WHEN non_vat_document_count > 0 AND non_vat_entry_status = 'ดำเนินการเสร็จแล้ว' THEN 1 ELSE 0 END) as non_vat_done_rounds,
                SUM(CASE WHEN non_vat_document_count > 0 AND non_vat_entry_status = 'กำลังดำเนินการ' THEN 1 ELSE 0 END) as non_vat_doing_rounds,
                SUM(CASE WHEN non_vat_document_count > 0 AND (non_vat_entry_status IS NULL OR non_vat_entry_status = 'ยังไม่ดำเนินการ') THEN 1 ELSE 0 END) as non_vat_undone_rounds
         FROM document_entry_work
         WHERE build = ? AND work_year = ? AND work_month = ? AND deleted_at IS NULL
         GROUP BY build, work_year, work_month
       ) latest ON dew.build = latest.build 
         AND dew.work_year = latest.work_year 
         AND dew.work_month = latest.work_month 
         AND dew.submission_count = latest.max_sub
       LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
       WHERE dew.build = ? AND dew.work_year = ? AND dew.work_month = ? AND dew.deleted_at IS NULL
       LIMIT 1`,
      [build, year, month, build, year, month]
    );

    const submissionCount = await getSubmissionCount(build, parseInt(year), parseInt(month));
    let taxRegistrationStatus = null;
    let documentEntryResponsible = null;

    if (rows.length === 0) {
      const [clientRows] = await pool.execute(
        `SELECT tax_registration_status FROM clients WHERE build = ? AND deleted_at IS NULL LIMIT 1`,
        [build]
      );
      if (clientRows.length > 0) taxRegistrationStatus = clientRows[0].tax_registration_status;
      documentEntryResponsible = await getDocumentEntryResponsible(build, parseInt(year), parseInt(month));
    } else {
      taxRegistrationStatus = rows[0].tax_registration_status;
      documentEntryResponsible = await getDocumentEntryResponsible(build, parseInt(year), parseInt(month));
    }

    if (rows.length === 0) {
      console.log('No rows');
      process.exit(0);
    }

    const documentEntryWork = rows[0];

    const [bots] = await pool.execute(
      `SELECT id, bot_type, document_count, ocr_additional_info, created_at, updated_at
       FROM document_entry_work_bots
       WHERE document_entry_work_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [documentEntryWork.id]
    );

    const formattedData = {
      ...documentEntryWork,
      entry_timestamp: formatDateForResponse(documentEntryWork.entry_timestamp),
      wht_entry_start_datetime: documentEntryWork.wht_entry_start_datetime ? formatDateForResponse(documentEntryWork.wht_entry_start_datetime) : null,
      wht_entry_completed_datetime: documentEntryWork.wht_entry_completed_datetime ? formatDateForResponse(documentEntryWork.wht_entry_completed_datetime) : null,
      vat_entry_start_datetime: documentEntryWork.vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.vat_entry_start_datetime) : null,
      vat_entry_completed_datetime: documentEntryWork.vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.vat_entry_completed_datetime) : null,
      non_vat_entry_start_datetime: documentEntryWork.non_vat_entry_start_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_start_datetime) : null,
      non_vat_entry_completed_datetime: documentEntryWork.non_vat_entry_completed_datetime ? formatDateForResponse(documentEntryWork.non_vat_entry_completed_datetime) : null,
      created_at: formatDateForResponse(documentEntryWork.created_at),
      updated_at: formatDateForResponse(documentEntryWork.updated_at),
    }

    console.log("Success! Data:", formattedData);

  } catch (error) {
    console.error("ERROR!!!", error);
  } finally {
    process.exit(0);
  }
}

test();
