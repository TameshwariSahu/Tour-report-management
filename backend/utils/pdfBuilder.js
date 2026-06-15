const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const A4 = { width: 595.28, height: 841.89 };
const margin = 36;

const detectFileKind = (bytes) => {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  return "unsupported";
};

const addImagePage = async (pdfDoc, bytes, kind) => {
  const image = kind === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const page = pdfDoc.addPage([A4.width, A4.height]);
  const availableWidth = A4.width - margin * 2;
  const availableHeight = A4.height - margin * 2;
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (A4.width - width) / 2,
    y: (A4.height - height) / 2,
    width,
    height,
  });
};

const appendFile = async (targetPdf, absolutePath) => {
  const bytes = fs.readFileSync(absolutePath);
  const kind = detectFileKind(bytes);

  if (kind === "pdf") {
    const sourcePdf = await PDFDocument.load(bytes);
    const pages = await targetPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => targetPdf.addPage(page));
    return;
  }

  if (kind === "jpg" || kind === "png") {
    await addImagePage(targetPdf, bytes, kind);
    return;
  }

  throw new Error(`Unsupported file content: ${path.basename(absolutePath)}`);
};

const createCombinedPdf = async ({ files, outputDir, outputName }) => {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    try {
      await appendFile(pdfDoc, file);
    } catch (err) {
      console.warn(`Skipping file during PDF merge: ${err.message}`);
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    throw new Error("No files available to combine.");
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputName);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
};

module.exports = { createCombinedPdf, detectFileKind };
