/** Estrae il testo da un CV caricato (PDF o DOCX). */
export async function extractCvText(file: { name: string; type: string; bytes: Uint8Array }): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(file.bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text).trim();
  }
  if (name.endsWith(".docx") || file.type.includes("officedocument.wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return value.trim();
  }
  throw new Error("Formato non supportato: carica un PDF o un DOCX");
}
