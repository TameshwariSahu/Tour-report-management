const fs = require("fs");
const os = require("os");
const path = require("path");
const db = require("../config/db");
const { createCombinedPdf, detectFileKind } = require("./pdfBuilder");

const MAX_SUPPORTING_DOCUMENTS = 3;
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const MAX_PDF_SIZE = 3 * 1024 * 1024;
const MAX_FILE_SIZE = MAX_PDF_SIZE;
const UPLOAD_RELATIVE_DIR = "uploads/tour-reports";
const uploadDir = path.join(__dirname, "..", UPLOAD_RELATIVE_DIR);
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

const maxSizeFor = (mimeType) => (mimeType === "application/pdf" ? MAX_PDF_SIZE : MAX_IMAGE_SIZE);
const fileSizeMessage = "PDF must be 3 MB or less. JPG/PNG images must be 1 MB or less.";

const expectedKindFor = (mimeType) => {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "unsupported";
};

const validateFileContent = (file) => {
  const expectedKind = expectedKindFor(file.mimetype);
  const actualKind = detectFileKind(file.buffer);
  if (actualKind !== expectedKind) {
    throw new Error("File content does not match its type. Please upload a valid PDF, JPG, or PNG file.");
  }
};

const timestampForFileName = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
};

const markFileCurrentTime = (absolutePath) => {
  const now = new Date();
  fs.utimesSync(absolutePath, now, now);
};

const localFileRecord = (file, prefix) => {
  if (!allowedTypes.has(file.mimetype)) throw new Error("Only PDF, JPG, and PNG files are allowed.");
  if (file.size > maxSizeFor(file.mimetype)) throw new Error(fileSizeMessage);
  validateFileContent(file);

  fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || ".bin";
  const safeName = `${prefix}-${timestampForFileName()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const absolutePath = path.join(uploadDir, safeName);
  fs.writeFileSync(absolutePath, file.buffer);
  markFileCurrentTime(absolutePath);

  return {
    fileName: file.originalname,
    fileType: file.mimetype,
    filePath: `${UPLOAD_RELATIVE_DIR}/${safeName}`,
  };
};

const saveUploadedFile = async (file, prefix) => {
  if (!file?.buffer || !file?.originalname || !file?.mimetype) throw new Error("Invalid file upload.");
  if (!allowedTypes.has(file.mimetype)) throw new Error("Only PDF, JPG, and PNG files are allowed.");
  if (file.size > maxSizeFor(file.mimetype)) throw new Error(fileSizeMessage);

  return localFileRecord(file, prefix);
};

const attachSupportDocs = (reports, res) => {
  const ids = reports.map((report) => report.id);
  if (ids.length === 0) return res.json([]);

  db.query("SELECT * FROM tour_supporting_documents WHERE tour_report_id IN (?)", [ids], (err, docs) => {
    if (err) return res.status(500).json({ message: "Documents could not be loaded." });

    const docsByReport = docs.reduce((acc, doc) => {
      acc[doc.tour_report_id] = acc[doc.tour_report_id] || [];
      acc[doc.tour_report_id].push(doc);
      return acc;
    }, {});

    res.json(reports.map((report) => ({
      ...report,
      supporting_documents: docsByReport[report.id] || [],
    })));
  });
};

const saveSupportFiles = (reportId, supportFiles, res, done) => {
  if (supportFiles.length === 0) return done();

  const rows = supportFiles.map((file) => [reportId, file.fileName, file.filePath, file.fileType]);
  db.query(
    "INSERT INTO tour_supporting_documents (tour_report_id, file_name, file_path, file_type) VALUES ?",
    [rows],
    (err) => {
      if (err) return res.status(500).json({ message: "Supporting documents could not be saved." });
      done();
    }
  );
};

const downloadToTempFile = async (url, index) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Remote file could not be downloaded for PDF merge.");

  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath.split("/").pop()) || ".pdf";
  const absolutePath = path.join(os.tmpdir(), `tour-report-source-${Date.now()}-${index}${ext}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(absolutePath, bytes);
  return absolutePath;
};

const filePathForMerge = async (filePath, index) => {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return downloadToTempFile(filePath, index);

  const absolutePath = path.join(__dirname, "..", filePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
};

const saveCombinedPdf = async (reportId, absoluteFiles) => {
  const fileName = `combined-report-${reportId}-${timestampForFileName()}.pdf`;
  const absolutePath = await createCombinedPdf({ files: absoluteFiles, outputDir: uploadDir, outputName: fileName });
  markFileCurrentTime(absolutePath);
  return { filePath: `${UPLOAD_RELATIVE_DIR}/${fileName}`, fileName };
};

const generateCombinedReportPdf = (reportId, done) => {
  db.query("SELECT * FROM tour_reports WHERE id = ?", [reportId], (reportErr, reports) => {
    if (reportErr || reports.length === 0) return done(reportErr || new Error("Report not found."));

    db.query("SELECT * FROM tour_supporting_documents WHERE tour_report_id = ? ORDER BY id ASC", [reportId], async (docErr, docs) => {
      if (docErr) return done(docErr);

      const tempFiles = [];
      try {
        const sources = [reports[0].approval_note_path, ...docs.map((doc) => doc.file_path)].filter(Boolean);
        const absoluteFiles = (await Promise.all(sources.map(filePathForMerge))).filter(Boolean);
        tempFiles.push(...absoluteFiles.filter((file) => file.startsWith(os.tmpdir())));
        if (absoluteFiles.length === 0) return done();

        const combined = await saveCombinedPdf(reportId, absoluteFiles);
        db.query(
          "UPDATE tour_reports SET combined_pdf_path = ?, combined_pdf_name = ? WHERE id = ?",
          [combined.filePath, combined.fileName, reportId],
          (updateErr) => done(updateErr)
        );
      } catch (err) {
        done(err);
      } finally {
        tempFiles.forEach((file) => fs.rmSync(file, { force: true }));
      }
    });
  });
};

const resolveReportFile = (filePath) => {
  if (/^https?:\/\//i.test(filePath || "")) return { type: "url", value: filePath };
  if (!filePath || !filePath.startsWith(`${UPLOAD_RELATIVE_DIR}/`)) return null;

  const absolutePath = path.join(__dirname, "..", filePath);
  return fs.existsSync(absolutePath) ? { type: "local", value: absolutePath } : null;
};

module.exports = {
  MAX_FILE_SIZE,
  MAX_SUPPORTING_DOCUMENTS,
  allowedTypes,
  attachSupportDocs,
  generateCombinedReportPdf,
  resolveReportFile,
  saveSupportFiles,
  saveUploadedFile,
};
