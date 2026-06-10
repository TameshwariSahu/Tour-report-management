const normalizeTime = (value, period = "") => {
  let raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;

  const suffixMatch = raw.match(/\s*(AM|PM)$/);
  const effectivePeriod = suffixMatch ? suffixMatch[1] : String(period || "").toUpperCase();
  if (suffixMatch) raw = raw.replace(/\s*(AM|PM)$/, "").trim();

  let hours;
  let minutes;

  if (/^\d{1,2}$/.test(raw)) {
    hours = Number(raw);
    minutes = 0;
  } else if (/^\d{3,4}$/.test(raw)) {
    const padded = raw.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2));
  } else {
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    hours = Number(match[1]);
    minutes = Number(match[2]);
  }

  if (effectivePeriod) {
    if (!["AM", "PM"].includes(effectivePeriod) || hours < 1 || hours > 12) return null;
    hours = effectivePeriod === "AM" ? (hours === 12 ? 0 : hours) : (hours === 12 ? 12 : hours + 12);
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const validateSubmittedReport = (body, hasApprovalNote) => {
  const requiredFields = [
    ["Name", body.name],
    ["Designation", body.designation],
    ["Grade", body.grade],
    ["Department", body.department],
    ["Type of tour", body.tour_type],
    ["Purpose", body.purpose],
    ["Start date", body.start_date],
    ["Start time", body.start_time],
    ["Started from", body.start_place],
    ["End date", body.end_date],
    ["End time", body.end_time],
    ["Destination", body.destination],
    ["Mode of travel", body.mode_of_travel],
    ["Weekly off", body.weekly_off],
    ["Approving authority", body.approving_authority],
  ];

  const missing = requiredFields.find(([, value]) => !String(value || "").trim());
  if (missing) return `${missing[0]} is required.`;

  const isMedicalSelf = body.tour_type === "Medical(Self)";
  const isEscortDuty = body.tour_type === "Medical (Escort Duty)";
  const isMedicalTour = isMedicalSelf || isEscortDuty;

  if (isMedicalTour) {
    const medicalRequiredFields = [
      ["Reference letter no.", body.medical_reference_no],
      ["Reference letter date", body.medical_reference_date],
      ["Return vehicle selection", body.return_vehicle_required],
    ];
    const missingMedical = medicalRequiredFields.find(([, value]) => !String(value || "").trim());
    if (missingMedical) return `${missingMedical[0]} is required.`;
  }

  if (isEscortDuty) {
    const escortRequiredFields = [
      ["Patient name", body.patient_name],
      ["Patient relation", body.patient_relation],
    ];
    const missingEscort = escortRequiredFields.find(([, value]) => !String(value || "").trim());
    if (missingEscort) return `${missingEscort[0]} is required.`;
    if (body.escort_employee_sap_id && !/^\d{8}$/.test(String(body.escort_employee_sap_id))) {
      return "Escort employee SAP ID must be exactly 8 digits.";
    }
  }

  if (!hasApprovalNote) return "Approval note is required.";
  if (new Date(body.start_date) > new Date(body.end_date)) return "End date cannot be before start date.";

  const startTime = normalizeTime(body.start_time, body.start_period);
  const endTime = normalizeTime(body.end_time, body.end_period);
  if (!startTime || !endTime) return "Start time and end time are required.";

  if (body.start_date === body.end_date && startTime >= endTime) {
    return "End time must be after start time for same-day tour.";
  }

  const start = new Date(`${body.start_date}T${startTime}`);
  const end = new Date(`${body.end_date}T${endTime}`);
  if (end <= start) return "End date/time must be after start date/time.";

  return "";
};

module.exports = { normalizeTime, validateSubmittedReport };


