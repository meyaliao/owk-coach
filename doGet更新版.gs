// ── 請把這個 doGet 函數貼回 Apps Script，取代原本的版本 ──
function doGet(e) {
  const ss = SpreadsheetApp.openById('1jPQsozka2UKlR59DeFQVTpBciVSc_FderQEH4s1-MXc');

  // 支援 ?sheet=週三 參數，沒傳就讀第一個分頁
  const sheetName = e && e.parameter && e.parameter.sheet
    ? e.parameter.sheet
    : null;

  let sheet;
  if (sheetName) {
    sheet = ss.getSheetByName(sheetName);
  } else {
    sheet = ss.getSheets()[0];
  }

  if (!sheet) {
    const output = ContentService.createTextOutput(JSON.stringify({
      error: '找不到工作表：' + sheetName,
      students: []
    }));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  }

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const students = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = r[1];
    if (!name || name === '') continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = r[j]; });
    students.push(obj);
  }

  const output = ContentService.createTextOutput(JSON.stringify({
    updated: new Date().toISOString(),
    sheet: sheet.getName(),
    students: students
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
