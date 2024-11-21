/**
 * Translate a METAR/TAF string into plain language.
 * @param {string} report - The raw METAR/TAF string.
 * @returns {string} - The translated report.
 */
function translateMETAR(report) {
  if (!report) return "Veuillez fournir une chaîne METAR ou TAF.";

  try {
    const parts = report.trim().split(/\s+/);
    const result = [];

    // Decode station identifier
    const station = parts[0];
    result.push(`Station: ${station}`);

    // Decode observation or validity time
    const timeMatch = parts.find((part) => /^\d{6}Z$/.test(part));
    const validityMatch = parts.find((part) => /^\d{4}\/\d{4}$/.test(part));

    if (timeMatch) {
      const day = timeMatch.slice(0, 2); // Jour du mois
      const hour = timeMatch.slice(2, 4); // Heure
      const minute = timeMatch.slice(4, 6); // Minute
      result.push(
        `Observation effectuée le jour ${day} à ${hour}h${minute} UTC.`
      );
    } else if (validityMatch) {
      const [startDay, startHour] = [
        validityMatch.slice(0, 2),
        validityMatch.slice(2, 4),
      ];
      const [endDay, endHour] = [
        validityMatch.slice(5, 7),
        validityMatch.slice(7, 9),
      ];
      result.push(
        `Période de validité : du jour ${startDay} à ${startHour}h00 UTC au jour ${endDay} à ${endHour}h00 UTC.`
      );
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

    // Decode wind
    const windMatch = parts.find((part) =>
      /^(VRB|\d{3})(\d{2})(G\d{2})?(KT|MPS)$/.test(part)
    );

    if (windMatch) {
      const windDetails = /^(VRB|\d{3})(\d{2})(G\d{2})?(KT|MPS)$/.exec(
        windMatch
      );

      const direction = windDetails[1]; // Direction (3 digits or "VRB")
      const speed = windDetails[2]; // Speed (2 digits)
      const gusts = windDetails[3] ? windDetails[3].replace("G", "") : null; // Gusts, if present
      const unit = windDetails[4]; // Unit (KT or MPS)

      const directionText =
        direction === "VRB"
          ? "Vent variable"
          : `${getWindDirection(Number(direction))} (${direction}°)`;

      const speedText = unit === "KT" ? `${speed} nœuds` : `${speed} m/s`;
      const gustsText = gusts
        ? ` avec des rafales jusqu'à ${gusts} ${
            unit === "KT" ? "nœuds" : "m/s"
          }`
        : "";

      result.push(
        direction === "VRB"
          ? `${directionText} à ${speedText}${gustsText}.`
          : `Vent de ${directionText} à ${speedText}${gustsText}.`
      );
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
      if (weatherText) {
        result.push(`Phénomènes météo: ${weatherText}.`);
      }
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
    };

    cloudCover.forEach((cloud) => {
      const type = cloud.slice(0, 3);
      const altitude = parseInt(cloud.slice(3), 10) * 100;
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

    // Decode TAF-specific changes
    const tafChanges = parts.filter((part) => /^(FM|BECMG)\d{6}$/.test(part));
    tafChanges.forEach((change) => {
      const type = change.startsWith("FM") ? "À partir de" : "Évolution vers";
      const day = change.slice(2, 4);
      const hour = change.slice(4, 6);
      const minute = change.slice(6, 8);
      result.push(`${type} le jour ${day} à ${hour}h${minute} UTC.`);
    });

    return result.join("<br>");
  } catch (error) {
    console.error(error);
    return "Une erreur s'est produite lors de l'analyse du METAR/TAF.";
  }
}
