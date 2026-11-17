/**
 * Dati geografici per il filtro di idoneità.
 * Area dove un cittadino UE può lavorare liberamente: UE + Islanda, Liechtenstein, Norvegia, Svizzera.
 */

/** Paesi idonei: codice ISO → nomi in varie lingue (minuscolo, senza accenti). */
export const ELIGIBLE_COUNTRIES: Record<string, string[]> = {
  AT: ["austria", "osterreich", "autriche"],
  BE: ["belgium", "belgio", "belgien", "belgique", "belgica", "belgie"],
  BG: ["bulgaria", "bulgarien", "bulgarie"],
  HR: ["croatia", "croazia", "kroatien", "croatie", "hrvatska"],
  CY: ["cyprus", "cipro", "zypern", "chypre"],
  CZ: ["czech republic", "czechia", "repubblica ceca", "tschechien", "republique tcheque", "cesko"],
  DK: ["denmark", "danimarca", "danemark", "danmark", "danemark"],
  EE: ["estonia", "estland", "estonie"],
  FI: ["finland", "finlandia", "finnland", "finlande", "suomi"],
  FR: ["france", "francia", "frankreich"],
  DE: ["germany", "germania", "deutschland", "allemagne", "alemania"],
  GR: ["greece", "grecia", "griechenland", "grece"],
  HU: ["hungary", "ungheria", "ungarn", "hongrie"],
  IE: ["ireland", "irlanda", "irland", "irlande"],
  IT: ["italy", "italia", "italien", "italie"],
  LV: ["latvia", "lettonia", "lettland", "lettonie"],
  LT: ["lithuania", "lituania", "litauen", "lituanie"],
  LU: ["luxembourg", "lussemburgo", "luxemburg"],
  MT: ["malta", "malte"],
  NL: ["netherlands", "the netherlands", "paesi bassi", "olanda", "holland", "niederlande", "pays-bas", "nederland"],
  PL: ["poland", "polonia", "polen", "pologne", "polska"],
  PT: ["portugal", "portogallo"],
  RO: ["romania", "rumanien", "roumanie"],
  SK: ["slovakia", "slovacchia", "slowakei", "slovaquie"],
  SI: ["slovenia", "slowenien", "slovenie"],
  ES: ["spain", "spagna", "spanien", "espagne", "espana"],
  SE: ["sweden", "svezia", "schweden", "suede", "sverige"],
  IS: ["iceland", "islanda", "island", "islande"],
  LI: ["liechtenstein"],
  NO: ["norway", "norvegia", "norwegen", "norvege", "norge"],
  CH: ["switzerland", "svizzera", "schweiz", "suisse", "swiss"],
};

export const ELIGIBLE_CITIES: string[] = [
  // Italia
  "milan", "milano", "rome", "roma", "turin", "torino", "bologna", "florence", "firenze", "naples", "napoli",
  "genoa", "genova", "padua", "padova", "verona", "bari", "palermo", "trieste", "bergamo", "brescia", "venice",
  "venezia", "catania", "cagliari", "pisa", "modena", "parma", "trento", "bolzano",
  // Germania
  "berlin", "munich", "munchen", "hamburg", "frankfurt", "cologne", "koln", "stuttgart", "dusseldorf", "leipzig",
  "dresden", "nuremberg", "nurnberg", "hannover", "bremen", "karlsruhe", "mannheim", "bonn", "heidelberg",
  // Francia
  "paris", "lyon", "marseille", "toulouse", "lille", "nantes", "bordeaux", "nice", "strasbourg", "montpellier",
  "rennes", "grenoble", "sophia antipolis",
  // Spagna / Portogallo
  "madrid", "barcelona", "valencia", "seville", "sevilla", "malaga", "bilbao", "zaragoza", "palma",
  "lisbon", "lisboa", "porto", "braga", "coimbra",
  // Benelux
  "amsterdam", "rotterdam", "the hague", "den haag", "utrecht", "eindhoven", "groningen", "delft",
  "brussels", "bruxelles", "brussel", "antwerp", "antwerpen", "ghent", "gent", "leuven", "liege",
  // DACH
  "vienna", "wien", "graz", "linz", "salzburg", "innsbruck", "zurich", "geneva", "geneve", "basel", "lausanne",
  "bern", "zug", "lugano", "vaduz",
  // Nord Europa
  "dublin", "cork", "galway", "limerick", "copenhagen", "kobenhavn", "aarhus", "stockholm", "gothenburg",
  "goteborg", "malmo", "uppsala", "oslo", "bergen", "trondheim", "helsinki", "espoo", "tampere", "oulu",
  "reykjavik",
  // Centro-Est
  "warsaw", "warszawa", "krakow", "wroclaw", "gdansk", "poznan", "lodz", "katowice", "prague", "praha", "brno",
  "budapest", "bucharest", "bucuresti", "cluj", "cluj-napoca", "iasi", "timisoara", "sofia", "plovdiv",
  "athens", "thessaloniki", "zagreb", "split", "ljubljana", "bratislava", "kosice", "vilnius", "kaunas", "riga",
  "tallinn", "tartu", "luxembourg city", "valletta", "sliema", "nicosia", "limassol", "larnaca",
];

/** Regioni accettabili per un lavoro remoto. */
export const OK_REGIONS: string[] = [
  "worldwide", "anywhere", "global", "globally", "international", "everywhere", "world", "any location",
  "europe", "european union", "eu", "eea", "emea", "eu timezone", "european timezone", "cet", "cest", "gmt+1",
  "utc+1", "schengen", "dach", "benelux", "nordics", "scandinavia", "western europe", "central europe",
  "southern europe", "eastern europe", "mondo", "ovunque", "europa", "weltweit",
];

/** Regioni non compatibili (se sono le uniche indicate). */
export const BAD_REGIONS: string[] = [
  "north america", "americas", "latam", "latin america", "south america", "central america", "apac", "asia",
  "asia pacific", "oceania", "africa", "middle east", "mena", "us timezone", "us timezones", "est", "pst", "cst",
  "us/canada", "usa/canada", "us & canada", "us and canada",
];

export const BAD_COUNTRIES: string[] = [
  "united states", "united states of america", "usa", "u.s.a.", "u.s.", "us", "america", "canada",
  "united kingdom", "uk", "u.k.", "great britain", "england", "scotland", "wales", "northern ireland",
  "australia", "new zealand", "india", "singapore", "japan", "china", "hong kong", "taiwan", "south korea",
  "korea", "brazil", "brasil", "mexico", "argentina", "colombia", "chile", "peru", "uruguay", "costa rica",
  "south africa", "nigeria", "kenya", "egypt", "morocco", "israel", "united arab emirates", "uae", "saudi arabia",
  "qatar", "turkey", "turkiye", "philippines", "indonesia", "vietnam", "thailand", "malaysia", "pakistan",
  "bangladesh", "sri lanka", "ukraine", "russia", "belarus", "serbia", "georgia", "armenia", "kazakhstan",
  "regno unito", "stati uniti", "vereinigte staaten", "royaume-uni", "etats-unis",
];

export const BAD_CITIES: string[] = [
  "new york", "nyc", "san francisco", "sf bay area", "bay area", "los angeles", "seattle", "austin", "boston",
  "chicago", "denver", "atlanta", "miami", "dallas", "houston", "washington dc", "washington, d.c.", "san diego",
  "san jose", "palo alto", "mountain view", "menlo park", "sunnyvale", "redwood city", "portland", "philadelphia",
  "phoenix", "salt lake city", "minneapolis", "detroit", "pittsburgh", "nashville", "raleigh", "charlotte",
  "toronto", "vancouver", "montreal", "ottawa", "calgary", "waterloo", "london", "manchester", "edinburgh",
  "glasgow", "bristol", "birmingham", "leeds", "belfast", "oxford", "sydney", "melbourne", "brisbane", "perth",
  "auckland", "wellington", "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "gurgaon", "gurugram",
  "noida", "hyderabad", "pune", "chennai", "tokyo", "osaka", "seoul", "shanghai", "beijing", "shenzhen",
  "sao paulo", "rio de janeiro", "mexico city", "ciudad de mexico", "guadalajara", "buenos aires", "bogota",
  "medellin", "santiago", "lima", "tel aviv", "dubai", "abu dhabi", "riyadh", "doha", "istanbul", "cape town",
  "johannesburg", "lagos", "nairobi", "cairo", "manila", "jakarta", "kuala lumpur", "bangkok", "ho chi minh",
  "hanoi", "kyiv", "kiev", "belgrade",
];

export const US_STATES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois",
  IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
  MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana",
  NE: "nebraska", NV: "nevada", NH: "new hampshire", NJ: "new jersey", NM: "new mexico", NY: "new york",
  NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma", OR: "oregon", PA: "pennsylvania",
  RI: "rhode island", SC: "south carolina", SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah",
  VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia", WI: "wisconsin", WY: "wyoming",
  DC: "district of columbia",
};

/** Codici di stato USA che coincidono con codici di paesi idonei (DE=Delaware/Germania, MT=Montana/Malta). */
export const AMBIGUOUS_CODES = new Set(["DE", "MT"]);
