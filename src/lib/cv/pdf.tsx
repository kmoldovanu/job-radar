import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { TailoredCv } from "../types";
import { dateRange, headingsFor } from "./headings";

// Font standard Helvetica: testo selezionabile e leggibile dagli ATS, una colonna.
const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 42, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.35, color: "#111" },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 4 },
  headline: { fontSize: 11.5, marginTop: 2, color: "#333" },
  contact: { fontSize: 9, marginTop: 4, color: "#333" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 0.8, borderBottomColor: "#999", textTransform: "uppercase" },
  rowHead: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#444" },
  item: { marginBottom: 6 },
  bullet: { flexDirection: "row", marginLeft: 6, marginTop: 1 },
  dot: { width: 10 },
  bulletText: { flex: 1 },
  para: { marginBottom: 8, textAlign: "left" },
});

export function CvDocument({ cv }: { cv: TailoredCv }) {
  const h = headingsFor(cv.language);
  const contact = [cv.location, cv.email, cv.phone, ...cv.links].filter(Boolean).join("  |  ");
  return (
    <Document title={`CV ${cv.name}`} author={cv.name} language={cv.language}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{cv.name}</Text>
        {cv.headline ? <Text style={s.headline}>{cv.headline}</Text> : null}
        {contact ? <Text style={s.contact}>{contact}</Text> : null}

        {cv.summary ? (
          <View>
            <Text style={s.h2}>{h.summary}</Text>
            <Text>{cv.summary}</Text>
          </View>
        ) : null}

        {cv.experience.length ? (
          <View>
            <Text style={s.h2}>{h.experience}</Text>
            {cv.experience.map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.rowHead}>
                  <Text style={s.bold}>{e.role} — {e.company}</Text>
                  <Text style={s.muted}>{dateRange(e.start, e.end, h.present)}</Text>
                </View>
                {e.location ? <Text style={s.muted}>{e.location}</Text> : null}
                {e.bullets.map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {cv.projects.length ? (
          <View>
            <Text style={s.h2}>{h.projects}</Text>
            {cv.projects.map((p, i) => (
              <View key={i} style={s.item}>
                <Text style={s.bold}>{p.name}</Text>
                {p.description ? <Text>{p.description}</Text> : null}
                {p.bullets.map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {cv.education.length ? (
          <View>
            <Text style={s.h2}>{h.education}</Text>
            {cv.education.map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.rowHead}>
                  <Text style={s.bold}>{[e.degree, e.institution].filter(Boolean).join(" — ")}</Text>
                  <Text style={s.muted}>{dateRange(e.start, e.end, h.present)}</Text>
                </View>
                {e.details ? <Text>{e.details}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {cv.skills.length ? (
          <View>
            <Text style={s.h2}>{h.skills}</Text>
            <Text>{cv.skills.join(", ")}</Text>
          </View>
        ) : null}

        {cv.certifications.length ? (
          <View>
            <Text style={s.h2}>{h.certifications}</Text>
            <Text>{cv.certifications.join(", ")}</Text>
          </View>
        ) : null}

        {cv.languages.length ? (
          <View>
            <Text style={s.h2}>{h.languages}</Text>
            <Text>{cv.languages.map((l) => `${l.name} (${l.level})`).join(", ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function LetterDocument({ name, contact, letter, lang }: { name: string; contact: string; letter: string; lang: string }) {
  return (
    <Document title={`${headingsFor(lang).letter} — ${name}`} author={name} language={lang}>
      <Page size="A4" style={{ ...s.page, fontSize: 11, lineHeight: 1.5 }}>
        <Text style={s.name}>{name}</Text>
        {contact ? <Text style={[s.contact, { marginBottom: 18 }]}>{contact}</Text> : null}
        {letter
          .split(/\n{2,}|\n/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <Text key={i} style={s.para}>
              {p.trim()}
            </Text>
          ))}
      </Page>
    </Document>
  );
}

export async function renderCvPdf(cv: TailoredCv): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} />);
}

export async function renderLetterPdf(cv: TailoredCv, letter: string): Promise<Buffer> {
  const contact = [cv.location, cv.email, cv.phone].filter(Boolean).join("  |  ");
  return renderToBuffer(<LetterDocument name={cv.name} contact={contact} letter={letter} lang={cv.language} />);
}
