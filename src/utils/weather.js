const toCelsius = (fahrenheit) => Math.round((fahrenheit - 32) * 5 / 9);

export function generateMockWeather(city = "Malibu") {
  const normalizedCity = city.trim().toLowerCase();
  
  if (normalizedCity.includes("malibu") || normalizedCity.includes("stark mansion") || normalizedCity.includes("house")) {
    return {
      location: "Malibu, CA (Stark Mansion)",
      temp: toCelsius(72),
      condition: "Sunny / Clear Skies",
      humidity: 45,
      windSpeed: "8 mph NW",
      pressure: "1016 hPa",
      status: "Uplink stable. Ambient core temp optimal.",
      radarScanning: true,
      forecast: [
        { day: "MON", temp: toCelsius(72), cond: "Sunny" },
        { day: "TUE", temp: toCelsius(74), cond: "Sunny" },
        { day: "WED", temp: toCelsius(71), cond: "Partly Cloudy" },
        { day: "THU", temp: toCelsius(69), cond: "Clear" },
        { day: "FRI", temp: toCelsius(70), cond: "Clear" }
      ]
    };
  }
  
  if (normalizedCity.includes("new york") || normalizedCity.includes("ny") || normalizedCity.includes("stark tower") || normalizedCity.includes("manhattan")) {
    return {
      location: "Stark Tower, NYC",
      temp: toCelsius(64),
      condition: "Cloudy / Humid",
      humidity: 78,
      windSpeed: "12 mph SSE",
      pressure: "1009 hPa",
      status: "Wind shear at higher levels. Arc Reactor shielding engaged.",
      radarScanning: true,
      forecast: [
        { day: "MON", temp: toCelsius(64), cond: "Cloudy" },
        { day: "TUE", temp: toCelsius(62), cond: "Rain" },
        { day: "WED", temp: toCelsius(60), cond: "Rain" },
        { day: "THU", temp: toCelsius(65), cond: "Overcast" },
        { day: "FRI", temp: toCelsius(68), cond: "Clear" }
      ]
    };
  }

  // Seed-based generation for consistent results
  let seed = 0;
  for (let i = 0; i < normalizedCity.length; i++) {
    seed += normalizedCity.charCodeAt(i);
  }
  
  const temp = 45 + (seed % 45); // 45F to 90F
  const humidity = 20 + (seed % 75); // 20% to 95%
  const windDir = ["N", "NNE", "E", "ESE", "S", "SSW", "W", "WNW"][seed % 8];
  const windSpeed = (4 + (seed % 18)) + " mph " + windDir;
  const pressure = (995 + (seed % 28)) + " hPa";
  
  const conds = ["Clear", "Partly Cloudy", "Foggy", "Rainy", "Overcast", "Windy"];
  const condition = conds[seed % conds.length];
  
  const forecast = [];
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  for (let d = 0; d < 5; d++) {
    forecast.push({
      day: days[d],
      temp: toCelsius(temp + ((seed + d * 3) % 9) - 4),
      cond: conds[(seed + d) % conds.length]
    });
  }

  return {
    location: city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + " (Satellite Sync)",
    temp: toCelsius(temp),
    condition,
    humidity,
    windSpeed,
    pressure,
    status: `Atmospheric scanning complete. Grid sync established.`,
    radarScanning: true,
    forecast
  };
}
