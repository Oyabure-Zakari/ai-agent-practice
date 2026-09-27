import "dotenv/config";

export const todayWeatherUrl = (location: string) =>
  `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_API_KEY}&q=${location}&aqi=no`;
export const tomorrowWeatherUrl = (location: string) =>
  `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHERAPI_API_KEY}&q=${encodeURIComponent(location)}&days=2&aqi=no&alerts=yes`;
