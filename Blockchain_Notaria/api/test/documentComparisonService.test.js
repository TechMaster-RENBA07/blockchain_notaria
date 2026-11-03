const assert = require("node:assert/strict");
const test = require("node:test");
const JSZip = require("jszip");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const { compareFiles } = require("../src/services/documentComparisonService");

test("compares TXT contents and highlights removed and added lines", async () => {
  const result = await compareFiles(
    { extension: ".txt", buffer: Buffer.from("Primera línea\nTexto anterior\nFinal") },
    { extension: ".txt", buffer: Buffer.from("Primera línea\nTexto actualizado\nFinal") },
  );

  assert.equal(result.textComparable, true);
  assert.equal(result.diff.available, true);
  assert.equal(result.diff.removedLines, 1);
  assert.equal(result.diff.addedLines, 1);
  assert.deepEqual(result.diff.chunks.map(({ type }) => type), ["unchanged", "removed", "added", "unchanged"]);
});

test("extracts Word text from DOCX containers for comparison", async () => {
  const makeDocx = async (text) => {
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
    return zip.generateAsync({ type: "nodebuffer" });
  };
  const result = await compareFiles(
    { extension: ".docx", buffer: await makeDocx("Contenido original") },
    { extension: ".docx", buffer: await makeDocx("Contenido modificado") },
  );

  assert.equal(result.textComparable, true);
  assert.equal(result.diff.removedLines, 1);
  assert.equal(result.diff.addedLines, 1);
});

test("extracts spreadsheet values including inline cell text", async () => {
  const makeXlsx = async (value) => {
    const zip = new JSZip();
    zip.file("xl/worksheets/sheet1.xml", `<worksheet xmlns="urn:sheet"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>${value}</t></is></c></row></sheetData></worksheet>`);
    return zip.generateAsync({ type: "nodebuffer" });
  };
  const result = await compareFiles(
    { extension: ".xlsx", buffer: await makeXlsx("Antes") },
    { extension: ".xlsx", buffer: await makeXlsx("Después") },
  );

  assert.equal(result.textComparable, true);
  assert.equal(result.diff.removedLines, 1);
  assert.equal(result.diff.addedLines, 1);
});

test("extracts PDF text while preserving the original file comparison", async () => {
  const makePdf = async (text) => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(text, { x: 40, y: 700, font });
    return Buffer.from(await pdf.save());
  };
  const result = await compareFiles(
    { extension: ".pdf", buffer: await makePdf("Original") },
    { extension: ".pdf", buffer: await makePdf("Modificado") },
  );

  assert.equal(result.textComparable, true);
  assert.equal(result.diff.removedLines, 1);
  assert.equal(result.diff.addedLines, 1);
});

test("reports unsupported visual-only formats without claiming a text diff", async () => {
  const result = await compareFiles(
    { extension: ".png", buffer: Buffer.from("first") },
    { extension: ".png", buffer: Buffer.from("second") },
  );

  assert.equal(result.textComparable, false);
  assert.equal(result.diff.available, false);
  assert.match(result.diff.reason, /imágenes/);
});
