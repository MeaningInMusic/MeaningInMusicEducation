// Paste your Google Apps Script Web App URL here (from File > Deploy > New deployment > Web app).
// Example: const MIM_SHEET_URL = "https://script.google.com/macros/s/AKfycb.../exec";
const MIM_SHEET_URL = "https://script.google.com/macros/s/AKfycbzt9OMRMXyMgsVi9rGW0yqwVZvyXIf9G2hUaqocfyVdYdT24WgKUwXRyPSa-VPA1_OmTQ/exec";

const MIM_SUPPORT_EMAIL = "meaninginmusiceducation@gmail.com";

// Link to the spreadsheet that application submissions are saved in
// (same sheet ID as TARGET_SPREADSHEET_ID in setup-google-sheet.gs).
const MIM_APPLICATIONS_SHEET =
  "https://docs.google.com/spreadsheets/d/1Yk6YmQgKvOx3xIqskqfKK0N1DlTKIO4NWftCosBNbW4/edit?usp=sharing";

// Link to the organization's company / records spreadsheet (shown in the admin page).
const MIM_COMPANY_SHEET =
  "https://docs.google.com/spreadsheets/d/1dryU2qd2ORL7nE4I8g0LvZwbWra0kXOSpmMm9gejXVY/edit?gid=2029878542#gid=2029878542";

const MIM_LABELS = {
  type: "Application type",
  name: "Parent / guardian name",
  childName: "Child's name",
  email: "Contact email",
  phone: "Phone (optional)",
  age: "Child's age",
  school: "Child's school",
  grade: "Grade",
  instrument: "Instrument interested in",
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
  message: "Message",
};

// Sends an application to the Google Sheet. If MIM_SHEET_URL is empty it
// falls back to opening an email so the site keeps working during setup.
async function mimSubmitApplication(payload) {
  if (MIM_SHEET_URL) {
    try {
      await fetch(MIM_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false };
    }
  }
  const lines = Object.keys(MIM_LABELS)
    .filter((k) => payload[k] != null && String(payload[k]) !== "")
    .map((k) => MIM_LABELS[k] + ": " + payload[k]);
  const body = lines.join("\n");
  window.location.href =
    "mailto:" +
    MIM_SUPPORT_EMAIL +
    "?subject=" +
    encodeURIComponent("Application — " + (payload.type || "Lessons")) +
    "&body=" +
    encodeURIComponent(body);
  return { ok: true };
}