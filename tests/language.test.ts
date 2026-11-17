import { describe, expect, it } from "vitest";
import { checkLanguage, detectLanguage, userLevels } from "@/lib/filters/language";
import { makeProfile } from "./helpers";

const profile = makeProfile(); // it madrelingua, en C1, es B1

const EN = "We are looking for a data analyst to join our growing team. You will work with stakeholders and our data platform to build dashboards and reports for the business. ";
const DE = "Wir suchen einen Datenanalysten für unser Team in Berlin. Du arbeitest mit den Fachbereichen und bist für die Erstellung von Berichten zuständig. Wir bieten dir eine spannende Aufgabe mit flexiblen Arbeitszeiten und ein tolles Team. ";

describe("detectLanguage", () => {
  it("riconosce inglese, tedesco, italiano", () => {
    expect(detectLanguage(EN.repeat(2))).toBe("en");
    expect(detectLanguage(DE)).toBe("de");
    expect(detectLanguage("Cerchiamo un analista dati per il nostro team di Milano. La persona si occuperà della creazione di report per le aree di business e lavorerà con il team IT per la gestione dei dati e delle analisi.")).toBe("it");
  });
});

describe("userLevels", () => {
  it("usa codice o nome della lingua", () => {
    expect(userLevels(makeProfile({ languages: [{ name: "Tedesco", code: "", level: "B2" }] }))).toEqual({ de: 4 });
  });
});

describe("checkLanguage", () => {
  it("annuncio in inglese: ok", () => {
    expect(checkLanguage(EN, profile).ok).toBe(true);
  });
  it("annuncio scritto in tedesco: scarta", () => {
    const r = checkLanguage(DE, profile);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("tedesco");
  });
  it("richiede tedesco fluente: scarta", () => {
    expect(checkLanguage(EN + "Fluent German (C1) is required.", profile).ok).toBe(false);
    expect(checkLanguage(EN + "Sehr gute Deutschkenntnisse.", profile).ok).toBe(false);
    expect(checkLanguage(EN + "You speak French fluently.", profile).ok).toBe(false);
  });
  it("lingua 'nice to have': ok", () => {
    expect(checkLanguage(EN + "German is a plus.", profile).ok).toBe(true);
    expect(checkLanguage(EN + "Fluent English required; Dutch would be nice to have.", profile).ok).toBe(true);
    expect(checkLanguage(EN + "Knowledge of French is preferred.", profile).ok).toBe(true);
  });
  it("nazionalità, non lingua: ok", () => {
    expect(checkLanguage(EN + "We are a German company with excellent benefits.", profile).ok).toBe(true);
  });
  it("lingue che parlo: ok", () => {
    expect(checkLanguage(EN + "Fluent English and native Italian required.", profile).ok).toBe(true);
  });
  it("spagnolo B1 non basta se richiesto", () => {
    expect(checkLanguage(EN + "Fluent Spanish is mandatory.", profile).ok).toBe(false);
  });
  it("profilo senza lingue: filtro disattivo", () => {
    expect(checkLanguage(DE, makeProfile({ languages: [] })).ok).toBe(true);
  });
});
