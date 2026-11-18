import { describe, expect, it } from "vitest";
import * as adzuna from "@/lib/sources/adzuna";
import * as arbeitnow from "@/lib/sources/arbeitnow";
import * as ashby from "@/lib/sources/ashby";
import { parseCareersUrl, prettyName } from "@/lib/sources/careers";
import * as greenhouse from "@/lib/sources/greenhouse";
import * as himalayas from "@/lib/sources/himalayas";
import * as jobicy from "@/lib/sources/jobicy";
import * as lever from "@/lib/sources/lever";
import * as manual from "@/lib/sources/manual";
import * as remoteok from "@/lib/sources/remoteok";
import { dedupeKey, htmlToText, toDate } from "@/lib/sources/util";

describe("util", () => {
  it("htmlToText rimuove tag ed entità, anche se l'HTML è escaped", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b></p><ul><li>One</li><li>Two</li></ul>")).toBe("Hello world\n\n• One\n• Two");
    expect(htmlToText("&lt;p&gt;Escaped &amp;amp; ok&lt;/p&gt;")).toBe("Escaped & ok");
  });
  it("toDate gestisce secondi, millisecondi e stringhe", () => {
    expect(toDate(1700000000)?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(toDate(1700000000000)?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(toDate("2024-05-01 10:00:00")?.toISOString()).toBe("2024-05-01T10:00:00.000Z");
    expect(toDate("non una data")).toBeNull();
  });
  it("dedupeKey ignora forma giuridica e maiuscole", () => {
    expect(dedupeKey("Acme GmbH", "Senior Data Analyst (m/f/d)")).toBe(dedupeKey("acme", "Senior Data Analyst"));
  });
});

describe("Himalayas", () => {
  const data = {
    jobs: [
      {
        title: "Data Analyst",
        companyName: "Remotely",
        description: "<p>Analyze data</p>",
        pubDate: 1700000000,
        applicationLink: "https://remotely.com/apply/1",
        guid: "https://himalayas.app/companies/remotely/jobs/data-analyst",
        locationRestrictions: ["Germany", "Italy"],
        timezoneRestrictions: [1, 2],
        minSalary: 50000,
        maxSalary: 70000,
        currency: "EUR",
        categories: ["Data"],
      },
      { title: "", applicationLink: "x" },
    ],
  };
  it("normalizza i campi e usa applicationLink come link", () => {
    const [j, ...rest] = himalayas.parse(data);
    expect(rest).toHaveLength(0);
    expect(j.url).toBe("https://remotely.com/apply/1");
    expect(j.sourceUrl).toContain("himalayas.app");
    expect(j.workMode).toBe("remote");
    expect(j.locationRestrictions).toEqual(["Germany", "Italy"]);
    expect(j.timezoneRestrictions).toEqual([1, 2]);
    expect(j.postedAt?.getTime()).toBe(1700000000000);
    expect(j.description).toBe("Analyze data");
    expect(j.salary).toContain("EUR");
  });
  it("accetta restrizioni come oggetti", () => {
    const [j] = himalayas.parse({ jobs: [{ ...data.jobs[0], locationRestrictions: [{ name: "Spain" }] }] });
    expect(j.locationRestrictions).toEqual(["Spain"]);
  });
  it("input non valido → lista vuota", () => {
    expect(himalayas.parse(null)).toEqual([]);
    expect(himalayas.parse({ foo: 1 })).toEqual([]);
  });
});

describe("Remote OK", () => {
  it("salta l'avviso legale iniziale e usa il link diretto di candidatura", () => {
    const jobs = remoteok.parse([
      { legal: "API Terms of Service..." },
      {
        id: "123",
        epoch: 1700000000,
        company: "Foo",
        position: "Backend Engineer",
        tags: ["python"],
        description: "<p>Build things</p>",
        location: "Worldwide",
        url: "https://remoteok.com/remote-jobs/123",
        apply_url: "https://foo.com/apply",
      },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].url).toBe("https://foo.com/apply");
    expect(jobs[0].sourceUrl).toBe("https://remoteok.com/remote-jobs/123");
    expect(jobs[0].company).toBe("Foo");
    expect(jobs[0].locationRestrictions).toEqual(["Worldwide"]);
    expect(jobs[0].tags).toEqual(["python"]);
  });
});

describe("Jobicy", () => {
  it("legge jobGeo e la data", () => {
    const [j] = jobicy.parse({
      jobs: [
        {
          id: 77,
          url: "https://jobicy.com/jobs/77",
          jobTitle: "Product Manager &amp; Owner",
          companyName: "Bar",
          jobGeo: "EMEA",
          jobDescription: "<p>Own the roadmap</p>",
          pubDate: "2024-05-01 10:00:00",
          jobType: ["full-time"],
        },
      ],
    });
    expect(j.title).toBe("Product Manager & Owner");
    expect(j.locationRestrictions).toEqual(["EMEA"]);
    expect(j.postedAt?.toISOString()).toBe("2024-05-01T10:00:00.000Z");
  });
});

describe("Arbeitnow", () => {
  it("legge remote e visa_sponsorship", () => {
    const jobs = arbeitnow.parse({
      data: [
        { slug: "a", company_name: "Baz", title: "Dev", description: "<p>x</p>", remote: false, url: "https://arbeitnow.com/a", location: "Berlin", created_at: 1700000000, visa_sponsorship: true },
        { slug: "b", company_name: "Baz", title: "Dev 2", description: "x", remote: true, url: "https://arbeitnow.com/b", location: "", created_at: 1700000000 },
      ],
    });
    expect(jobs[0].workMode).toBe("onsite");
    expect(jobs[0].visaSponsorship).toBe(true);
    expect(jobs[1].workMode).toBe("remote");
    expect(jobs[1].visaSponsorship).toBeNull();
  });
});

describe("Adzuna", () => {
  it("aggiunge il paese e indovina la modalità", () => {
    const [j] = adzuna.parse(
      {
        results: [
          {
            id: "999",
            title: "<strong>Data</strong> Analyst",
            description: "Hybrid role in our Munich office",
            created: "2024-05-01T10:00:00Z",
            redirect_url: "https://adzuna.de/land/ad/999",
            company: { display_name: "Qux AG" },
            location: { display_name: "München, Bayern", area: ["Deutschland", "Bayern", "München"] },
            salary_min: 50000,
            salary_max: 60000,
          },
        ],
      },
      "de",
    );
    expect(j.title).toBe("Data Analyst");
    expect(j.location).toBe("München, Bayern, Germany");
    expect(j.workMode).toBe("hybrid");
    expect(j.company).toBe("Qux AG");
  });
});

describe("Greenhouse / Lever / Ashby", () => {
  it("Greenhouse decodifica il contenuto escaped", () => {
    const [j] = greenhouse.parse(
      { jobs: [{ id: 5, title: "Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/5", location: { name: "Remote - Europe" }, content: "&lt;p&gt;Great job&lt;/p&gt;", updated_at: "2024-05-01T00:00:00Z" }] },
      "Acme",
      "acme",
    );
    expect(j.description).toBe("Great job");
    expect(j.workMode).toBe("remote");
    expect(j.id).toBe("greenhouse:acme:5");
  });
  it("Lever usa workplaceType e le liste", () => {
    const [j] = lever.parse(
      [
        {
          id: "abc",
          text: "Designer",
          hostedUrl: "https://jobs.lever.co/acme/abc",
          categories: { location: "Amsterdam", team: "Design", allLocations: ["Amsterdam", "Berlin"] },
          workplaceType: "hybrid",
          descriptionPlain: "Intro",
          lists: [{ text: "Requirements", content: "<li>Figma</li>" }],
          createdAt: 1700000000000,
        },
      ],
      "Acme",
      "acme",
    );
    expect(j.workMode).toBe("hybrid");
    expect(j.locationRestrictions).toEqual(["Amsterdam", "Berlin"]);
    expect(j.description).toContain("Figma");
  });
  it("Ashby salta gli annunci non pubblicati", () => {
    const jobs = ashby.parse(
      {
        jobs: [
          { id: "1", title: "PM", jobUrl: "https://jobs.ashbyhq.com/acme/1", location: "Paris", isRemote: false, workplaceType: "OnSite", descriptionPlain: "x", publishedAt: "2024-05-01T00:00:00Z", isListed: true },
          { id: "2", title: "Hidden", jobUrl: "https://jobs.ashbyhq.com/acme/2", isListed: false },
        ],
      },
      "Acme",
      "acme",
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].workMode).toBe("onsite");
  });
});

describe("pagine carriere", () => {
  it("riconosce gli URL delle board", () => {
    expect(parseCareersUrl("https://boards.greenhouse.io/stripe")).toEqual({ ats: "greenhouse", token: "stripe" });
    expect(parseCareersUrl("https://job-boards.eu.greenhouse.io/acme/jobs/123")).toEqual({ ats: "greenhouse", token: "acme" });
    expect(parseCareersUrl("https://boards.greenhouse.io/embed/job_board?for=foo")).toEqual({ ats: "greenhouse", token: "foo" });
    expect(parseCareersUrl("https://jobs.lever.co/netflix/xyz")).toEqual({ ats: "lever", token: "netflix" });
    expect(parseCareersUrl("https://jobs.eu.lever.co/acme")).toEqual({ ats: "lever", token: "eu:acme" });
    expect(parseCareersUrl("https://jobs.ashbyhq.com/Ramp")).toEqual({ ats: "ashby", token: "Ramp" });
    expect(parseCareersUrl("https://example.com/careers")).toBeNull();
    expect(prettyName("acme-corp")).toBe("Acme Corp");
  });
});

describe("annuncio manuale", () => {
  it("valida e normalizza", () => {
    const input = manual.manualJobSchema.parse({
      title: "Analyst",
      company: "LinkedIn Co",
      url: "https://www.linkedin.com/jobs/view/123?trk=abc",
      location: "Remote, Europe",
      description: "A long description of the job that is at least thirty characters.",
    });
    const j = manual.parse(input);
    expect(j.id).toBe("manual:https://www.linkedin.com/jobs/view/123");
    expect(j.workMode).toBe("remote");
    expect(() => manual.manualJobSchema.parse({ title: "x", company: "", url: "nope", description: "" })).toThrow();
  });
});

describe("Remote OK senza apply_url", () => {
  it("ripiega sul link Remote OK", () => {
    const [j] = remoteok.parse([{ legal: "x" }, { id: "9", position: "Dev", company: "Foo", url: "https://remoteok.com/remote-jobs/9", apply_url: "" }]);
    expect(j.url).toBe("https://remoteok.com/remote-jobs/9");
  });
});

describe("ricerca sul sito dell'azienda", () => {
  it("compila la query Google", async () => {
    const { companySearchUrl } = await import("@/lib/client");
    expect(companySearchUrl("Acme GmbH", "Data Analyst")).toBe(
      "https://www.google.com/search?q=%22Acme%20GmbH%22%20Data%20Analyst%20careers",
    );
  });
});
