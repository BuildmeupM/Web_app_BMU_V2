import * as XLSX from 'xlsx';

/**
 * Reusable utility to export an array of JSON objects to an Excel file.
 * 
 * @param data Array of objects (key-value pairs) representing the rows and columns.
 * @param filename The name of the file to save (without the .xlsx extension).
 */
export function exportToExcel<T = Record<string, unknown>>(data: T[], filename: string) {
    if (!data || data.length === 0) {
        console.warn('No data to export.');
        return;
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert the array of objects to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate buffer and auto-download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}
