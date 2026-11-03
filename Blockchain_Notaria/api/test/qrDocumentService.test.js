const assert = require("node:assert/strict");
const test = require("node:test");
const PDFDocument = require("pdfkit");
const { PDFDocument: PdfLibDocument, PDFDict, PDFName } = require("pdf-lib");
const JSZip = require("jszip");
const sharp = require("sharp");
const { createQrDocument, createStandaloneQr } = require("../src/services/qrDocumentService");

function createMultiPagePdf(pageCount) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4" });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    for (let page = 1; page <= pageCount; page += 1) {
      if (page > 1) pdf.addPage();
      pdf.text(`Página original ${page}`);
    }
    pdf.end();
  });
}

test("adds a QR image to every PDF page without changing the page count", async () => {
  const originalPdf = await createMultiPagePdf(3);
  const originalCopy = Buffer.from(originalPdf);
  const originalPage = await PdfLibDocument.load(originalPdf).then((pdf) => pdf.getPage(0).getSize());
  const converted = await createQrDocument(originalPdf, {
    originalName: "carta-notarial.pdf",
    reference: "CARTA-001",
    currentHash: "a".repeat(64),
  }, "https://notaria.example/verificar/11111111-2222-4333-8444-555555555555");
  const result = await PdfLibDocument.load(converted.buffer);

  assert.equal(result.getPageCount(), 3);
  for (const page of result.getPages()) {
    assert.deepEqual(page.getSize(), originalPage);
    assert.equal(page.getCropBox().height, originalPage.height);
    const xObjects = page.node.Resources().lookup(PDFName.of("XObject"), PDFDict);
    assert.ok(xObjects?.keys().length, "each page should contain an embedded QR image");
  }
  assert.equal(converted.extension, ".pdf");
  assert.equal(converted.mimeType, "application/pdf");
  assert.notDeepEqual(converted.buffer, originalPdf);
  assert.equal(converted.buffer.toString("latin1").includes("VERIFICAR"), false);
  assert.equal(converted.buffer.toString("latin1").includes("NEXO NOTARIAL"), false);
  assert.deepEqual(originalPdf, originalCopy);
});

test("creates a transparent PNG QR and a QR-only PDF", async () => {
  const { png, pdf } = await createStandaloneQr("https://notaria.example/verificar/qr-test");
  const metadata = await sharp(png).metadata();
  const pixels = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const pdfDocument = await PdfLibDocument.load(pdf);
  const xObjects = pdfDocument.getPage(0).node.Resources().lookup(PDFName.of("XObject"), PDFDict);

  assert.equal(metadata.format, "png");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(pixels.data[pixels.info.channels - 1], 0);
  assert.equal(pdfDocument.getPageCount(), 1);
  assert.ok(xObjects?.keys().length, "the QR-only PDF should contain the QR image");
  assert.equal(pdf.toString("latin1").includes("VERIFICAR"), false);
  assert.equal(pdf.toString("latin1").includes("NOTARIA"), false);
});

test("creates a QR PDF rendition for text files while keeping source bytes unchanged", async () => {
  const original = Buffer.from("Contenido original de prueba\nSegunda línea", "utf8");
  const converted = await createQrDocument(original, {
    originalName: "carta.txt",
    reference: "CARTA-002",
    currentHash: "b".repeat(64),
  }, "https://notaria.example/verificar/22222222-2222-4333-8444-555555555555");
  const result = await PdfLibDocument.load(converted.buffer);

  assert.equal(result.getPageCount(), 1);
  assert.equal(converted.extension, ".pdf");
  assert.equal(converted.mimeType, "application/pdf");
  assert.deepEqual(original, Buffer.from("Contenido original de prueba\nSegunda línea", "utf8"));
  assert.ok(converted.buffer.toString("latin1").startsWith("%PDF-"));
});

test("embeds a floating QR in a Word header without converting the DOCX", async () => {
  const archive = new JSZip();
  const existingLogo = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#203b5c" },
  }).png().toBuffer();
  archive.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="png" ContentType="image/png"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
    </Types>`);
  archive.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body><w:p><w:r><w:t>Contenido Word original</w:t></w:r></w:p>
      <w:sectPr><w:headerReference w:type="default" r:id="rId1"/></w:sectPr></w:body>
    </w:document>`);
  archive.file("word/_rels/document.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
    </Relationships>`);
  archive.file("word/header1.xml", `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
    <w:p><w:r><w:t>Encabezado y logo existentes</w:t></w:r><w:r><w:drawing>
      <wp:inline><wp:docPr id="5" name="Logotipo original"/><a:graphic><a:graphicData>
        <a:blip r:embed="rId1"/>
      </a:graphicData></a:graphic></wp:inline>
    </w:drawing></w:r></w:p></w:hdr>`);
  archive.file("word/_rels/header1.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
    </Relationships>`);
  archive.file("word/media/logo.png", existingLogo);
  const original = await archive.generateAsync({ type: "nodebuffer" });
  const originalCopy = Buffer.from(original);
  const converted = await createQrDocument(original, {
    originalName: "carta.docx",
    publicId: "44444444-2222-4333-8444-555555555555",
    reference: "CARTA-004",
    currentHash: "d".repeat(64),
  }, "https://notaria.example/verificar/44444444-2222-4333-8444-555555555555");
  const result = await JSZip.loadAsync(converted.buffer);
  const wordXml = await result.file("word/document.xml").async("string");
  const headerXml = await result.file("word/header1.xml").async("string");
  const headerRelationships = await result.file("word/_rels/header1.xml.rels").async("string");

  assert.equal(converted.extension, ".docx");
  assert.equal(converted.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal((wordXml.match(/headerReference/g) || []).length, 3);
  assert.match(headerXml, /wp:anchor/);
  assert.match(headerXml, /Encabezado y logo existentes/);
  assert.match(headerXml, /name="Nexo Notarial QR"/);
  const drawingIds = [...headerXml.matchAll(/<wp:docPr id="(\d+)"/g)].map((match) => match[1]);
  assert.equal(new Set(drawingIds).size, drawingIds.length);
  assert.match(headerRelationships, /Id="rId2"/);
  assert.ok(result.file("word/media/qr-verification-44444444-2222-4333-8444-555555555555.png"));
  assert.deepEqual(original, originalCopy);
});

test("embeds QR images in PNG and JPEG without changing image dimensions", async () => {
  for (const [extension, format, mimeType] of [
    [".png", "png", "image/png"],
    [".jpg", "jpeg", "image/jpeg"],
  ]) {
    const original = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#d8e3e9" },
    }).toFormat(format).toBuffer();
    const originalMetadata = await sharp(original).metadata();
    const converted = await createQrDocument(original, {
      originalName: `constancia${extension}`,
      publicId: "66666666-2222-4333-8444-555555555555",
      reference: "CONSTANCIA-006",
      currentHash: "f".repeat(64),
    }, "https://notaria.example/verificar/66666666-2222-4333-8444-555555555555");
    const convertedMetadata = await sharp(converted.buffer).metadata();

    assert.equal(converted.extension, extension);
    assert.equal(converted.mimeType, mimeType);
    assert.equal(convertedMetadata.width, originalMetadata.width);
    assert.equal(convertedMetadata.height, originalMetadata.height);
    assert.notDeepEqual(converted.buffer, original);
  }
});

test("embeds a QR into XLSX without changing worksheet cells", async () => {
  const archive = new JSZip();
  archive.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    </Types>`);
  archive.file("xl/workbook.xml", `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets><sheet name="Datos" sheetId="1" r:id="rId1"/><sheet name="Anexos" sheetId="2" r:id="rId2"/></sheets></workbook>`);
  archive.file("xl/_rels/workbook.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/>
    <Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="worksheet"/></Relationships>`);
  archive.file("xl/sharedStrings.xml", `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Referencia</t></si></sst>`);
  archive.file("xl/worksheets/sheet1.xml", `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>NOT-005</t></is></c></row></sheetData></worksheet>`);
  archive.file("xl/worksheets/sheet2.xml", `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Anexo</t></is></c></row></sheetData></worksheet>`);
  const original = await archive.generateAsync({ type: "nodebuffer" });
  const originalCopy = Buffer.from(original);
  const converted = await createQrDocument(original, {
    originalName: "registro.xlsx",
    publicId: "55555555-2222-4333-8444-555555555555",
    reference: "REGISTRO-005",
    currentHash: "e".repeat(64),
  }, "https://notaria.example/verificar/55555555-2222-4333-8444-555555555555");
  const result = await JSZip.loadAsync(converted.buffer);
  const worksheetXml = await result.file("xl/worksheets/sheet1.xml").async("string");
  const secondWorksheetXml = await result.file("xl/worksheets/sheet2.xml").async("string");
  const worksheetRelationships = await result.file("xl/worksheets/_rels/sheet1.xml.rels").async("string");
  const drawingXml = await result.file("xl/drawings/drawing-nexo-1.xml").async("string");
  const drawingRelationships = await result.file("xl/drawings/_rels/drawing-nexo-1.xml.rels").async("string");
  const contentTypes = await result.file("[Content_Types].xml").async("string");
  const mediaFiles = Object.keys(result.files)
    .filter((filename) => filename.startsWith("xl/media/") && !filename.endsWith("/"));

  assert.equal(converted.extension, ".xlsx");
  assert.equal(converted.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.match(worksheetXml, /<drawing/);
  assert.match(secondWorksheetXml, /<drawing/);
  assert.equal((worksheetXml.match(/<c /g) || []).length, 2);
  assert.match(worksheetRelationships, /drawing-nexo-1\.xml/);
  assert.match(drawingXml, /<xdr:oneCellAnchor/);
  assert.match(drawingXml, /<xdr:col>2<\/xdr:col>/);
  assert.match(drawingRelationships, /nexo-qr-55555555-2222-4333-8444-555555555555-1\.png/);
  assert.match(contentTypes, /drawing-nexo-1\.xml/);
  assert.equal(mediaFiles.length, 2);
  assert.ok(mediaFiles.every((filename) => filename.includes("55555555-2222-4333-8444-555555555555")));
  assert.deepEqual(original, originalCopy);
});

test("rejects files that cannot be converted instead of returning a misleading download", async () => {
  await assert.rejects(
    createQrDocument(Buffer.from("data"), {
      originalName: "scan.bmp",
      reference: "CARTA-003",
      currentHash: "c".repeat(64),
    }, "https://notaria.example/verificar/33333333-2222-4333-8444-555555555555"),
    { code: "DOCUMENT_CONVERSION" },
  );
});
