const path = require("node:path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const JSZip = require("jszip");
const sharp = require("sharp");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { PDFDocument: PdfLibDocument } = require("pdf-lib");

const MAX_RENDERED_TEXT_LENGTH = 1_000_000;
const MAX_ARCHIVE_CONTENT_LENGTH = 50 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const QR_SIZE = 64;
const PAGE_MARGIN = 48;
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const WORD_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const SPREADSHEET_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";

function createPdf(build, options = {}) {
  const pdf = new PDFDocument({ size: options.size || "A4", margin: options.margin ?? PAGE_MARGIN, bufferPages: false });
  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
  build(pdf);
  pdf.end();
  return completed;
}

function conversionError(message) {
  const error = new Error(message);
  error.code = "DOCUMENT_CONVERSION";
  return error;
}

async function loadOfficeArchive(buffer) {
  let archive;
  try {
    archive = await JSZip.loadAsync(buffer, { checkCRC32: false });
  } catch {
    throw conversionError("No se pudo abrir el archivo Office. Descarga el original y la constancia por separado.");
  }
  const uncompressedLength = Object.values(archive.files)
    .reduce((total, entry) => total + (entry.dir ? 0 : entry._data?.uncompressedSize || 0), 0);
  if (uncompressedLength > MAX_ARCHIVE_CONTENT_LENGTH) {
    throw conversionError("El archivo Office supera el límite de expansión segura para conversión.");
  }
  return archive;
}

async function getXml(archive, filename) {
  const entry = archive.file(filename);
  if (!entry) throw conversionError("El archivo Office no contiene los datos requeridos para convertirlo.");
  const xml = await entry.async("string");
  const parserErrors = [];
  const parsed = new DOMParser({
    onError: (level, message) => {
      if (level === "error" || level === "fatalError") parserErrors.push(message);
    },
  }).parseFromString(xml, "application/xml");
  if (parserErrors.length || !parsed.documentElement) {
    throw conversionError("El archivo Office contiene XML no válido y no se pudo convertir.");
  }
  return parsed;
}

function parseXml(xml, errorMessage) {
  const parserErrors = [];
  const parsed = new DOMParser({
    onError: (level, message) => {
      if (level === "error" || level === "fatalError") parserErrors.push(message);
    },
  }).parseFromString(xml, "application/xml");
  if (parserErrors.length || !parsed.documentElement) throw conversionError(errorMessage);
  return parsed;
}

function serializeXml(document) {
  return new XMLSerializer().serializeToString(document);
}

function createSpreadsheetQrAnchor(imageRelationshipId, drawingId, column) {
  const xml = `<xdr:oneCellAnchor xmlns:xdr="${SPREADSHEET_DRAWING_NS}"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:r="${DOC_REL_NS}">
    <xdr:from><xdr:col>${column}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:ext cx="1143000" cy="1143000"/>
    <xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${drawingId}" name="Nexo Notarial QR" descr="Código QR de verificación notarial"/>
      <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
      <xdr:blipFill><a:blip r:embed="${imageRelationshipId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1143000" cy="1143000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></xdr:spPr>
    </xdr:pic><xdr:clientData/>
  </xdr:oneCellAnchor>`;
  return parseXml(xml, "No se pudo preparar el QR para la hoja de cálculo.").documentElement;
}

function resolveOfficeTarget(baseDirectory, target, rootDirectory, errorMessage) {
  const normalizedTarget = target.replace(/^\/+/, "");
  const resolved = path.posix.normalize(normalizedTarget.startsWith(`${rootDirectory}/`)
    ? normalizedTarget
    : path.posix.join(baseDirectory, normalizedTarget));
  if (!resolved.startsWith(`${rootDirectory}/`)) throw conversionError(errorMessage);
  return resolved;
}

function nextXlsxDrawingId(drawing) {
  const ids = descendants(drawing, SPREADSHEET_DRAWING_NS, "cNvPr")
    .map((element) => Number(element.getAttribute("id")))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function insertWorksheetDrawing(worksheet, relationshipId) {
  const drawing = worksheet.createElementNS(SPREADSHEET_NS, "drawing");
  drawing.setAttributeNS(DOC_REL_NS, "r:id", relationshipId);
  const insertBefore = Array.from(worksheet.documentElement.childNodes)
    .find((child) => child.nodeType === 1
      && ["legacyDrawing", "legacyDrawingHF", "picture", "oleObjects", "controls", "webPublishItems", "extLst"].includes(child.localName));
  worksheet.documentElement.insertBefore(drawing, insertBefore || null);
}

async function stampQrOnSpreadsheet(buffer, qrBuffer, document) {
  let archive;
  try {
    archive = await loadOfficeArchive(buffer);
    const workbook = await getXml(archive, "xl/workbook.xml");
    const workbookRelationships = await getXml(archive, "xl/_rels/workbook.xml.rels");
    const relationshipMap = new Map(descendants(workbookRelationships, REL_NS, "Relationship")
      .map((relation) => [relation.getAttribute("Id"), relation.getAttribute("Target")]));
    const contentTypesFile = archive.file("[Content_Types].xml");
    if (!contentTypesFile) throw conversionError("El libro no contiene sus tipos de contenido requeridos.");
    const contentTypes = parseXml(await contentTypesFile.async("string"), "No se pudieron actualizar los recursos del libro.");
    ensurePngContentType(contentTypes);
    const sheets = descendants(workbook, SPREADSHEET_NS, "sheet");
    if (!sheets.length) throw conversionError("El libro no contiene hojas para insertar el QR.");
    const imageBase = `nexo-qr-${String(document.publicId || "document").replace(/[^a-zA-Z0-9-]/g, "")}`;
    let imageIndex = 0;

    for (const sheet of sheets) {
      const sheetRelationshipId = sheet.getAttributeNS(DOC_REL_NS, "id");
      const sheetTarget = relationshipMap.get(sheetRelationshipId);
      if (!sheetTarget) throw conversionError("No se encontró una hoja del libro para insertar el QR.");
      const sheetPath = resolveOfficeTarget("xl", sheetTarget, "xl", "La ruta de una hoja de cálculo no es válida.");
      const worksheet = await getXml(archive, sheetPath);
      const worksheetDirectory = path.posix.dirname(sheetPath);
      const worksheetRelsPath = path.posix.join(worksheetDirectory, "_rels", `${path.posix.basename(sheetPath)}.rels`);
      const worksheetRelsFile = archive.file(worksheetRelsPath);
      const worksheetRelationships = worksheetRelsFile
        ? parseXml(await worksheetRelsFile.async("string"), "No se pudieron actualizar las relaciones de una hoja.")
        : parseXml(`<Relationships xmlns="${REL_NS}"/>`, "No se pudieron crear las relaciones de una hoja.");
      const drawingElements = descendants(worksheet, SPREADSHEET_NS, "drawing");
      if (drawingElements.length > 1) throw conversionError("La hoja contiene referencias de dibujo incompatibles.");

      let drawingPath;
      if (drawingElements.length) {
        const drawingRelation = descendants(worksheetRelationships, REL_NS, "Relationship")
          .find((relation) => relation.getAttribute("Id") === drawingElements[0].getAttributeNS(DOC_REL_NS, "id"));
        if (!drawingRelation || drawingRelation.getAttribute("TargetMode") === "External") {
          throw conversionError("La hoja tiene una referencia de dibujo no válida.");
        }
        drawingPath = resolveOfficeTarget(worksheetDirectory, drawingRelation.getAttribute("Target"), "xl", "La ruta del dibujo de la hoja no es válida.");
      } else {
        drawingPath = `xl/drawings/drawing-nexo-${imageIndex + 1}.xml`;
        let suffix = 1;
        while (archive.file(drawingPath)) {
          drawingPath = `xl/drawings/drawing-nexo-${imageIndex + 1}-${suffix}.xml`;
          suffix += 1;
        }
        const worksheetRelationshipId = nextRelationshipId(worksheetRelationships);
        appendRelationship(
          worksheetRelationships,
          worksheetRelationshipId,
          `${DOC_REL_NS}/drawing`,
          path.posix.relative(worksheetDirectory, drawingPath),
        );
        insertWorksheetDrawing(worksheet, worksheetRelationshipId);
        archive.file(drawingPath, `<xdr:wsDr xmlns:xdr="${SPREADSHEET_DRAWING_NS}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${DOC_REL_NS}"/>`);
        const drawingOverride = contentTypes.createElementNS(CONTENT_TYPES_NS, "Override");
        drawingOverride.setAttribute("PartName", `/${drawingPath}`);
        drawingOverride.setAttribute("ContentType", "application/vnd.openxmlformats-officedocument.drawing+xml");
        contentTypes.documentElement.appendChild(drawingOverride);
      }

      const drawingFile = archive.file(drawingPath);
      if (!drawingFile) throw conversionError("No se encontró la estructura gráfica de una hoja.");
      const drawing = parseXml(await drawingFile.async("string"), "No se pudo abrir la estructura gráfica del libro.");
      const drawingDirectory = path.posix.dirname(drawingPath);
      const drawingRelsPath = path.posix.join(drawingDirectory, "_rels", `${path.posix.basename(drawingPath)}.rels`);
      const drawingRelsFile = archive.file(drawingRelsPath);
      const drawingRelationships = drawingRelsFile
        ? parseXml(await drawingRelsFile.async("string"), "No se pudieron actualizar las imágenes del libro.")
        : parseXml(`<Relationships xmlns="${REL_NS}"/>`, "No se pudieron crear las relaciones de las imágenes.");
      imageIndex += 1;
      let imageName = `${imageBase}-${imageIndex}.png`;
      let imageSuffix = 1;
      while (archive.file(`xl/media/${imageName}`)) {
        imageName = `${imageBase}-${imageIndex}-${imageSuffix}.png`;
        imageSuffix += 1;
      }
      const imagePath = `xl/media/${imageName}`;
      archive.file(imagePath, qrBuffer);
      const imageRelationshipId = nextRelationshipId(drawingRelationships);
      appendRelationship(
        drawingRelationships,
        imageRelationshipId,
        `${DOC_REL_NS}/image`,
        path.posix.relative(drawingDirectory, imagePath),
      );
      const drawingId = nextXlsxDrawingId(drawing);
      const usedColumns = descendants(worksheet, SPREADSHEET_NS, "c")
        .map((cell) => cell.getAttribute("r").match(/^([A-Z]+)/)?.[1] || "")
        .map((letters) => [...letters].reduce((columnIndex, letter) => columnIndex * 26 + letter.charCodeAt(0) - 64, 0) - 1);
      const lastUsedColumn = usedColumns.reduce((max, columnIndex) => Math.max(max, columnIndex), -1);
      const column = Math.min(lastUsedColumn + 1, 16383);
      drawing.documentElement.appendChild(drawing.importNode(createSpreadsheetQrAnchor(imageRelationshipId, drawingId, column), true));

      archive.file(drawingRelsPath, serializeXml(drawingRelationships));
      archive.file(drawingPath, serializeXml(drawing));
      archive.file(worksheetRelsPath, serializeXml(worksheetRelationships));
      archive.file(sheetPath, serializeXml(worksheet));
    }
    archive.file("[Content_Types].xml", serializeXml(contentTypes));
    return await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  } catch (error) {
    if (error.code === "DOCUMENT_CONVERSION") throw error;
    throw conversionError("No se pudo insertar el QR en el libro Excel. Descarga el original y conserva su formato.");
  }
}

function descendants(element, namespace, localName) {
  return Array.from(element.getElementsByTagNameNS(namespace, localName));
}

function nextRelationshipId(relationships) {
  const ids = new Set(descendants(relationships, REL_NS, "Relationship")
    .map((relationship) => relationship.getAttribute("Id")));
  let index = 1;
  while (ids.has(`rId${index}`)) index += 1;
  return `rId${index}`;
}

function appendRelationship(relationships, id, type, target) {
  const relationship = relationships.createElementNS(REL_NS, "Relationship");
  relationship.setAttribute("Id", id);
  relationship.setAttribute("Type", type);
  relationship.setAttribute("Target", target);
  relationships.documentElement.appendChild(relationship);
}

function ensurePngContentType(contentTypes) {
  const hasPng = Array.from(contentTypes.getElementsByTagNameNS(CONTENT_TYPES_NS, "Default"))
    .some((entry) => entry.getAttribute("Extension").toLowerCase() === "png");
  if (!hasPng) {
    const png = contentTypes.createElementNS(CONTENT_TYPES_NS, "Default");
    png.setAttribute("Extension", "png");
    png.setAttribute("ContentType", "image/png");
    contentTypes.documentElement.appendChild(png);
  }
}

async function addHeaderImageRelationship(archive, headerPath, imagePath) {
  const headerDirectory = path.posix.dirname(headerPath);
  const relsPath = path.posix.join(headerDirectory, "_rels", `${path.posix.basename(headerPath)}.rels`);
  const xml = archive.file(relsPath);
  const relationships = xml
    ? parseXml(await xml.async("string"), "No se pudieron actualizar los recursos gráficos del documento Word.")
    : parseXml(`<Relationships xmlns="${REL_NS}"/>`, "No se pudieron actualizar los recursos gráficos del documento Word.");
  const id = nextRelationshipId(relationships);
  appendRelationship(relationships, id, `${DOC_REL_NS}/image`, path.posix.relative(headerDirectory, imagePath));
  archive.file(relsPath, serializeXml(relationships));
  return id;
}

function createWordQrParagraph(imageRelationshipId, drawingId) {
  const xml = `<w:p xmlns:w="${WORD_NS}"
    xmlns:r="${DOC_REL_NS}"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0"
      relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
      <wp:simplePos x="0" y="0"/>
      <wp:positionH relativeFrom="page"><wp:align>right</wp:align></wp:positionH>
      <wp:positionV relativeFrom="page"><wp:posOffset>228600</wp:posOffset></wp:positionV>
      <wp:extent cx="914400" cy="914400"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:wrapNone/>
      <wp:docPr id="${drawingId}" name="Nexo Notarial QR" descr="Código QR de verificación notarial"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="Nexo Notarial QR"/><pic:cNvPicPr/></pic:nvPicPr>
        <pic:blipFill><a:blip r:embed="${imageRelationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
        <pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
        <a:ln><a:noFill/></a:ln></pic:spPr></pic:pic>
      </a:graphicData></a:graphic>
    </wp:anchor></w:drawing></w:r></w:p>`;
  return parseXml(xml, "No se pudo preparar el código QR para el archivo Word.").documentElement;
}

async function addQrToWordHeader(archive, headerPath, imagePath, usedDrawingIds) {
  const existing = archive.file(headerPath);
  const header = existing
    ? parseXml(await existing.async("string"), "No se pudo modificar el encabezado del documento Word.")
    : parseXml(`<w:hdr xmlns:w="${WORD_NS}" xmlns:r="${DOC_REL_NS}"/>`, "No se pudo preparar el encabezado del documento Word.");
  for (const element of descendants(header, WORD_DRAWING_NS, "docPr")) {
    const id = Number(element.getAttribute("id"));
    if (Number.isSafeInteger(id) && id > 0) usedDrawingIds.add(id);
  }
  let drawingId = 1;
  while (usedDrawingIds.has(drawingId)) drawingId += 1;
  usedDrawingIds.add(drawingId);
  const imageRelationshipId = await addHeaderImageRelationship(archive, headerPath, imagePath);
  header.documentElement.appendChild(header.importNode(createWordQrParagraph(imageRelationshipId, drawingId), true));
  archive.file(headerPath, serializeXml(header));
}

function addHeaderReference(section, type, relationshipId) {
  const sectionDocument = section.ownerDocument;
  const reference = sectionDocument.createElementNS(WORD_NS, "w:headerReference");
  reference.setAttributeNS(DOC_REL_NS, "r:id", relationshipId);
  reference.setAttributeNS(WORD_NS, "w:type", type);
  const nextSectionChild = Array.from(section.childNodes)
    .find((child) => child.nodeType === 1
      && !["headerReference", "footerReference"].includes(child.localName));
  section.insertBefore(reference, nextSectionChild || null);
}

async function stampQrOnWord(buffer, qrBuffer, document) {
  let archive;
  try {
    archive = await loadOfficeArchive(buffer);
    const documentFile = archive.file("word/document.xml");
    const typesFile = archive.file("[Content_Types].xml");
    if (!documentFile || !typesFile) throw conversionError("El archivo Word no contiene una estructura DOCX válida.");
    const wordDocument = parseXml(await documentFile.async("string"), "No se pudo leer la estructura del archivo Word.");
    const documentRelsPath = "word/_rels/document.xml.rels";
    const relationshipsFile = archive.file(documentRelsPath);
    const relationships = relationshipsFile
      ? parseXml(await relationshipsFile.async("string"), "No se pudieron actualizar los encabezados del archivo Word.")
      : parseXml(`<Relationships xmlns="${REL_NS}"/>`, "No se pudieron preparar los encabezados del archivo Word.");
    const relationshipById = new Map(descendants(relationships, REL_NS, "Relationship")
      .map((relation) => [relation.getAttribute("Id"), relation]));
    const imageNameBase = `qr-verification-${String(document.publicId || "document").replace(/[^a-zA-Z0-9-]/g, "")}`;
    let imageName = `${imageNameBase}.png`;
    let imageSuffix = 1;
    while (archive.file(`word/media/${imageName}`)) {
      imageName = `${imageNameBase}-${imageSuffix}.png`;
      imageSuffix += 1;
    }
    const imagePath = `word/media/${imageName}`;
    archive.file(imagePath, qrBuffer);
    const contentTypes = parseXml(await typesFile.async("string"), "No se pudieron actualizar los tipos de archivo Word.");
    ensurePngContentType(contentTypes);

    const body = wordDocument.getElementsByTagNameNS(WORD_NS, "body")[0];
    if (!body) throw conversionError("El archivo Word no contiene un cuerpo de documento válido.");
    let sections = descendants(body, WORD_NS, "sectPr");
    if (!sections.length) {
      const section = wordDocument.createElementNS(WORD_NS, "w:sectPr");
      body.appendChild(section);
      sections = [section];
    }

    const imageHeaders = new Set();
    const usedDrawingIds = new Set();
    const newHeaders = new Map();
    for (const section of sections) {
      for (const type of ["default", "first", "even"]) {
        const headerReference = descendants(section, WORD_NS, "headerReference")
          .find((reference) => reference.getAttributeNS(WORD_NS, "type") === type);
        let headerPath;
        if (headerReference) {
          const relation = relationshipById.get(headerReference.getAttributeNS(DOC_REL_NS, "id"));
          if (!relation || relation.getAttribute("TargetMode") === "External") {
            throw conversionError("El encabezado del documento Word tiene una referencia no válida.");
          }
          const target = relation.getAttribute("Target").replace(/^\/+/, "");
          headerPath = path.posix.normalize(target.startsWith("word/") ? target : path.posix.join("word", target));
          if (!headerPath.startsWith("word/")) throw conversionError("La ruta del encabezado Word no es válida.");
        } else {
          headerPath = newHeaders.get(type);
          if (!headerPath) {
            headerPath = `word/header-nexo-${type}.xml`;
            let suffix = 1;
            while (archive.file(headerPath)) {
              headerPath = `word/header-nexo-${type}-${suffix}.xml`;
              suffix += 1;
            }
            const relationshipId = nextRelationshipId(relationships);
            appendRelationship(relationships, relationshipId, `${DOC_REL_NS}/header`, path.posix.basename(headerPath));
            newHeaders.set(type, headerPath);
            addHeaderReference(section, type, relationshipId);
          } else {
            const relation = descendants(relationships, REL_NS, "Relationship")
              .find((entry) => entry.getAttribute("Type") === `${DOC_REL_NS}/header`
                && path.posix.normalize(path.posix.join("word", entry.getAttribute("Target"))) === headerPath);
            if (!relation) throw conversionError("No se pudo enlazar el encabezado de verificación Word.");
            addHeaderReference(section, type, relation.getAttribute("Id"));
          }
        }
        if (!imageHeaders.has(headerPath)) {
          await addQrToWordHeader(archive, headerPath, imagePath, usedDrawingIds);
          imageHeaders.add(headerPath);
        }
      }
    }
    archive.file(documentRelsPath, serializeXml(relationships));
    archive.file("word/document.xml", serializeXml(wordDocument));

    for (const headerPath of newHeaders.values()) {
      const override = contentTypes.createElementNS(CONTENT_TYPES_NS, "Override");
      override.setAttribute("PartName", `/${headerPath}`);
      override.setAttribute("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml");
      contentTypes.documentElement.appendChild(override);
    }
    archive.file("[Content_Types].xml", serializeXml(contentTypes));
    return await archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  } catch (error) {
    if (error.code === "DOCUMENT_CONVERSION") throw error;
    throw conversionError("No se pudo insertar el QR en el documento Word. Descarga el original y conserva su formato.");
  }
}

async function extractDocumentText(buffer, extension) {
  if (extension === ".txt") return buffer.toString("utf8");
  throw conversionError("Solo los archivos TXT requieren una copia PDF de consulta.");
}

function createConvertedPdf(buffer, extension, document) {
  return extractDocumentText(buffer, extension).then((content) => {
    if (content.length > MAX_RENDERED_TEXT_LENGTH) {
      throw conversionError("El contenido supera el límite de conversión a PDF. Descarga el original y la constancia por separado.");
    }
    if (!content.trim()) {
      throw conversionError("No se encontró texto que pueda convertirse. Descarga el original y la constancia por separado.");
    }
    return createPdf((pdf) => {
      pdf.info.Title = `Copia de consulta - ${document.reference}`;
      pdf.info.Author = "Nexo Notarial";
      pdf.fillColor("#203b5c").font("Helvetica-Bold").fontSize(16)
        .text("COPIA DE CONSULTA", PAGE_MARGIN, PAGE_MARGIN, { width: 500 });
      pdf.moveDown(0.35);
      pdf.fillColor("#536579").font("Helvetica").fontSize(9)
        .text(`Referencia: ${document.reference}  |  Original: ${path.basename(document.originalName)}`);
      pdf.text(`Huella SHA-256 del original: ${document.currentHash}`);
      pdf.moveDown(0.55);
      pdf.fillColor("#8a5a1f").font("Helvetica-Bold").fontSize(9)
        .text("El contenido siguiente es una conversión de consulta. Conserve y verifique el archivo original descargado por separado.");
      pdf.moveDown(0.9);
      pdf.fillColor("#1f2937").font("Helvetica").fontSize(9).text(content, {
        width: 500,
        lineGap: 2,
        paragraphGap: 5,
      });
    });
  });
}

async function createQrPng(verificationUrl) {
  return QRCode.toBuffer(verificationUrl, {
    type: "png",
    width: 600,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#123C8CFF", light: "#00000000" },
  });
}

async function createStandaloneQr(verificationUrl) {
  const png = await createQrPng(verificationUrl);
  const pdf = await createPdf((document) => {
    document.image(png, 10, 10, { width: 180, height: 180 });
  }, { size: [200, 200], margin: 0 });
  return { png, pdf };
}

async function stampQrOnEveryPage(pdfBuffer, qrBuffer) {
  let pdf;
  try {
    pdf = await PdfLibDocument.load(pdfBuffer);
  } catch {
    throw conversionError("No se pudo abrir el archivo como PDF. Descarga el original y la constancia por separado.");
  }
  const qrImage = await pdf.embedPng(qrBuffer);
  for (const page of pdf.getPages()) {
    const cropBox = page.getCropBox();
    if (cropBox.width < QR_SIZE + 16 || cropBox.height < QR_SIZE + 16) {
      throw conversionError("Una página del PDF es demasiado pequeña para colocar el QR sin recortarlo.");
    }
    const x = cropBox.x + cropBox.width - QR_SIZE - 8;
    const y = cropBox.y + cropBox.height - QR_SIZE - 8;
    page.drawImage(qrImage, {
      x,
      y,
      width: QR_SIZE,
      height: QR_SIZE,
    });
  }
  return Buffer.from(await pdf.save());
}

async function stampQrOnImage(buffer, extension, qrBuffer) {
  let normalized;
  try {
    normalized = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .png()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw conversionError("La imagen no se pudo procesar. Descarga el original y conserva su archivo.");
  }
  const { width, height } = normalized.info;
  const shortestSide = Math.min(width, height);
  if (width * height > MAX_IMAGE_PIXELS) {
    throw conversionError("La imagen supera el límite de tamaño seguro para generar una copia con QR.");
  }
  const qrSize = Math.min(240, Math.floor(shortestSide * 0.28));
  if (qrSize < 96 || width < qrSize + 16 || height < qrSize + 16) {
    throw conversionError("La imagen es demasiado pequeña para insertar un QR legible sin ampliar sus dimensiones.");
  }
  const qr = await sharp(qrBuffer).resize(qrSize, qrSize).png().toBuffer();
  let output = sharp(normalized.data, { limitInputPixels: MAX_IMAGE_PIXELS })
    .composite([{ input: qr, left: width - qrSize - 8, top: 8 }]);
  output = extension === ".png"
    ? output.png()
    : output.jpeg({ quality: 95, mozjpeg: true });
  return output.toBuffer();
}

async function createQrDocument(buffer, document, verificationUrl) {
  const extension = path.extname(document.originalName).toLowerCase();
  const qrBuffer = await createQrPng(verificationUrl);
  if (extension === ".docx") {
    return {
      buffer: await stampQrOnWord(buffer, qrBuffer, document),
      extension,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
    return {
      buffer: await stampQrOnImage(buffer, extension, qrBuffer),
      extension,
      mimeType: extension === ".png" ? "image/png" : "image/jpeg",
    };
  }
  if (extension === ".xlsx") {
    return {
      buffer: await stampQrOnSpreadsheet(buffer, qrBuffer, document),
      extension,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  const sourcePdf = extension === ".pdf"
    ? buffer
    : await createConvertedPdf(buffer, extension, document);
  return {
    buffer: await stampQrOnEveryPage(sourcePdf, qrBuffer),
    extension: ".pdf",
    mimeType: "application/pdf",
  };
}

module.exports = { createQrDocument, createStandaloneQr, stampQrOnEveryPage };
