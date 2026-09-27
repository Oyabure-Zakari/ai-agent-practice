import { todayWeatherUrl, tomorrowWeatherUrl } from "./urls.js";

// Get the location's current weather data
export const todayWeatherForecast = async (location: string) => {
  if (!location) throw new Error("Please provide a location to check the weather.");
  try {
    const response = await fetch(todayWeatherUrl(location));
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return `
      Weather in ${data.location.name}, ${data.location.country}:
      Condition: ${data.current.condition.text}
      Temperature: ${data.current.temp_c}°C (feels like ${data.current.feelslike_c}°C)
      Chance of rain: ${data.current.chance_of_rain}%
      Humidity: ${data.current.humidity}%
      Wind: ${data.current.wind_kph} km/h ${data.current.wind_dir}
      Visibility: ${data.current.vis_km} km
      Last updated: ${data.current.last_updated}
    `;
  } catch (error: unknown) {
    throw new Error(`Failed to fetch current weather: ${(error as Error).message}`);
  }
};

// Get tomorrow's weather forecast for a location
export const tomorrowWeatherForecast = async (location: string) => {
  if (!location) throw new Error("Please provide a location to check the weather.");
  try {
    const response = await fetch(tomorrowWeatherUrl(location));
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const tomorrow = data.forecast.forecastday[1];
    return `
      Weather forecast for ${data.location.name}, ${data.location.country}:
      Date: ${tomorrow.date}
      Condition: ${tomorrow.day.condition.text}
      Maximum temperature: ${tomorrow.day.maxtemp_c}°C
      Minimum temperature: ${tomorrow.day.mintemp_c}°C
      Chance of rain: ${tomorrow.day.daily_chance_of_rain}%
      Humidity: ${tomorrow.day.avghumidity}%
      Maximum wind: ${tomorrow.day.maxwind_kph} km/h
    `;
  } catch (error: unknown) {
    throw new Error(`Failed to fetch weather forecast: ${(error as Error).message}`);
  }
};
