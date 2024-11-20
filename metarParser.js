/**
 * Translate a METAR string into plain language.
 * @param {string} metar - The raw METAR string.
 * @returns {string} - The translated METAR.
 */
function translateMETAR(metar) {
  if (!metar) return "Veuillez fournir une chaîne METAR.";

  try {
    const parts = metar.trim().split(/\s+/);
    const result = [];

    // Decode station identifier
    const station = parts[0];
    result.push(`Station: ${station}`);

    // todo: Decode observation time
    const timeMatch = parts[1]?.match(/^(\d{2})(\d{2})(Z)$/);
    if (timeMatch) {
      const day = timeMatch[1];
      const hour = timeMatch[2];
      result.push(`Observation: Jour ${day}, ${hour}h UTC`);
    }

    // Decode wind
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

    const windMatch = parts.find((part) =>
      /^(\d{3})(\d{2})(G\d{2})?(KT|MPS)$/.test(part)
    );

    if (windMatch) {
      const windDetails = /^(\d{3})(\d{2})(G\d{2})?(KT|MPS)$/.exec(windMatch);

      const direction = windDetails[1]; // Direction (3 digits)
      const speed = windDetails[2]; // Speed (2 digits)
      const gusts = windDetails[3] ? windDetails[3].replace("G", "") : null; // Gusts, if present
      const unit = windDetails[4]; // Unit (KT or MPS)

      const directionText =
        direction === "VRB"
          ? "variable"
          : `${getWindDirection(Number(direction))} (${direction}°)`;

      const speedText = unit === "KT" ? `${speed} nœuds` : `${speed} m/s`;
      const gustsText = gusts
        ? ` avec des rafales jusqu'à ${gusts} ${
            unit === "KT" ? "nœuds" : "m/s"
          }`
        : "";

      result.push(`Vent de ${directionText} à ${speedText}${gustsText}.`);
    }

    // Decode visibility
    const visibility = parts.find((part) => /^\d{4}$/.test(part));
    if (visibility) {
      const visibilityKm = (parseInt(visibility, 10) / 1000).toFixed(1);
      result.push(`Visibilité: ${visibilityKm} km`);
    }

    // Decode weather phenomena
    const weatherPhenomenaMap = {
      TSRA: "Orage avec pluie",
      TS: "Orage",
      RA: "Pluie",
      SHRA: "Averse de pluie légère",
      FZRA: "Pluie verglaçante",
      SN: "Neige",
      SHSN: "Averse de neige légère",
      GR: "Grêle",
      FZGR: "Grêle verglaçante",
      FG: "Brouillard",
      HZ: "Haze (Brume)",
      BR: "Brume légère",
      VC: "Phénomène proche",
      BL: "Blizzard",
      SQ: "Squall (Rafale violente)",
      DS: "Tempête de sable",
      SS: "Tempête de neige",
      RAFG: "Pluie et brouillard",
      TSSN: "Orage de neige",
    };
    const weatherPhenomena = parts.filter((part) =>
      /^[+-]?[A-Z]{2,4}(\d{3})?$/.test(part)
    );

    weatherPhenomena.shift(); // remove station Id that match regexp
    if (weatherPhenomena.length > 0) {
      const weatherText = weatherPhenomena
        .map((phenomenon) => {
          if (phenomenon.startsWith("-")) {
            const phenomenonCode = phenomenon.slice(1);
            return `${weatherPhenomenaMap[phenomenonCode]} faible`;
          }
          return weatherPhenomenaMap[phenomenon];
        })
        .filter((item) => !!item)
        .join(", ");
      result.push(`Phénomènes météo: ${weatherText}.`);
    }

    // Decode cloud cover
    const cloudCover = parts.filter((part) =>
      /^(FEW|SCT|BKN|OVC)\d{3}$/.test(part)
    );
    const cloudDescriptions = {
      FEW: "Couverture nuageuse faible",
      SCT: "Nuages épars",
      BKN: "Nuages nombreux",
      OVC: "Ciel couvert",
      CLR: "Ciel clair",
      NSC: "Pas de nuage particulier",
    };

    cloudCover.forEach((cloud) => {
      const type = cloud.slice(0, 3);
      const altitude = parseInt(cloud.slice(3), 10) * 100; // Convert alt in feet
      if (cloudDescriptions[type]) {
        result.push(`${cloudDescriptions[type]} à ${altitude} ft`);
      }
    });

    // Decode temperature and dew point
    const tempDew = parts.find((part) => /^M?\d{2}\/M?\d{2}$/.test(part));
    if (tempDew) {
      const [temp, dew] = tempDew.split("/");
      result.push(
        `Température: ${temp.replace(
          "M",
          "-"
        )}°C, Point de rosée: ${dew.replace("M", "-")}°C`
      );
    }

    // Decode altimeter setting
    const altimeter = parts.find((part) => /^Q\d{4}$/.test(part));
    if (altimeter) {
      result.push(`Pression atmosphérique: ${altimeter.slice(1)} hPa`);
    }

    return result.join("<br>");
  } catch (error) {
    console.error(error);
    return "Une erreur s'est produite lors de l'analyse du METAR.";
  }
}
