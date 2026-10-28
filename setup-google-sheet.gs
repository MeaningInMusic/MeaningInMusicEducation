/**
 * Meaning in Music — Google Sheet application receiver
 * -----------------------------------------------------
 * Every submission is written to its OWN tab (sheet) named after the
 * submission type: "Lessons", "Instrument Rental", "Volunteering",
 * "Partnership School", "Something Else", "Donations", etc.
 *
 * Each tab only gets columns for the fields that form actually sends
 * (a "Donations" submission never gets Child's name / Instrument, for
 * example). Tabs are created on first use and styled with a royal-blue
 * header, frozen top row, readable widths, and banded rows.
 *
 * Note: Google Sheets forbids "/" in tab names, so "Partnership / school"
 * becomes the "Partnership School" tab.
 *
 * REDEPLOY AFTER EDITING THIS FILE:
 *   Deploy > Manage deployments > (pencil icon) > Version > New version > Deploy
 * The /exec URL stays the same.
 *
 * WHERE SUBMISSIONS GO: set TARGET_SPREADSHEET_ID below to the Google Sheet
 * you want applications saved to (the ID is the long code in the sheet URL).
 */

// The spreadsheet applications are saved to.
// Open your sheet, copy the ID from its URL, and paste it here.
const TARGET_SPREADSHEET_ID = "1Yk6YmQgKvOx3xIqskqfKK0N1DlTKIO4NWftCosBNbW4";

// Maps the "type" sent by each form to a clean tab name.
const TYPE_TAB_MAP = {
  lessons: "Lessons",
  lesson: "Lessons",
  "applying for lessons": "Lessons",
  "instrument rental": "Instrument Rental",
  instrument: "Instrument Rental",
  "becoming an instructor": "Becoming an Instructor",
  instructor: "Becoming an Instructor",
  volunteering: "Volunteering",
  volunteer: "Volunteering",
  donating: "Donations",
  donations: "Donations",
  donation: "Donations",
  "partnership / school": "Partnership School",
  "partnership/school": "Partnership School",
  "partnership school": "Partnership School",
  partnership: "Partnership School",
  school: "Partnership School",
  "something else": "Something Else",
  other: "Something Else",
};

// Preferred column order. Only fields present in the submission are used.
const PREFERRED_ORDER = ["name", "childName", "email", "phone", "age", "school", "grade", "instrument", "experience", "ownInstrument", "whyMusic", "whyInstrument", "goals", "availability", "carePlan", "duration", "inLessons", "hearAbout", "amount", "message"];

// Nice display labels and suggested column widths.
const HEADER_LABELS = {
  name: "Name",
  childName: "Child's name",
  email: "Email",
  phone: "Phone",
  age: "Child's age",
  school: "Child's school",
  grade: "Grade",
  instrument: "Instrument",
  experience: "Previous experience",
  ownInstrument: "Already has own instrument",
  whyMusic: "Why learn music?",
  whyInstrument: "Why this instrument?",
  goals: "Goals",
  availability: "Lesson availability",
  carePlan: "Instrument care plan",
  duration: "How long needed",
  inLessons: "Currently in lessons",
  hearAbout: "How did you hear about us?",
  amount: "Donation amount",
  message: "Message",
  type: "Type",
  timestamp: "Timestamp",
};

const COL_WIDTHS = {
  timestamp: 180,
  name: 180,
  "child's name": 150,
  email: 230,
  phone: 140,
  "child's age": 90,
  "child's school": 200,
  grade: 80,
  instrument: 180,
  "previous experience": 200,
  "already has own instrument": 220,
  "why learn music?": 260,
  "why this instrument?": 260,
  goals: 260,
  "lesson availability": 240,
  "instrument care plan": 260,
  "how long needed": 160,
  "currently in lessons": 180,
  "how did you hear about us?": 240,
  "donation amount": 140,
  message: 400,
};

function cleanTabName(name) {
  let s = String(name == null ? "" : name).trim();
  if (s === "") s = "Misc";
  // Google Sheets forbids these characters in sheet names: : \ / ? * [ ]
  return s.replace(/[:\\/?*\[\]]/g, " ").replace(/\s+/g, " ").substring(0, 100);
}

function resolveTabName(type) {
  const key = String(type == null ? "" : type).trim().toLowerCase();
  if (TYPE_TAB_MAP.hasOwnProperty(key)) {
    return TYPE_TAB_MAP[key];
  }
  return cleanTabName(key);
}

function headerLabel(key) {
  return HEADER_LABELS.hasOwnProperty(key) ? HEADER_LABELS[key] : cleanTabName(key);
}

function formatSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return;

  const header = sheet.getRange(1, 1, 1, lastCol);
  header
    .setFontWeight("bold")
    .setBackground("#4169e1")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setFrozenRows(1);

  const headerVals = header.getValues()[0];
  let messageIdx = -1;
  for (let c = 0; c < headerVals.length; c++) {
    const title = String(headerVals[c]).toLowerCase();
    sheet.setColumnWidth(c + 1, COL_WIDTHS[title] || 170);
    sheet.getRange(1, c + 1).setBorder(true, true, true, true, false, false, "#ffffff", null);
    if (title === "message") messageIdx = c;
  }

  if (lastRow > 1) {
    for (let r = 2; r <= lastRow; r++) {
      const rowRange = sheet.getRange(r, 1, 1, lastCol);
      rowRange
        .setBackground(r % 2 === 0 ? "#eef2fb" : "#ffffff")
        .setVerticalAlignment("top");
    }
    if (messageIdx >= 0) {
      sheet.getRange(2, messageIdx + 1, lastRow - 1, 1).setWrap(true);
    }
  }
}

function doPost(e) {
  let result = { ok: true };
  try {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    const data = JSON.parse(e.postData.contents);
    const tab = resolveTabName(data.type || "Misc");

    const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(tab);
    if (!sheet) {
      sheet = ss.insertSheet(tab);
    }

    // Columns = only the fields this submission actually carries.
    const keys = Object.keys(data).filter((k) => k !== "type" && k !== "timestamp");
    const orderedKeys = PREFERRED_ORDER.filter(
      (k) => keys.indexOf(k) !== -1
    ).concat(keys.filter((k) => PREFERRED_ORDER.indexOf(k) === -1));
    const headers = ["Timestamp"].concat(orderedKeys.map(headerLabel));

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const row = [new Date()].concat(
      orderedKeys.map((k) => (data[k] == null ? "" : data[k]))
    );
    sheet.appendRow(row);

    formatSheet(sheet);

    lock.releaseLock();
    result = { ok: true };
  } catch (err) {
    result = { ok: false, error: String(err) };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet() {
  return ContentService.createTextOutput("Meaning in Music form receiver is running.");
}