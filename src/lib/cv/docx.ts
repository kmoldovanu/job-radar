import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun } from "docx";
import type { TailoredCv } from "../types";
import { dateRange, headingsFor } from "./headings";

const FONT = "Calibri";

function heading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: FONT })],
  });
}

function bullet(text: string) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text, size: 20, font: FONT })] });
}

function lineWithDate(left: string, right: string) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
    spacing: { before: 120 },
    children: [
      new TextRun({ text: left, bold: true, size: 21, font: FONT }),
      new TextRun({ text: right ? `\t${right}` : "", size: 20, font: FONT, color: "444444" }),
    ],
  });
}

function plain(text: string, opts: { size?: number; color?: string; after?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 60 },
    children: [new TextRun({ text, size: opts.size ?? 20, font: FONT, color: opts.color })],
  });
}

export async function renderCvDocx(cv: TailoredCv): Promise<Buffer> {
  const h = headingsFor(cv.language);
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: cv.name, bold: true, size: 40, font: FONT })] }),
  ];
  if (cv.headline) children.push(plain(cv.headline, { size: 23, color: "333333" }));
  const contact = [cv.location, cv.email, cv.phone, ...cv.links].filter(Boolean).join("  |  ");
  if (contact) children.push(plain(contact, { size: 18, color: "333333" }));

  if (cv.summary) children.push(heading(h.summary), plain(cv.summary));
  if (cv.experience.length) {
    children.push(heading(h.experience));
    for (const e of cv.experience) {
      children.push(lineWithDate(`${e.role} — ${e.company}`, dateRange(e.start, e.end, h.present)));
      if (e.location) children.push(plain(e.location, { color: "444444", after: 20 }));
      e.bullets.forEach((b) => children.push(bullet(b)));
    }
  }
  if (cv.projects.length) {
    children.push(heading(h.projects));
    for (const p of cv.projects) {
      children.push(lineWithDate(p.name, ""));
      if (p.description) children.push(plain(p.description));
      p.bullets.forEach((b) => children.push(bullet(b)));
    }
  }
  if (cv.education.length) {
    children.push(heading(h.education));
    for (const e of cv.education) {
      children.push(lineWithDate([e.degree, e.institution].filter(Boolean).join(" — "), dateRange(e.start, e.end, h.present)));
      if (e.details) children.push(plain(e.details));
    }
  }
  if (cv.skills.length) children.push(heading(h.skills), plain(cv.skills.join(", ")));
  if (cv.certifications.length) children.push(heading(h.certifications), plain(cv.certifications.join(", ")));
  if (cv.languages.length) children.push(heading(h.languages), plain(cv.languages.map((l) => `${l.name} (${l.level})`).join(", ")));

  const doc = new Document({
    creator: cv.name,
    title: `CV ${cv.name}`,
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 850, right: 850 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

export async function renderLetterDocx(cv: TailoredCv, letter: string): Promise<Buffer> {
  const contact = [cv.location, cv.email, cv.phone].filter(Boolean).join("  |  ");
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: cv.name, bold: true, size: 32, font: FONT })] }),
    plain(contact, { size: 18, color: "333333", after: 360 }),
    ...letter
      .split(/\n+/)
      .filter((p) => p.trim())
      .map(
        (p) =>
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 160, line: 300 },
            children: [new TextRun({ text: p.trim(), size: 22, font: FONT })],
          }),
      ),
  ];
  const doc = new Document({ creator: cv.name, sections: [{ children }] });
  return Packer.toBuffer(doc);
}
