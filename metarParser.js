// Segment types
const SEGMENT_TYPES = {
  STATION: "Station",
  TIME: "Time",
  WIND: "Wind",
  VISIBILITY: "Visibility",
  WEATHER: "Weather",
  CLOUDS: "Clouds",
  TEMP_DEW: "TempDew",
  PRESSURE: "Pressure",
  UNKNOWN: "Unknown",
};

// Matchers for segment types
const matchers = [
  { type: SEGMENT_TYPES.TIME, regex: /^\d{6}Z$/ },
  { type: SEGMENT_TYPES.WIND, regex: /^(VRB|\d{3})(\d{2})(G\d{2})?(KT|MPS)$/ },
  { type: SEGMENT_TYPES.VISIBILITY, regex: /^\d{4}$/ },
  { type: SEGMENT_TYPES.WEATHER, regex: /^[+-]?[A-Z]{2,4}$/ },
  { type: SEGMENT_TYPES.CLOUDS, regex: /^(FEW|SCT|BKN|OVC)\d{3}(CB)?$/ },
  { type: SEGMENT_TYPES.TEMP_DEW, regex: /^M?\d{2}\/M?\d{2}$/ },
  { type: SEGMENT_TYPES.PRESSURE, regex: /^Q\d{4}$/ },
  { type: SEGMENT_TYPES.STATION, regex: /^[A-Z]{4}$/ },
];

// Detect segment type
function detectSegmentType(segment) {
  const matched = matchers.find(({ regex }) => regex.test(segment));
  return matched ? matched.type : SEGMENT_TYPES.UNKNOWN;
}

// Parse METAR/TAF into segments
function parseSegments(metar) {
  if (!metar) return [];
  return metar
    .trim()
    .split(/\s+/)
    .map((segment) => ({
      raw: segment,
      type: detectSegmentType(segment),
    }));
}

// Process specific segments
function processSegment(segment) {
  switch (segment.type) {
    case SEGMENT_TYPES.TIME:
      const day = segment.raw.slice(0, 2);
      const hour = segment.raw.slice(2, 4);
      const minute = segment.raw.slice(4, 6);
      return `Observation effectuée le jour ${day} à ${hour}h${minute} UTC.`;
    case SEGMENT_TYPES.WIND:
      return processWind(segment.raw);
    case SEGMENT_TYPES.VISIBILITY:
      const visibilityKm = (parseInt(segment.raw, 10) / 1000).toFixed(1);
      return `Visibilité: ${visibilityKm} km.`;
    case SEGMENT_TYPES.WEATHER:
      return processWeather(segment.raw);
    case SEGMENT_TYPES.CLOUDS:
      return processClouds(segment.raw);
    case SEGMENT_TYPES.TEMP_DEW:
      const [temp, dew] = segment.raw.split("/");
      return `Température: ${temp.replace(
        "M",
        "-"
      )}°C, Point de rosée: ${dew.replace("M", "-")}°C.`;
    case SEGMENT_TYPES.PRESSURE:
      return `Pression atmosphérique: ${segment.raw.slice(1)} hPa.`;
    case SEGMENT_TYPES.STATION:
      return `Station: ${segment.raw}`;
    default:
      return `Non identifié: ${segment.raw}`;
  }
}

// Helper functions
function getWindDirection(degrees) {
  const directions = [
    "Nord",
    "Nord-Est",
    "Est",
    "Sud-Est",
    "Sud",
    "Sud-Ouest",
    "Ouest",
    "Nord-Ouest",
  ];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function processWind(raw) {
  const windDetails = /^(VRB|\d{3})(\d{2})(G\d{2})?(KT|MPS)$/.exec(raw);
  const direction = windDetails[1];
  const speed = windDetails[2];
  const gusts = windDetails[3] ? windDetails[3].replace("G", "") : null;
  const unit = windDetails[4];
  const directionText =
    direction === "VRB"
      ? "vent variable"
      : `${getWindDirection(Number(direction))} (${direction}°)`;
  const speedText = unit === "KT" ? `${speed} nœuds` : `${speed} m/s`;
  const gustsText = gusts
    ? ` avec des rafales jusqu'à ${gusts} ${unit === "KT" ? "nœuds" : "m/s"}`
    : "";
  return `Vent de ${directionText} à ${speedText}${gustsText}.`;
}

function processWeather(raw) {
  const weatherPhenomenaMap = {
    TSRA: "Orage avec pluie",
    TS: "Orage",
    RA: "Pluie",
    SHRA: "Averse de pluie légère",
    FZRA: "Pluie verglaçante",
    SN: "Neige",
    GR: "Grêle",
    FG: "Brouillard",
    HZ: "Haze (Brume)",
    BR: "Brume légère",
  };
  const intensity = raw.startsWith("-")
    ? "faible"
    : raw.startsWith("+")
    ? "fort"
    : "";
  const phenomenon = raw.replace(/^[-+]/, "");
  return weatherPhenomenaMap[phenomenon]
    ? `${weatherPhenomenaMap[phenomenon]} ${intensity}`.trim()
    : `Station: ${raw}`; // if not phenomenon, it's a station by default
}

function processClouds(raw) {
  const cloudDescriptions = {
    FEW: "Couverture nuageuse faible",
    SCT: "Nuages épars",
    BKN: "Nuages nombreux",
    OVC: "Ciel couvert",
  };
  const type = raw.slice(0, 3);
  const altitude = parseInt(raw.slice(3, 6), 10) * 100;
  const isCumulonimbus = raw.endsWith("CB");
  const cumulonimbusText = isCumulonimbus ? " (avec Cumulonimbus)" : "";
  return cloudDescriptions[type]
    ? `${cloudDescriptions[type]} à ${altitude} ft${cumulonimbusText}.`
    : `Nuages inconnus: ${raw}`;
}

// Translate METAR
function translateMETAR(metar) {
  const segments = parseSegments(metar);
  const translations = segments.map(processSegment);
  return translations.join("\n");
}
