from pathlib import Path
import re

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "INFORME_PROYECTO.md"
OUTPUT = ROOT / "INFORME_PROYECTO.docx"
NAVY = "203B5C"
BLUE = "315D86"
TEAL = "6D9BA8"
INK = "27384A"
MUTED = "64748B"
PALE = "EFF5F7"
RULE = "D9E3E9"


def shade(cell, color):
    properties = cell._tc.get_or_add_tcPr()
    element = OxmlElement("w:shd")
    element.set(qn("w:fill"), color)
    properties.append(element)


def set_cell_border(cell, **edges):
    properties = cell._tc.get_or_add_tcPr()
    borders = properties.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        properties.append(borders)
    for edge, attrs in edges.items():
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        for key, value in attrs.items():
            element.set(qn(f"w:{key}"), str(value))


def add_page_number(paragraph):
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def add_inline(paragraph, text):
    for part in re.split(r"(\*\*.*?\*\*|`.*?`)", text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor.from_string(BLUE)
        else:
            paragraph.add_run(part)


def add_table(document, rows):
    table = document.add_table(rows=1, cols=max(len(row) for row in rows))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = True
    for row_index, values in enumerate(rows):
        cells = table.rows[0].cells if row_index == 0 else table.add_row().cells
        for column, cell in enumerate(cells):
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cell.text = ""
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_before = Pt(3)
            paragraph.paragraph_format.space_after = Pt(3)
            add_inline(paragraph, values[column] if column < len(values) else "")
            if row_index == 0:
                shade(cell, NAVY)
                for run in paragraph.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)
                    run.font.size = Pt(8.5)
            else:
                if row_index % 2 == 0:
                    shade(cell, "F5F8FA")
                for run in paragraph.runs:
                    run.font.size = Pt(8.5)
            cell_borders = {
                "bottom": {"val": "single", "sz": "4", "color": RULE},
            }
            set_cell_border(cell, **cell_borders)
        if row_index == 0:
            row_properties = table.rows[0]._tr.get_or_add_trPr()
            row_properties.append(OxmlElement("w:tblHeader"))
    document.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_cover(document):
    top = document.add_table(rows=1, cols=1)
    top.autofit = False
    top.columns[0].width = Inches(6.8)
    cell = top.cell(0, 0)
    cell.width = Inches(6.8)
    cell.text = ""
    shade(cell, NAVY)
    cell.height = Inches(0.16)
    cell.paragraphs[0].paragraph_format.space_after = Pt(0)

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(75)
    paragraph.paragraph_format.space_after = Pt(8)
    run = paragraph.add_run("NEXO NOTARIAL")
    run.bold = True
    run.font.name = "Aptos Display"
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor.from_string(BLUE)

    paragraph = document.add_paragraph(style="Title")
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(12)
    paragraph.add_run("INFORME TÉCNICO\nDEL PROYECTO")

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(26)
    run = paragraph.add_run(
        "Sistema de gestión documental extraprotocolar\n"
        "y verificación de integridad"
    )
    run.font.size = Pt(15)
    run.font.color.rgb = RGBColor.from_string(MUTED)

    info = document.add_table(rows=3, cols=2)
    info.alignment = WD_TABLE_ALIGNMENT.LEFT
    info.autofit = False
    info.columns[0].width = Inches(1.45)
    info.columns[1].width = Inches(4.9)
    metadata = [
        ("ÁMBITO", "Actuaciones notariales extraprotocolarias · Perú"),
        ("REVISIÓN", "22 de octubre de 2026"),
        ("ESTADO", "Operativo local; publicación externa y anclaje blockchain pendientes"),
    ]
    for index, (label, value) in enumerate(metadata):
        left, right = info.rows[index].cells
        left.width = Inches(1.45)
        right.width = Inches(4.9)
        left.text = label
        right.text = value
        shade(left, PALE)
        for run in left.paragraphs[0].runs:
            run.bold = True
            run.font.size = Pt(8)
            run.font.color.rgb = RGBColor.from_string(BLUE)
        for run in right.paragraphs[0].runs:
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor.from_string(INK)
        for cell in (left, right):
            set_cell_border(cell, bottom={"val": "single", "sz": "5", "color": RULE})

    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(34)
    paragraph.paragraph_format.left_indent = Inches(0.16)
    paragraph.paragraph_format.right_indent = Inches(0.16)
    paragraph.paragraph_format.space_before = Pt(30)
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(
        "Alcance: herramienta de gestión técnica. No sustituye la identificación, "
        "firma, protocolo, fe pública ni las formalidades notariales."
    )
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor.from_string(MUTED)

    document.add_page_break()


def add_contents(document, markdown):
    paragraph = document.add_paragraph(style="Heading 1")
    paragraph.add_run("Contenido")
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(10)
    run = paragraph.add_run("Resumen de las secciones de este informe")
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor.from_string(MUTED)

    headings = re.findall(r"^##\s+(.+)$", markdown, flags=re.MULTILINE)
    for heading in headings:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.left_indent = Inches(0.08)
        paragraph.paragraph_format.space_after = Pt(5)
        paragraph.paragraph_format.keep_together = True
        add_inline(paragraph, heading)
        for run in paragraph.runs:
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor.from_string(BLUE)
    document.add_page_break()


def configure_document(document):
    section = document.sections[0]
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.82)
    section.right_margin = Inches(0.82)
    section.header_distance = Inches(0.32)
    section.footer_distance = Inches(0.35)

    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.08

    title = styles["Title"]
    title.font.name = "Aptos Display"
    title.font.size = Pt(31)
    title.font.bold = True
    title.font.color.rgb = RGBColor.from_string(NAVY)

    for name, size, color in (
        ("Heading 1", 17, NAVY),
        ("Heading 2", 12.5, BLUE),
        ("Heading 3", 10.5, TEAL),
    ):
        style = styles[name]
        style.font.name = "Aptos Display"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.space_before = Pt(12 if name == "Heading 1" else 8)
        style.paragraph_format.space_after = Pt(4)

    for style_name in ("List Bullet", "List Number"):
        styles[style_name].font.name = "Aptos"
        styles[style_name].font.size = Pt(9.5)
        styles[style_name].paragraph_format.space_after = Pt(2)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header.add_run("NEXO NOTARIAL   |   INFORME TÉCNICO").font.color.rgb = RGBColor.from_string(MUTED)
    for run in header.runs:
        run.font.size = Pt(7.5)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run("Documento de trabajo  ·  ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    add_page_number(footer)


def render_markdown(document, markdown):
    lines = markdown.splitlines()
    while lines and not lines[0].startswith("## 1. Resumen ejecutivo"):
        lines.pop(0)
    index = 0
    in_code = False
    code_lines = []
    while index < len(lines):
        text = lines[index]
        value = text.strip()
        if value.startswith("```"):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                paragraph = document.add_paragraph()
                paragraph.paragraph_format.left_indent = Inches(0.12)
                paragraph.paragraph_format.space_before = Pt(2)
                paragraph.paragraph_format.space_after = Pt(6)
                paragraph.paragraph_format.keep_together = True
                properties = paragraph._p.get_or_add_pPr()
                background = OxmlElement("w:shd")
                background.set(qn("w:fill"), "F2F5F7")
                properties.append(background)
                run = paragraph.add_run("\n".join(code_lines))
                run.font.name = "Consolas"
                run.font.size = Pt(8)
                run.font.color.rgb = RGBColor.from_string(INK)
                in_code = False
            index += 1
            continue
        if in_code:
            code_lines.append(text)
            index += 1
            continue
        if not value:
            index += 1
            continue
        if value.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", cell or "-") for cell in cells):
                    rows.append(cells)
                index += 1
            if rows:
                add_table(document, rows)
            continue
        if value.startswith("# "):
            paragraph = document.add_paragraph(style="Title")
            paragraph.paragraph_format.space_after = Pt(12)
            add_inline(paragraph, value[2:])
        elif value.startswith("## "):
            paragraph = document.add_paragraph(style="Heading 1")
            add_inline(paragraph, value[3:])
            ppr = paragraph._p.get_or_add_pPr()
            borders = OxmlElement("w:pBdr")
            bottom = OxmlElement("w:bottom")
            bottom.set(qn("w:val"), "single")
            bottom.set(qn("w:sz"), "8")
            bottom.set(qn("w:space"), "5")
            bottom.set(qn("w:color"), TEAL)
            borders.append(bottom)
            ppr.append(borders)
        elif value.startswith("### "):
            paragraph = document.add_paragraph(style="Heading 2")
            add_inline(paragraph, value[4:])
        elif value.startswith("- "):
            paragraph = document.add_paragraph(style="List Bullet")
            add_inline(paragraph, value[2:])
        elif re.match(r"^\d+\.\s", value):
            paragraph = document.add_paragraph(style="List Number")
            add_inline(paragraph, re.sub(r"^\d+\.\s", "", value))
        elif value.startswith("> "):
            paragraph = document.add_paragraph()
            paragraph.paragraph_format.left_indent = Inches(0.18)
            paragraph.paragraph_format.right_indent = Inches(0.14)
            paragraph.paragraph_format.space_before = Pt(5)
            paragraph.paragraph_format.space_after = Pt(8)
            add_inline(paragraph, value[2:])
            for run in paragraph.runs:
                run.italic = True
                run.font.color.rgb = RGBColor.from_string(BLUE)
        else:
            paragraph = document.add_paragraph()
            add_inline(paragraph, value)
        index += 1


def main():
    markdown = SOURCE.read_text(encoding="utf-8")
    document = Document()
    configure_document(document)
    add_cover(document)
    add_contents(document, markdown)
    render_markdown(document, markdown)
    document.core_properties.title = "Informe técnico del proyecto Nexo Notarial"
    document.core_properties.subject = "Gestión documental extraprotocolar y verificación de integridad"
    document.core_properties.author = "Nexo Notarial"
    document.save(OUTPUT)
    print(f"Informe Word generado: {OUTPUT}")


if __name__ == "__main__":
    main()
