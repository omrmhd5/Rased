import fetch from "node-fetch";

/**
 * Fetches competition data from external API
 * @param {string} apiUrl - Full API URL with all query parameters
 * @param {string} referer - Referer header value
 * @returns {Promise<Object>} Parsed competition data
 */
export async function fetchCompetitionFromAPI(apiUrl, referer) {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Referer: referer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const text = await response.text();

    // Check if response is JSONP (starts with callback function name)
    // Format: W3337fd3b105a2ab799242797c2dbe9578d79f494a({...})
    if (text.includes("(") && text.endsWith(")")) {
      // Extract JSON from JSONP callback
      // Match pattern: callbackName({...})
      const match = text.match(/^[^(]+\((.*)\)$/s);
      if (match) {
        try {
          const jsonData = JSON.parse(match[1]);
          return extractCompetitionData(jsonData);
        } catch (parseError) {
          // If parsing fails, try to extract with regex that handles nested objects
          const jsonMatch = text.match(/^[^(]+\((\{.*\})\)$/s);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            return extractCompetitionData(jsonData);
          }
          throw new Error(`Failed to parse JSONP response: ${parseError.message}`);
        }
      } else {
        throw new Error("Failed to extract JSON from JSONP response");
      }
    } else {
      // Try parsing as JSON
      try {
        const jsonData = JSON.parse(text);
        return extractCompetitionData(jsonData);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
  } catch (error) {
    console.error("Error fetching competition from API:", error);
    throw error;
  }
}

/**
 * Extracts competition data from API response
 * @param {Object} apiData - API response data
 * @returns {Object} Competition data
 */
function extractCompetitionData(apiData) {
  if (!apiData || !apiData.match || !Array.isArray(apiData.match) || apiData.match.length === 0) {
    throw new Error("No match data found in API response");
  }

  // Get competition info from first match
  const firstMatch = apiData.match[0];
  const matchInfo = firstMatch.matchInfo;
  const competition = matchInfo?.competition;

  if (!competition) {
    throw new Error("No competition data found in API response");
  }

  return {
    externalId: competition.id,
    competitionCode: competition.competitionCode || "",
    competitionFormat: competition.competitionFormat || "",
    name: competition.knownName || competition.name || "",
    knownName: competition.knownName || "",
  };
}

