import { useEffect, useState, useSyncExternalStore } from 'react';
import './App.css';

function formatTime(unixSeconds, timezoneOffsetSeconds = 0) {
  if (!unixSeconds) return '--';

  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);

  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function toWindDirection(degrees) {
  if (typeof degrees !== 'number') return '--';

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % directions.length;

  return directions[index];
}

function getWeatherTheme(weatherData) {
  const conditionId = weatherData?.weather?.[0]?.id ?? 800;
  const icon = weatherData?.weather?.[0]?.icon ?? '01d';
  const isNight = icon.endsWith('n');

  if (conditionId >= 200 && conditionId < 300) {
    return {
      slug: 'thunderstorm',
      label: 'Electric storm',
      accent: '#c7d2fe',
      accentSoft: 'rgba(199, 210, 254, 0.12)',
      bgStart: '#11172c',
      bgEnd: '#050914',
      panel: 'rgba(11, 17, 34, 0.76)',
      border: 'rgba(199, 210, 254, 0.15)',
      glow: 'rgba(151, 164, 255, 0.24)',
    };
  }

  if (conditionId >= 300 && conditionId < 600) {
    return {
      slug: 'rain',
      label: 'Rain cycle',
      accent: '#8ce6ff',
      accentSoft: 'rgba(140, 230, 255, 0.12)',
      bgStart: '#09101d',
      bgEnd: '#0b2231',
      panel: 'rgba(8, 19, 31, 0.74)',
      border: 'rgba(140, 230, 255, 0.14)',
      glow: 'rgba(116, 187, 255, 0.2)',
    };
  }

  if (conditionId >= 600 && conditionId < 700) {
    return {
      slug: 'snow',
      label: 'Snow field',
      accent: '#d7f4ff',
      accentSoft: 'rgba(215, 244, 255, 0.12)',
      bgStart: '#0c1522',
      bgEnd: '#13273a',
      panel: 'rgba(12, 22, 35, 0.75)',
      border: 'rgba(215, 244, 255, 0.14)',
      glow: 'rgba(215, 244, 255, 0.2)',
    };
  }

  if (conditionId >= 701 && conditionId < 800) {
    return {
      slug: 'mist',
      label: 'Low visibility',
      accent: '#d9e6f2',
      accentSoft: 'rgba(217, 230, 242, 0.12)',
      bgStart: '#09111b',
      bgEnd: '#1a2430',
      panel: 'rgba(12, 18, 26, 0.72)',
      border: 'rgba(217, 230, 242, 0.12)',
      glow: 'rgba(217, 230, 242, 0.18)',
    };
  }

  if (conditionId === 800) {
    return isNight
      ? {
          slug: 'clear-night',
          label: 'Clear night',
          accent: '#9db4ff',
          accentSoft: 'rgba(157, 180, 255, 0.12)',
          bgStart: '#040816',
          bgEnd: '#11192d',
          panel: 'rgba(10, 15, 27, 0.72)',
          border: 'rgba(157, 180, 255, 0.13)',
          glow: 'rgba(157, 180, 255, 0.28)',
        }
      : {
          slug: 'clear-day',
          label: 'Clear sky',
          accent: '#7ee0ff',
          accentSoft: 'rgba(126, 224, 255, 0.12)',
          bgStart: '#06131f',
          bgEnd: '#0b2a3d',
          panel: 'rgba(8, 20, 33, 0.7)',
          border: 'rgba(126, 224, 255, 0.13)',
          glow: 'rgba(126, 224, 255, 0.25)',
        };
  }

  return {
    slug: 'clouds',
    label: 'Cloud deck',
    accent: '#a9d8ff',
    accentSoft: 'rgba(169, 216, 255, 0.12)',
    bgStart: '#08111f',
    bgEnd: '#13283a',
    panel: 'rgba(10, 18, 30, 0.74)',
    border: 'rgba(169, 216, 255, 0.14)',
    glow: 'rgba(169, 216, 255, 0.2)',
  };
}

async function requestWeather(targetCity, { setWeatherData, setLoading, setError, background = false }) {
  const trimmedCity = targetCity.trim();

  if (!trimmedCity) {
    setError('Enter a city name to search.');
    setWeatherData(null);
    return null;
  }

  if (!background) {
    setLoading(true);
    setError('');
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=bf75e52aa65d963e67cc9ac8dc487f27&units=metric`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Unable to load weather data right now.');
    }

    setWeatherData(data);
    return data;
  } catch (fetchError) {
    if (!background) {
      setWeatherData(null);
      setError(fetchError.message || 'Unable to load weather data right now.');
    }

    return null;
  } finally {
    if (!background) {
      setLoading(false);
    }
  }
}

function App() {
  const [city, setCity] = useState('');
  const [activeCity, setActiveCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = useSyncExternalStore(
    (callback) => {
      callback();

      const timerId = window.setInterval(callback, 60_000);
      return () => window.clearInterval(timerId);
    },
    () => Date.now(),
    () => 0
  );

  useEffect(() => {
    if (!activeCity) return undefined;

    const intervalId = window.setInterval(() => {
      requestWeather(activeCity, {
        setWeatherData,
        setLoading,
        setError,
        background: true,
      });
    }, 10 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [activeCity]);

  async function weather(event) {
    event.preventDefault();

    const data = await requestWeather(city, {
      setWeatherData,
      setLoading,
      setError,
    });

    if (data) {
      setActiveCity(city.trim());
    }
  }

  const theme = getWeatherTheme(weatherData);
  const weatherMain = weatherData?.weather?.[0]?.main || 'Clear';
  const weatherDescription = weatherData?.weather?.[0]?.description || 'Search for a city to see live weather details.';
  const iconCode = weatherData?.weather?.[0]?.icon;
  const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}@4x.png` : '';
  const feelsLike = weatherData?.main?.feels_like;
  const tempMin = weatherData?.main?.temp_min;
  const tempMax = weatherData?.main?.temp_max;
  const humidity = weatherData?.main?.humidity;
  const pressure = weatherData?.main?.pressure;
  const windSpeed = weatherData?.wind?.speed;
  const windGust = weatherData?.wind?.gust;
  const windDirection = toWindDirection(weatherData?.wind?.deg);
  const visibility = typeof weatherData?.visibility === 'number' ? `${(weatherData.visibility / 1000).toFixed(1)} km` : '--';
  const cloudiness = weatherData?.clouds?.all;
  const sunrise = formatTime(weatherData?.sys?.sunrise, weatherData?.timezone);
  const sunset = formatTime(weatherData?.sys?.sunset, weatherData?.timezone);
  const currentCityTime = weatherData
    ? new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(now + (weatherData.timezone || 0) * 1000))
    : '';

  return (
    <main
      className={`app-shell theme-${theme.slug}`}
      style={{
        '--bg-start': theme.bgStart,
        '--bg-end': theme.bgEnd,
        '--panel': theme.panel,
        '--panel-border': theme.border,
        '--accent': theme.accent,
        '--accent-soft': theme.accentSoft,
        '--glow': theme.glow,
      }}
    >
      <section className="hero-panel">
        <div className="eyebrow">Live Weather Dashboard</div>
        <h1>Weather that changes with the sky outside.</h1>
        <p>
          Search any city and get a responsive summary that mirrors the current
          weather in real time, with a design that shifts to match the conditions.
        </p>

        <form className="search-bar" onSubmit={weather}>
          <input
            type="search"
            id="location"
            placeholder="Enter a city name"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <button type="submit" className="search" disabled={loading}>
            {loading ? 'Checking...' : 'Check weather'}
          </button>
        </form>

        {error && <p className="status status-error">{error}</p>}
        {!error && loading && <p className="status">Loading weather data...</p>}

        {weatherData && (
          <div className="condition-strip">
            <span>{theme.label}</span>
            <strong>{weatherDescription}</strong>
            <small>Current city time {currentCityTime}</small>
          </div>
        )}

        <div className="hero-metrics">
          <div>
            <span>Search result</span>
            <strong>{weatherData ? `${weatherData.name}, ${weatherData.sys?.country || '--'}` : 'No city selected'}</strong>
          </div>
          <div>
            <span>Condition</span>
            <strong>{weatherMain}</strong>
          </div>
        </div>
      </section>

      <section className="weather-card">
        {weatherData ? (
          <>
            <div className="card-header">
              <div>
                <span className="location-tag">
                  {weatherData.name}, {weatherData.sys?.country}
                </span>
                <h2>{weatherDescription}</h2>
                <p className="local-time">Local time: {currentCityTime}</p>
              </div>

              {iconUrl && <img src={iconUrl} alt={weatherDescription} className="weather-icon" />}
            </div>

            <div className="current-row">
              <div>
                <p className="temperature">{Math.round(weatherData.main.temp)}°C</p>
                <p className="feels-like">Feels like {Math.round(feelsLike)}°C</p>
              </div>

              <div className="temp-range">
                <span>High {Math.round(tempMax)}°</span>
                <span>Low {Math.round(tempMin)}°</span>
                <span>Now {currentCityTime}</span>
              </div>
            </div>

            <div className="chips">
              <span>Visibility {visibility}</span>
              <span>Clouds {cloudiness}%</span>
              <span>Humidity {humidity}%</span>
              <span>Pressure {pressure} hPa</span>
              <span>Wind {windDirection}</span>
            </div>

            <div className="stats-grid">
              <article>
                <span>Wind</span>
                <strong>{windSpeed} m/s</strong>
                <small>
                  {windGust ? `Gust ${windGust} m/s` : 'No gust data'} · {windDirection}
                </small>
              </article>
              <article>
                <span>Sunrise</span>
                <strong>{sunrise}</strong>
                <small>Sunset {sunset}</small>
              </article>
              <article>
                <span>Coordinates</span>
                <strong>
                  {weatherData.coord?.lat?.toFixed(2)}, {weatherData.coord?.lon?.toFixed(2)}
                </strong>
                <small>{weatherData.name} position</small>
              </article>
              <article>
                <span>Sea level</span>
                <strong>{weatherData.main?.sea_level || '--'}</strong>
                <small>Ground level {weatherData.main?.grnd_level || '--'}</small>
              </article>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <h2>Your weather story will show up here.</h2>
            <p>
              Enter a city to reveal the current temperature, weather condition,
              wind speed, humidity, pressure, visibility, and sunrise/sunset in a layout that adapts to the forecast.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;