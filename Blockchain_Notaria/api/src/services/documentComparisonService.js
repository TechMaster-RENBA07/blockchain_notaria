const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");

const MAX_DIFF_LINES = 1500;
const MAX_DIFF_CHARACTERS = 500_000;
const MAX_OFFICE_ARCHIVE_BYTES = 50 * 1024 * 1024;

function comparisonInputError(message) {
  const error = new Error(message);
  error.code = "INVALID_COMPARISON_FILE";
  return error;
}

function parseXml(xml) {
  const errors = [];
  const document = new DOMParser({
    onError: (level, message) => {
      if (level === "error" || level === "fatalError") errors.push(message);
    },
  }).parseFromString(xml, "application/xml");
  if (errors.length || !document.documentElement) {
    throw comparisonInputError("No se pudo leer el contenido interno del documento.");
  }
  return document;
}

async function extractOfficeText(buffer, extension) {
  let archive;
  try {
    archive = await JSZip.loadAsync(buffer, { checkCRC32: false });
  } catch {
    throw comparisonInputError("El archivo Office está dañado o no se puede leer para comparar.");
  }
  const uncompressedLength = Object.values(archive.files)
    .reduce((total, entry) => total + (entry.dir ? 0 : entry._data?.uncompressedSize || 0), 0);
  if (uncompressedLength > MAX_OFFICE_ARCHIVE_BYTES) {
    throw comparisonInputError("El contenido descomprimido del archivo Office supera el límite seguro de comparación.");
  }

  if (extension === ".docx") {
    const body = archive.file("word/document.xml");
    if (!body) throw comparisonInputError("El documento Word no contiene el texto principal esperado.");
    const xml = parseXml(await body.async("string"));
    return Array.from(xml.getElementsByTagName("w:p"))
      .map((paragraph) => paragraph.textContent.trim())
      .filter(Boolean)
      .join("\n");
  }

  const sharedFile = archive.file("xl/sharedStrings.xml");
  const sharedStrings = sharedFile
    ? Array.from(parseXml(await sharedFile.async("string")).getElementsByTagName("si"))
      .map((item) => item.textContent)
    : [];
  const sheetPaths = Object.keys(archive.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sheets = [];

  for (const sheetPath of sheetPaths) {
    const xml = parseXml(await archive.file(sheetPath).async("string"));
    const rows = Array.from(xml.getElementsByTagName("row")).map((row) => {
      const cells = Array.from(row.getElementsByTagName("c")).map((cell) => {
        if (cell.getAttribute("t") === "inlineStr") {
          return cell.getElementsByTagName("is")[0]?.textContent || "";
        }
        const value = cell.getElementsByTagName("v")[0]?.textContent || "";
        return cell.getAttribute("t") === "s" ? sharedStrings[Number(value)] || "" : value;
      });
      return cells.join("\t");
    });
    sheets.push(rows.join("\n"));
  }
  return sheets.join("\n\n");
}

async function extractPdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    stopAtErrors: true,
  });
  let pdf;
  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > 2000) return null;
    const pages = [];
    let extractedLength = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str || "").join(" ");
      extractedLength += pageText.length;
      if (extractedLength > MAX_DIFF_CHARACTERS) return null;
      pages.push(pageText);
      page.cleanup();
    }
    return pages.join("\n");
  } catch {
    throw comparisonInputError("El PDF está dañado o no se puede extraer su texto para comparar.");
  } finally {
    if (pdf) await pdf.destroy();
  }
}

async function extractComparableText(file) {
  const extension = file.extension.toLowerCase();
  let text;
  if (extension === ".txt") text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (extension === ".docx" || extension === ".xlsx") {
    text = await extractOfficeText(file.buffer, extension);
  }
  if (extension === ".pdf") text = await extractPdfText(file.buffer);
  return text?.trim() ? text : null;
}

function makeLineDiff(leftText, rightText) {
  const leftLines = leftText.replace(/\r\n?/g, "\n").split("\n");
  const rightLines = rightText.replace(/\r\n?/g, "\n").split("\n");
  if (leftLines.length > MAX_DIFF_LINES || rightLines.length > MAX_DIFF_LINES
    || leftText.length + rightText.length > MAX_DIFF_CHARACTERS) {
    return {
      available: false,
      reason: `El contenido supera el límite de comparación visual (${MAX_DIFF_LINES} líneas o ${MAX_DIFF_CHARACTERS} caracteres por pareja). Los hashes sí se compararon completos.`,
      chunks: [],
      addedLines: 0,
      removedLines: 0,
    };
  }

  const width = rightLines.length + 1;
  const table = new Uint16Array((leftLines.length + 1) * width);
  for (let left = leftLines.length - 1; left >= 0; left -= 1) {
    for (let right = rightLines.length - 1; right >= 0; right -= 1) {
      const index = left * width + right;
      table[index] = leftLines[left] === rightLines[right]
        ? table[(left + 1) * width + right + 1] + 1
        : Math.max(table[(left + 1) * width + right], table[left * width + right + 1]);
    }
  }

  const chunks = [];
  let addedLines = 0;
  let removedLines = 0;
  const append = (type, text) => {
    const last = chunks[chunks.length - 1];
    if (last?.type === type) last.lines.push(text);
    else chunks.push({ type, lines: [text] });
  };
  let left = 0;
  let right = 0;
  while (left < leftLines.length && right < rightLines.length) {
    if (leftLines[left] === rightLines[right]) {
      append("unchanged", leftLines[left]);
      left += 1;
      right += 1;
    } else if (table[(left + 1) * width + right] >= table[left * width + right + 1]) {
      append("removed", leftLines[left]);
      removedLines += 1;
      left += 1;
    } else {
      append("added", rightLines[right]);
      addedLines += 1;
      right += 1;
    }
  }
  while (left < leftLines.length) {
    append("removed", leftLines[left]);
    removedLines += 1;
    left += 1;
  }
  while (right < rightLines.length) {
    append("added", rightLines[right]);
    addedLines += 1;
    right += 1;
  }

  return { available: true, reason: null, chunks, addedLines, removedLines };
}

async function compareFiles(leftFile, rightFile) {
  const [leftText, rightText] = await Promise.all([
    extractComparableText(leftFile),
    extractComparableText(rightFile),
  ]);
  const textComparable = leftText !== null && rightText !== null;
  const diff = textComparable
    ? makeLineDiff(leftText, rightText)
    : { available: false, reason: "Se calcularon las huellas completas. No se encontró texto extraíble en ambos archivos (por ejemplo, un PDF escaneado); las imágenes se revisan visualmente lado a lado.", chunks: [], addedLines: 0, removedLines: 0 };

  return {
    textComparable,
    diff,
  };
}

module.exports = { compareFiles };
