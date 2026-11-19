/* =========================================================================
   天光 · 城市天气对照
   Vanilla JS, no build step. Data: Open-Meteo forecast + air quality.
   ========================================================================= */
'use strict';

(function () {
  /* ---------------------------------------------------------------------
     Constants
     --------------------------------------------------------------------- */
  const API = {
    forecast: 'https://api.open-meteo.com/v1/forecast',
    air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    geo: 'https://geocoding-api.open-meteo.com/v1/search'
  };
  const BJ_TZ = 'Asia/Shanghai';
  const MAX_CITIES = 6;
  const DEFAULT_IDS = ['beijing', 'xuecheng'];
  const STORE_CITIES = 'tianguang.cities.v1';
  const STORE_CACHE = 'tianguang.cache.v1';
  const AUTO_REFRESH_MS = 10 * 60 * 1000;
  const MAX_RESULTS = 8;

  const PALETTE = ['#b4452e', '#2f5d7c', '#6b7a35', '#7c4d72', '#a8792c', '#2e7364'];

  const FORECAST_PARAMS = new URLSearchParams({
    timezone: BJ_TZ,
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl',
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'visibility'
    ].join(','),
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset',
      'uv_index_max', 'precipitation_probability_max', 'wind_speed_10m_max'
    ].join(','),
    wind_speed_unit: 'kmh',
    forecast_days: '7'
  });

  const AIR_PARAMS = new URLSearchParams({
    timezone: BJ_TZ,
    current: 'pm2_5,pm10,us_aqi'
  });

  const PRESETS = [
    { id: 'beijing', name: '北京', short: '北京', region: '北京市', lat: 39.9042, lon: 116.4074 },
    { id: 'xuecheng', name: '薛城区', short: '薛城', region: '山东 · 枣庄', lat: 34.7953, lon: 117.2633 },
    { id: 'shanghai', name: '上海', short: '上海', region: '上海市', lat: 31.2304, lon: 121.4737 },
    { id: 'guangzhou', name: '广州', short: '广州', region: '广东', lat: 23.1291, lon: 113.2644 },
    { id: 'shenzhen', name: '深圳', short: '深圳', region: '广东', lat: 22.5431, lon: 114.0579 },
    { id: 'hangzhou', name: '杭州', short: '杭州', region: '浙江', lat: 30.2741, lon: 120.1551 },
    { id: 'chengdu', name: '成都', short: '成都', region: '四川', lat: 30.5728, lon: 104.0668 },
    { id: 'chongqing', name: '重庆', short: '重庆', region: '重庆市', lat: 29.5630, lon: 106.5516 },
    { id: 'wuhan', name: '武汉', short: '武汉', region: '湖北', lat: 30.5928, lon: 114.3055 },
    { id: 'xian', name: '西安', short: '西安', region: '陕西', lat: 34.3416, lon: 108.9398 },
    { id: 'nanjing', name: '南京', short: '南京', region: '江苏', lat: 32.0603, lon: 118.7969 },
    { id: 'tianjin', name: '天津', short: '天津', region: '天津市', lat: 39.3434, lon: 117.3616 },
    { id: 'suzhou', name: '苏州', short: '苏州', region: '江苏', lat: 31.2989, lon: 120.5853 },
    { id: 'changsha', name: '长沙', short: '长沙', region: '湖南', lat: 28.2282, lon: 112.9388 },
    { id: 'zhengzhou', name: '郑州', short: '郑州', region: '河南', lat: 34.7466, lon: 113.6254 },
    { id: 'qingdao', name: '青岛', short: '青岛', region: '山东', lat: 36.0671, lon: 120.3826 },
    { id: 'jinan', name: '济南', short: '济南', region: '山东', lat: 36.6512, lon: 117.1201 },
    { id: 'zaozhuang', name: '枣庄', short: '枣庄', region: '山东', lat: 34.8107, lon: 117.3210 },
    { id: 'shenyang', name: '沈阳', short: '沈阳', region: '辽宁', lat: 41.8057, lon: 123.4315 },
    { id: 'harbin', name: '哈尔滨', short: '哈尔滨', region: '黑龙江', lat: 45.8038, lon: 126.5349 },
    { id: 'kunming', name: '昆明', short: '昆明', region: '云南', lat: 25.0389, lon: 102.7183 },
    { id: 'xiamen', name: '厦门', short: '厦门', region: '福建', lat: 24.4798, lon: 118.0894 },
    { id: 'fuzhou', name: '福州', short: '福州', region: '福建', lat: 26.0745, lon: 119.2965 },
    { id: 'hefei', name: '合肥', short: '合肥', region: '安徽', lat: 31.8206, lon: 117.2272 },
    { id: 'nanchang', name: '南昌', short: '南昌', region: '江西', lat: 28.6820, lon: 115.8579 },
    { id: 'taiyuan', name: '太原', short: '太原', region: '山西', lat: 37.8706, lon: 112.5489 },
    { id: 'shijiazhuang', name: '石家庄', short: '石家庄', region: '河北', lat: 38.0428, lon: 114.5149 },
    { id: 'urumqi', name: '乌鲁木齐', short: '乌鲁木齐', region: '新疆', lat: 43.8256, lon: 87.6168 },
    { id: 'lhasa', name: '拉萨', short: '拉萨', region: '西藏', lat: 29.6520, lon: 91.1721 },
    { id: 'haikou', name: '海口', short: '海口', region: '海南', lat: 20.0440, lon: 110.1999 },
    { id: 'sanya', name: '三亚', short: '三亚', region: '海南', lat: 18.2528, lon: 109.5119 },
    { id: 'hongkong', name: '香港', short: '香港', region: '香港', lat: 22.3193, lon: 114.1694 },
    { id: 'taipei', name: '台北', short: '台北', region: '台湾', lat: 25.0330, lon: 121.5654 },
    { id: 'mohe', name: '漠河', short: '漠河', region: '黑龙江', lat: 52.9722, lon: 122.5389 },
    { id: 'dalian', name: '大连', short: '大连', region: '辽宁', lat: 38.9140, lon: 121.6147 },
    { id: 'lanzhou', name: '兰州', short: '兰州', region: '甘肃', lat: 36.0611, lon: 103.8343 },
    { id: 'yinchuan', name: '银川', short: '银川', region: '宁夏', lat: 38.4872, lon: 106.2309 },
    { id: 'xining', name: '西宁', short: '西宁', region: '青海', lat: 36.6171, lon: 101.7782 },
    { id: 'hohhot', name: '呼和浩特', short: '呼和浩特', region: '内蒙古', lat: 40.8414, lon: 111.7519 },
    { id: 'guiyang', name: '贵阳', short: '贵阳', region: '贵州', lat: 26.6470, lon: 106.6302 },
    { id: 'nanning', name: '南宁', short: '南宁', region: '广西', lat: 22.8170, lon: 108.3665 }
  ];

  const QUICK_IDS = ['shanghai', 'guangzhou', 'hangzhou', 'chengdu', 'wuhan', 'xian', 'qingdao', 'harbin', 'sanya', 'lhasa', 'hongkong', 'mohe'];

  const WEATHER = {
    0: ['晴', 'sun', 'clear'],
    1: ['晴间多云', 'partly', 'cloud'],
    2: ['多云', 'cloud', 'cloud'],
    3: ['阴', 'overcast', 'cloud'],
    45: ['雾', 'fog', 'fog'],
    48: ['雾凇', 'fog', 'fog'],
    51: ['毛毛雨', 'drizzle', 'rain'],
    53: ['毛毛雨', 'drizzle', 'rain'],
    55: ['毛毛雨', 'drizzle', 'rain'],
    56: ['冻雨', 'sleet', 'sleet'],
    57: ['冻雨', 'sleet', 'sleet'],
    61: ['小雨', 'rain', 'rain'],
    63: ['中雨', 'rain', 'rain'],
    65: ['大雨', 'heavy', 'rain'],
    66: ['冻雨', 'sleet', 'sleet'],
    67: ['冻雨', 'sleet', 'sleet'],
    71: ['小雪', 'snow', 'snow'],
    73: ['中雪', 'snow', 'snow'],
    75: ['大雪', 'snow', 'snow'],
    77: ['米雪', 'snow', 'snow'],
    80: ['阵雨', 'rain', 'rain'],
    81: ['强阵雨', 'heavy', 'rain'],
    82: ['暴雨', 'heavy', 'rain'],
    85: ['阵雪', 'snow', 'snow'],
    86: ['强阵雪', 'snow', 'snow'],
    95: ['雷阵雨', 'thunder', 'thunder'],
    96: ['雷暴冰雹', 'thunder', 'thunder'],
    99: ['雷暴冰雹', 'thunder', 'thunder']
  };

  const GLYPH_ID = {
    sun: 'i-sun', moon: 'i-moon', partly: 'i-cloud-sun', 'partly-night': 'i-cloud-moon',
    cloud: 'i-cloud', overcast: 'i-overcast', fog: 'i-fog', drizzle: 'i-drizzle',
    rain: 'i-rain', heavy: 'i-rain-heavy', snow: 'i-snow', sleet: 'i-sleet', thunder: 'i-thunder'
  };

  const SKY_THEMES = {
    day: '#cfe1ea',
    dawn: '#efd4bb',
    golden: '#e7b879',
    dusk: '#a7959c',
    night: '#0f1728'
  };

  /* ---------------------------------------------------------------------
     Small utilities
     --------------------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const fmt1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');
  const fmtTemp = (n) => (Number.isFinite(n) ? `${n.toFixed(1).replace('-', '−')}°` : '—');
  const fmtInt = (n) => (Number.isFinite(n) ? String(Math.round(n)).replace('-', '−') : '—');
  const pad2 = (n) => String(n).padStart(2, '0');

  function hhmm(isoLocal) {
    if (typeof isoLocal !== 'string' || isoLocal.length < 16) return '—';
    return isoLocal.slice(11, 16);
  }

  function minutesOf(isoLocal) {
    if (typeof isoLocal !== 'string' || isoLocal.length < 16) return null;
    const h = Number(isoLocal.slice(11, 13));
    const m = Number(isoLocal.slice(14, 16));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function fmtDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return '—';
    const m = Math.round(minutes);
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (h <= 0) return `${rest} 分钟`;
    return rest === 0 ? `${h} 小时` : `${h} 小时 ${rest} 分`;
  }

  function readJSON(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode / quota */ }
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ---------------------------------------------------------------------
     Time / solar helpers (all display in Beijing time)
     --------------------------------------------------------------------- */
  const SEC_FMT = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BJ_TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const HM_FMT = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BJ_TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit'
  });
  const DATE_FMT = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BJ_TZ, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  const WEEK_FMT = new Intl.DateTimeFormat('zh-CN', { timeZone: BJ_TZ, weekday: 'short' });
  const PARTS_FMT = new Intl.DateTimeFormat('en-GB', {
    timeZone: BJ_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  function bjParts(date = new Date()) {
    const out = {};
    for (const part of PARTS_FMT.formatToParts(date)) {
      if (part.type !== 'literal') out[part.type] = part.value;
    }
    const hour = Number(out.hour) % 24;
    const minute = Number(out.minute);
    return {
      date: `${out.year}-${out.month}-${out.day}`,
      hour,
      minute,
      minutes: hour * 60 + minute
    };
  }

  function timeHM(dateLike) {
    if (!dateLike) return '—';
    return HM_FMT.format(new Date(dateLike));
  }

  function solarElevation(date, lat, lon) {
    const rad = Math.PI / 180;
    const jd = date.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;
    const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
    const lambda = (L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad)) * rad;
    const eps = (23.439 - 0.0000004 * n) * rad;
    const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad;
    const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
    const lst = ((gmst + lon / 15) % 24 + 24) % 24;
    const hourAngle = ((((lst * 15 - ra) % 360) + 540) % 360) - 180;
    const sinEl = Math.sin(lat * rad) * Math.sin(decl) +
      Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle * rad);
    return Math.asin(clamp(sinEl, -1, 1)) / rad;
  }

  function computePhase() {
    const ref = referenceCity();
    const lat = ref ? ref.lat : 39.9042;
    const lon = ref ? ref.lon : 116.4074;
    const now = new Date();
    const elev = solarElevation(now, lat, lon);
    const before = solarElevation(new Date(now.getTime() - 15 * 60000), lat, lon);
    if (elev >= 8) return 'day';
    if (elev >= 0) return before <= elev ? 'dawn' : 'golden';
    if (elev >= -10) return 'dusk';
    return 'night';
  }

  function condition(code, isDay) {
    const row = WEATHER[code] || ['多云', 'cloud', 'cloud'];
    let glyph = row[1];
    if (!isDay) {
      if (glyph === 'sun') glyph = 'moon';
      else if (glyph === 'partly') glyph = 'partly-night';
    }
    return { label: row[0], glyph, kind: row[2] };
  }

  function glyphSVG(name, cls = 'glyph') {
    const id = GLYPH_ID[name] || GLYPH_ID.cloud;
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#${id}"></use></svg>`;
  }

  const WIND_DIRS = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  function windDir(deg) {
    if (!Number.isFinite(deg)) return '—';
    return WIND_DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  }

  function aqiLevel(pm25) {
    if (!Number.isFinite(pm25)) return null;
    if (pm25 <= 35) return { label: '优', color: '#3f8f5f', rank: 0 };
    if (pm25 <= 75) return { label: '良', color: '#b58a1f', rank: 1 };
    if (pm25 <= 115) return { label: '轻度污染', color: '#cf7a2c', rank: 2 };
    if (pm25 <= 150) return { label: '中度污染', color: '#c14a35', rank: 3 };
    if (pm25 <= 250) return { label: '重度污染', color: '#8b4a86', rank: 4 };
    return { label: '严重污染', color: '#7a2f2f', rank: 5 };
  }

  function normalizeCity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').slice(0, 64);
    const name = String(raw.name || '').slice(0, 24);
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return {
      id,
      name,
      short: String(raw.short || name).slice(0, 16),
      region: String(raw.region || '自定义地点').slice(0, 32),
      lat,
      lon
    };
  }

  function stripRegionSuffix(value) {
    return String(value || '')
      .replace(/(特别行政区|自治区|自治州|自治县|新区|省|区|县|市|旗|盟)$/g, '')
      .trim();
  }

  let placesCache = null;
  function getPlaces() {
    if (placesCache) return placesCache;
    const presetNames = new Set(PRESETS.map((city) => city.name).concat(PRESETS.map((city) => city.short)));
    placesCache = (window.CN_PLACES || [])
      .map((row) => {
        const name = String(row[0] || '').trim();
        const short = stripRegionSuffix(name) || name;
        if (!name || presetNames.has(name) || presetNames.has(short)) return null;
        const province = stripRegionSuffix(row[2]);
        const city = stripRegionSuffix(row[1]);
        const region = [province, city]
          .filter(Boolean)
          .filter((part, index, list) => list.indexOf(part) === index)
          .join(' · ');
        return normalizeCity({
          id: `cn-${row[5]}`,
          name,
          short,
          region: region || '中国',
          lat: row[3],
          lon: row[4]
        });
      })
      .filter(Boolean);
    return placesCache;
  }

  function toCityFromGeo(result) {
    if (!result || typeof result !== 'object') return null;
    const name = String(result.name || '').slice(0, 24);
    if (!name) return null;
    const regionParts = [];
    if (result.admin1) regionParts.push(String(result.admin1).slice(0, 20));
    if (result.admin2 && result.admin2 !== result.admin1) regionParts.push(String(result.admin2).slice(0, 20));
    if (result.country_code && result.country_code !== 'CN' && result.country) regionParts.push(String(result.country).slice(0, 20));
    return normalizeCity({
      id: `geo-${result.id}`,
      name,
      short: name,
      region: regionParts.join(' · ') || '未知地区',
      lat: result.latitude,
      lon: result.longitude
    });
  }

  /* ---------------------------------------------------------------------
     DOM + state
     --------------------------------------------------------------------- */
  const el = {};
  const state = {
    cities: [],
    data: new Map(),
    hidden: new Set(),
    loading: false,
    fetchedAt: 0,
    lastError: false,
    phase: 'night',
    firstCitiesRender: true,
    chartAnimated: false,
    chart: null,
    geoResults: [],
    geoQuery: '',
    geoToken: 0
  };

  let refreshPromise = null;
  let autoRetries = 0;

  function cacheDom() {
    el.sky = $('#sky');
    el.headline = $('#headline');
    el.insight = $('#insight');
    el.solar = $('#solar');
    el.cityRow = $('#city-row');
    el.swipeHint = $('#swipe-hint');
    el.clockTime = $('#clock-time');
    el.clockDate = $('#clock-date');
    el.refreshBtn = $('#refresh-btn');
    el.addBtn = $('#add-btn');
    el.banner = $('#banner');
    el.bannerText = $('#banner-text');
    el.bannerRetry = $('#banner-retry');
    el.chartLegend = $('#chart-legend');
    el.chartWrap = $('#chart-wrap');
    el.chartLive = $('#chart-live');
    el.compareTable = $('#compare-table');
    el.weekGrid = $('#week-grid');
    el.updatedAt = $('#updated-at');
    el.dialog = $('#add-dialog');
    el.dialogClose = $('#dialog-close');
    el.search = $('#city-search');
    el.quick = $('#quick-cities');
    el.results = $('#city-results');
    el.cityCount = $('#city-count');
    el.resetCities = $('#reset-cities');
    el.maxCities = $('#max-cities');
    el.toast = $('#toast');
    el.themeColor = $('meta[name="theme-color"]');
  }

  /* ---------------------------------------------------------------------
     Persistence
     --------------------------------------------------------------------- */
  function loadCities() {
    const known = new Map(PRESETS.map((c) => [c.id, c]));
    const storedRaw = readJSON(safeGet(STORE_CITIES));
    const storedList = Array.isArray(storedRaw) ? storedRaw : [];

    for (const raw of storedList) {
      const city = normalizeCity(raw);
      if (city && !known.has(city.id)) known.set(city.id, city);
    }

    const params = new URLSearchParams(location.search);
    const rawParam = params.get('cities');
    let ids = null;
    if (rawParam) ids = rawParam.split(',').map((s) => s.trim()).filter(Boolean);
    else if (storedList.length) ids = storedList.map((c) => (typeof c === 'string' ? c : c && c.id)).filter(Boolean);
    if (!ids || !ids.length) ids = DEFAULT_IDS.slice();

    const picked = [];
    for (const id of ids) {
      const city = known.get(id);
      if (city && !picked.some((c) => c.id === id) && picked.length < MAX_CITIES) picked.push(city);
    }
    if (!picked.length) {
      for (const id of DEFAULT_IDS) {
        const city = known.get(id);
        if (city) picked.push(city);
      }
    }
    return picked;
  }

  function persistCities() {
    safeSet(STORE_CITIES, JSON.stringify(state.cities.map((c) => ({
      id: c.id, name: c.name, short: c.short, region: c.region, lat: c.lat, lon: c.lon
    }))));
  }

  function syncUrl() {
    try {
      const url = new URL(location.href);
      url.searchParams.set('cities', state.cities.map((c) => c.id).join(','));
      history.replaceState(null, '', url);
    } catch (e) { /* file:// and older browsers */ }
  }

  function loadCache() {
    const payload = readJSON(safeGet(STORE_CACHE));
    if (!payload || payload.v !== 2 || !payload.data || typeof payload.data !== 'object') return false;
    let count = 0;
    for (const [id, entry] of Object.entries(payload.data)) {
      if (!entry || !entry.forecast || !entry.forecast.current || !entry.forecast.hourly || !entry.forecast.daily) continue;
      state.data.set(id, entry);
      count += 1;
    }
    state.fetchedAt = Number(payload.fetchedAt) || 0;
    return count > 0;
  }

  function saveCache() {
    const data = {};
    for (const [id, entry] of state.data) {
      data[id] = { forecast: entry.forecast, air: entry.air, fetchedAt: entry.fetchedAt };
    }
    safeSet(STORE_CACHE, JSON.stringify({ v: 2, fetchedAt: state.fetchedAt, data }));
  }

  /* ---------------------------------------------------------------------
     Network
     --------------------------------------------------------------------- */
  async function fetchJSON(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function forecastUrl(city) {
    const params = new URLSearchParams(FORECAST_PARAMS);
    params.set('latitude', String(city.lat));
    params.set('longitude', String(city.lon));
    return `${API.forecast}?${params.toString()}`;
  }

  function airUrl(city) {
    const params = new URLSearchParams(AIR_PARAMS);
    params.set('latitude', String(city.lat));
    params.set('longitude', String(city.lon));
    return `${API.air}?${params.toString()}`;
  }

  async function fetchCityData(city) {
    const [forecast, air] = await Promise.all([
      fetchJSON(forecastUrl(city)),
      fetchJSON(airUrl(city), 9000).catch(() => null)
    ]);
    if (!forecast || !forecast.current || !forecast.hourly || !forecast.daily) {
      throw new Error('Malformed forecast payload');
    }
    return { id: city.id, forecast, air, fetchedAt: Date.now() };
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    state.loading = true;
    syncLoadingUI();
    const idsAtStart = new Set(state.cities.map((c) => c.id));

    refreshPromise = (async () => {
      const results = await Promise.allSettled(
        state.cities.map((city) => fetchCityData(city).then((data) => {
          if (!idsAtStart.has(city.id)) throw new Error('City removed');
          return data;
        }))
      );

      let ok = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const entry = result.value;
          if (state.cities.some((c) => c.id === entry.id)) {
            state.data.set(entry.id, entry);
            ok += 1;
          }
        }
      }

      if (ok > 0) {
        state.fetchedAt = Date.now();
        state.lastError = false;
        saveCache();
        if (ok < state.cities.length && autoRetries < 2) {
          autoRetries += 1;
          setTimeout(() => { if (!refreshPromise) refresh(); }, 20000);
        }
      } else {
        state.lastError = true;
      }
      state.loading = false;
      syncLoadingUI();
      renderAll();
      refreshPromise = null;
      return ok;
    })().catch(() => {
      state.loading = false;
      state.lastError = true;
      syncLoadingUI();
      renderAll();
      refreshPromise = null;
      return 0;
    });

    return refreshPromise;
  }

  function syncLoadingUI() {
    if (!el.refreshBtn) return;
    el.refreshBtn.classList.toggle('is-loading', state.loading);
    el.refreshBtn.disabled = state.loading;
    el.refreshBtn.setAttribute('aria-busy', state.loading ? 'true' : 'false');
  }

  /* ---------------------------------------------------------------------
     Rendering: hero
     --------------------------------------------------------------------- */
  function withDataItems() {
    return state.cities
      .map((city, index) => ({
        city,
        data: state.data.get(city.id) || null,
        color: PALETTE[index % PALETTE.length]
      }));
  }

  function loadedItems() {
    return withDataItems().filter((item) => item.data && fitsPayload(item.data));
  }

  function fitsPayload(entry) {
    return !!(entry && entry.forecast && entry.forecast.current && entry.forecast.daily);
  }

  function referenceCity() {
    const beijing = state.cities.find((c) => c.id === 'beijing');
    if (beijing) return beijing;
    const loaded = state.cities.find((c) => state.data.has(c.id));
    return loaded || state.cities[0] || null;
  }

  function headlineFor(items) {
    if (!items.length) return '此刻，北京与薛城';
    if (items.length === 1) {
      const current = items[0].data.forecast.current;
      const info = condition(current.weather_code, current.is_day === 1);
      return `${items[0].city.short}，${info.label} ${fmtInt(current.temperature_2m)}°`;
    }
    const a = items[0];
    const b = items[1];
    const ta = a.data.forecast.current.temperature_2m;
    const tb = b.data.forecast.current.temperature_2m;
    const actual = ta - tb;
    if (!Number.isFinite(actual) || Math.abs(actual) < 0.05) {
      return `此刻，${a.city.short}与${b.city.short}气温相同`;
    }
    const shown = Math.abs(actual) >= 1 ? String(Math.round(Math.abs(actual))) : Math.abs(actual).toFixed(1);
    return `此刻，${a.city.short}比${b.city.short}${actual > 0 ? '高' : '低'} ${shown}°`;
  }

  function nextHoursDelta(item, hours = 3) {
    try {
      const now = bjParts();
      const forecast = item.data.forecast;
      const times = forecast.hourly.time;
      const temps = forecast.hourly.temperature_2m;
      const key = `${now.date}T${pad2(now.hour)}`;
      let start = times.findIndex((t) => t.slice(0, 13) === key);
      if (start < 0) start = 0;
      const a = temps[start];
      const b = temps[start + hours];
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return b - a;
    } catch (e) {
      return null;
    }
  }

  function insightFor(items) {
    const parts = [];

    if (items.length >= 3) {
      const ranked = [...items].sort((a, b) =>
        b.data.forecast.current.temperature_2m - a.data.forecast.current.temperature_2m);
      const warm = ranked[0];
      const cold = ranked[ranked.length - 1];
      parts.push(`最暖${warm.city.short} ${fmtInt(warm.data.forecast.current.temperature_2m)}°，最冷${cold.city.short} ${fmtInt(cold.data.forecast.current.temperature_2m)}°`);
    }

    for (const item of items) {
      const current = item.data.forecast.current;
      const info = condition(current.weather_code, current.is_day === 1);
      if (info.kind === 'rain' || info.kind === 'thunder') {
        parts.push(`${item.city.short}有${info.label}，出门带伞`);
        break;
      }
      if (info.kind === 'snow' || info.kind === 'sleet') {
        parts.push(`${item.city.short}有${info.label}，注意保暖`);
        break;
      }
    }

    if (parts.length < 2) {
      const delta = nextHoursDelta(items[0]);
      if (delta !== null && Math.abs(delta) >= 1.5) {
        const sameCity = parts.some((part) => part.startsWith(items[0].city.short));
        parts.push(`${sameCity ? '' : `${items[0].city.short}`}未来 3 小时${delta > 0 ? '升温' : '降温'} ${fmt1(Math.abs(delta)).replace('.0', '')}°`);
      }
    }

    if (parts.length < 2) {
      let worst = null;
      for (const item of items) {
        const air = item.data.air && item.data.air.current;
        if (!air || !Number.isFinite(air.pm2_5)) continue;
        const level = aqiLevel(air.pm2_5);
        if (level && level.rank >= 3 && (!worst || level.rank > worst.level.rank)) {
          worst = { item, level };
        }
      }
      if (worst) parts.push(`${worst.item.city.short}空气${worst.level.label}，减少户外活动`);
    }

    if (!parts.length) parts.push('各城天气平稳，适合出门');
    return `${parts.slice(0, 2).join('；')}。`;
  }

  function addTileHTML() {
    const full = state.cities.length >= MAX_CITIES;
    return `
      <button type="button" class="add-city" data-action="add"${full ? ' disabled' : ''}>
        <span class="add-city-plus" aria-hidden="true">
          <svg class="ui-icon" viewBox="0 0 24 24"><use href="#i-plus"></use></svg>
        </span>
        <span class="add-city-text">${full ? `已达 ${MAX_CITIES} 座上限` : '添加城市'}
          <small>${full ? '移除一座后可继续添加' : '搜索更多城市，横向对照'}</small>
        </span>
      </button>`;
  }

  function cityColumnHTML(item, index) {
    const { city, data, color } = item;
    const removeButton = `
      <button type="button" class="city-remove" data-remove="${esc(city.id)}" aria-label="移除${esc(city.name)}">
        <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-close"></use></svg>
      </button>`;

    const head = `
      <p class="city-region"><span class="city-dot" style="--dot:${color}" aria-hidden="true"></span>${esc(city.region)}</p>
      <p class="city-name">${esc(city.name)}</p>`;

    if (!data || !data.forecast || !data.forecast.current) {
      return `
        <article class="city city--empty" style="--dot:${color};--i:${index}">
          ${removeButton}
          ${head}
          <div class="city-temp-line">
            <p class="city-temp">—</p>
          </div>
          <p class="city-meta">数据尚未到达，稍后会自动重试。</p>
        </article>`;
    }

    const current = data.forecast.current;
    const daily = data.forecast.daily;
    const info = condition(current.weather_code, current.is_day === 1);
    const air = data.air && data.air.current;
    const level = air ? aqiLevel(air.pm2_5) : null;
    const todayMax = daily.temperature_2m_max ? daily.temperature_2m_max[0] : null;
    const todayMin = daily.temperature_2m_min ? daily.temperature_2m_min[0] : null;

    return `
      <article class="city" style="--dot:${color};--i:${index}">
        ${removeButton}
        ${head}
        <div class="city-temp-line">
          <p class="city-temp" aria-label="${fmtInt(current.temperature_2m)} 摄氏度">
            ${fmtInt(current.temperature_2m)}<span class="city-unit" aria-hidden="true">°</span>
          </p>
          <p class="city-cond">${glyphSVG(info.glyph)}<span>${info.label}</span></p>
        </div>
        <p class="city-meta">体感 ${fmtTemp(current.apparent_temperature)} · 今日 <b>${fmtTemp(todayMax)}</b> / ${fmtTemp(todayMin)}</p>
        ${level ? `<p class="city-aqi"><span class="aqi-dot" style="--aqi:${level.color}" aria-hidden="true"></span>空气${level.label} · PM2.5 ${fmtInt(air.pm2_5)}</p>` : ''}
      </article>`;
  }

  function renderSky() {
    const items = withDataItems();
    el.sky.dataset.phase = state.phase;
    if (!loadedItems().length) {
      renderError();
      return;
    }

    el.headline.textContent = headlineFor(loadedItems());
    el.insight.textContent = insightFor(loadedItems());
    el.cityRow.dataset.count = String(items.length);
    el.cityRow.innerHTML = items.map(cityColumnHTML).join('') + addTileHTML();

    if (state.firstCitiesRender) {
      el.cityRow.classList.add('city-row--first');
      state.firstCitiesRender = false;
      setTimeout(() => el.cityRow.classList.remove('city-row--first'), 1600);
    }

    updateSwipeHint();
    renderSolar();
  }

  function updateSwipeHint() {
    if (!el.swipeHint || !el.cityRow) return;
    const scrollable = el.cityRow.scrollWidth > el.cityRow.clientWidth + 4;
    el.cityRow.classList.toggle('is-scrollable', scrollable);
    const atEnd = scrollable && el.cityRow.scrollLeft + el.cityRow.clientWidth >= el.cityRow.scrollWidth - 4;
    el.cityRow.classList.toggle('is-end', atEnd);
    el.swipeHint.hidden = !scrollable;
    if (scrollable) {
      const overflow = el.cityRow.scrollWidth - el.cityRow.clientWidth;
      el.swipeHint.textContent = overflow > 120 ? '横向滚动，比较全部城市 →' : '横向滚动查看全部城市 →';
    }
  }

  function renderSkeleton() {
    el.headline.textContent = '正在获取此刻的天气';
    el.insight.textContent = '连接气象数据源…';
    el.solar.hidden = true;
    el.solar.innerHTML = '';
    const cards = state.cities.map((city, index) => `
      <div class="city" style="--i:${index}">
        <p class="city-region"><span class="city-dot" style="--dot:${PALETTE[index % PALETTE.length]}" aria-hidden="true"></span>${esc(city.region)}</p>
        <p class="city-name">${esc(city.name)}</p>
        <div class="city-temp-line"><p class="city-temp" style="opacity:.25">--</p></div>
        <p class="city-meta" style="opacity:.5">正在获取实时数据…</p>
      </div>`).join('');
    el.cityRow.dataset.count = String(state.cities.length);
    el.cityRow.innerHTML = cards + addTileHTML();
    el.chartLegend.innerHTML = '';
    el.chartWrap.innerHTML = '<div class="chart-skeleton" aria-hidden="true"></div>';
    el.compareTable.innerHTML = '<div class="line-skeleton" aria-hidden="true"></div><div class="line-skeleton" aria-hidden="true"></div><div class="line-skeleton" aria-hidden="true"></div><div class="line-skeleton" aria-hidden="true"></div>';
    el.weekGrid.innerHTML = '<div class="line-skeleton" aria-hidden="true"></div><div class="line-skeleton" aria-hidden="true"></div>';
    updateSwipeHint();
  }

  function renderError() {
    el.headline.textContent = '此刻，北京与薛城';
    el.insight.textContent = '天气数据暂时没有到站，检查网络后可以重试。';
    el.solar.hidden = true;
    el.solar.innerHTML = '';
    el.cityRow.dataset.count = String(state.cities.length);
    el.cityRow.innerHTML = state.cities.map((city, index) => `
      <article class="city city--empty" style="--dot:${PALETTE[index % PALETTE.length]};--i:${index}">
        <p class="city-region"><span class="city-dot" aria-hidden="true"></span>${esc(city.region)}</p>
        <p class="city-name">${esc(city.name)}</p>
        <div class="city-temp-line"><p class="city-temp">—</p></div>
        <p class="city-meta">暂未取到数据。</p>
      </article>`).join('') + addTileHTML();
    el.chartLegend.innerHTML = '';
    el.chartWrap.innerHTML = '<p class="empty-state">暂时无法获取逐时数据。</p>';
    el.compareTable.innerHTML = '<p class="empty-state">暂时无法获取对照数据。</p>';
    el.weekGrid.innerHTML = '<p class="empty-state">暂时无法获取七日预报。</p>';
    updateSwipeHint();
  }

  /* ---------------------------------------------------------------------
     Solar arc
     --------------------------------------------------------------------- */
  function renderSolar() {
    const ref = referenceCity();
    const entry = ref ? state.data.get(ref.id) : null;
    if (!entry || !fitsPayload(entry)) {
      el.solar.hidden = true;
      el.solar.innerHTML = '';
      return;
    }

    el.solar.hidden = false;
    const daily = entry.forecast.daily;
    const now = bjParts();
    const rise = minutesOf(daily.sunrise && daily.sunrise[0]);
    const set = minutesOf(daily.sunset && daily.sunset[0]);
    const tomorrowRise = daily.sunrise && daily.sunrise[1] ? minutesOf(daily.sunrise[1]) : null;
    const hasTimes = rise !== null && set !== null && set > rise;
    const isDaytime = hasTimes && now.minutes >= rise && now.minutes <= set;

    const W = 360;
    const H = 134;
    const P0 = { x: 26, y: 112 };
    const P1 = { x: 180, y: 12 };
    const P2 = { x: 334, y: 112 };
    const pointAt = (t) => {
      const u = 1 - t;
      return {
        x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
        y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y
      };
    };

    let disc = '';
    if (isDaytime) {
      const t = clamp((now.minutes - rise) / (set - rise), 0.02, 0.98);
      const p = pointAt(t);
      disc = `<circle class="solar-disc" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8.5"/>`;
    } else {
      disc = `<g class="solar-moon" transform="translate(162 6) scale(1.1)"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></g>`;
    }

    let note = '';
    let ariaNote = '';
    if (!hasTimes) {
      note = '日照时间暂不可用';
      ariaNote = note;
    } else if (isDaytime) {
      const dayLen = set - rise;
      const pct = clamp(Math.round(((now.minutes - rise) / dayLen) * 100), 0, 99);
      note = `今日白昼 ${fmtDuration(dayLen)} · 已过 ${pct}%`;
      ariaNote = note;
    } else {
      let nextRise = null;
      let label = '日出';
      if (now.minutes < rise) {
        nextRise = rise;
        label = '今日日出';
      } else if (tomorrowRise !== null) {
        nextRise = 1440 + tomorrowRise;
        label = '明日日出';
      }
      if (nextRise !== null) {
        const remain = nextRise - now.minutes;
        note = `夜间 · 距${label} ${fmtDuration(remain)}`;
        ariaNote = note;
      } else {
        note = '夜间';
        ariaNote = note;
      }
    }

    el.solar.innerHTML = `
      <p class="solar-title">${esc(ref.short)} · 今日日照</p>
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <path class="solar-horizon" d="M12 ${P0.y}H${W - 12}"/>
        <path class="solar-arc" d="M${P0.x} ${P0.y}Q${P1.x} ${P1.y} ${P2.x} ${P2.y}"/>
        <path class="solar-tick" d="M${P0.x} ${P0.y - 5}v5M${P2.x} ${P0.y - 5}v5"/>
        ${disc}
      </svg>
      <div class="solar-cap"><span>日出 ${hhmm(daily.sunrise && daily.sunrise[0])}</span><span>日落 ${hhmm(daily.sunset && daily.sunset[0])}</span></div>
      <p class="solar-note">${note}</p>`;
    el.solar.setAttribute('aria-label', `${ref.name}今日日出 ${hhmm(daily.sunrise && daily.sunrise[0])}，日落 ${hhmm(daily.sunset && daily.sunset[0])}。${ariaNote}。`);
  }

  /* ---------------------------------------------------------------------
     Rendering: chart
     --------------------------------------------------------------------- */
  function chartSeries() {
    const now = bjParts();
    const key = `${now.date}T${pad2(now.hour)}`;
    const series = [];

    state.cities.forEach((city, index) => {
      const entry = state.data.get(city.id);
      if (!entry || !fitsPayload(entry)) return;
      const hourly = entry.forecast.hourly;
      if (!Array.isArray(hourly.time) || !Array.isArray(hourly.temperature_2m)) return;
      let start = hourly.time.findIndex((t) => t.slice(0, 13) === key);
      if (start < 0) start = 0;
      const points = [];
      for (let k = 0; k < 24 && start + k < hourly.time.length; k += 1) {
        const temp = hourly.temperature_2m[start + k];
        if (!Number.isFinite(temp)) continue;
        points.push({
          time: hourly.time[start + k],
          temp,
          code: Array.isArray(hourly.weather_code) ? hourly.weather_code[start + k] : 2
        });
      }
      if (points.length < 2) return;
      series.push({ city, color: PALETTE[index % PALETTE.length], points });
    });
    return series;
  }

  const WEEKDAY_HOUR_LABEL = (iso) => `${Number(iso.slice(11, 13))}时`;

  function renderChart(animate) {
    if (!el.chartWrap) return;
    const allSeries = chartSeries();
    renderLegend(allSeries);

    const visible = allSeries.filter((s) => !state.hidden.has(s.city.id));
    if (!visible.length) {
      el.chartWrap.innerHTML = '<p class="empty-state">已隐藏全部城市，点击上方图例即可恢复显示。</p>';
      state.chart = null;
      return;
    }

    const W = Math.max(300, Math.floor(el.chartWrap.clientWidth || 900));
    const H = W < 560 ? 258 : 328;
    const margin = { top: 22, right: 16, bottom: 36, left: W < 560 ? 38 : 46 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    const count = Math.max(...visible.map((s) => s.points.length));

    const temps = visible.flatMap((s) => s.points.map((p) => p.temp));
    let lo = Math.floor((Math.min(...temps) - 2) / 5) * 5;
    let hi = Math.ceil((Math.max(...temps) + 2) / 5) * 5;
    if (hi - lo < 10) { hi += 5; lo -= 5; }

    const step = hi - lo > 45 ? 10 : 5;
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

    const xAt = (i) => margin.left + (plotW * i) / (count - 1);
    const yAt = (v) => margin.top + plotH - ((v - lo) / (hi - lo)) * plotH;

    const axisParts = [];
    for (const v of ticks) {
      const y = yAt(v);
      const zero = v === 0;
      axisParts.push(`<line class="axis-line${zero ? ' axis-line--zero' : ''}" x1="${margin.left}" x2="${W - margin.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
      axisParts.push(`<text class="${zero ? 'axis-label--zero' : ''}" x="${margin.left - 9}" y="${(y + 4).toFixed(1)}" text-anchor="end">${v}°</text>`);
    }

    const baseTimes = visible[0].points;
    const xParts = [];
    const dayParts = [];
    for (let i = 0; i < count; i += 1) {
      const time = baseTimes[i] && baseTimes[i].time;
      if (!time) continue;
      const hour = Number(time.slice(11, 13));
      const x = xAt(i);
      if (i === 0) {
        xParts.push(`<text x="${margin.left}" y="${H - 12}" text-anchor="start">现在</text>`);
      } else if (hour % 3 === 0 && i >= 3) {
        xParts.push(`<text x="${x.toFixed(1)}" y="${H - 12}" text-anchor="middle">${WEEKDAY_HOUR_LABEL(time)}</text>`);
      }
      if (hour === 0 && i > 0) {
        dayParts.push(`<line class="day-line" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${margin.top}" y2="${margin.top + plotH}"/>`);
        dayParts.push(`<text class="day-label" x="${(x + 5).toFixed(1)}" y="${margin.top - 6}">${Number(time.slice(5, 7))}月${Number(time.slice(8, 10))}日</text>`);
      }
    }

    const seriesParts = visible.map((s) => {
      const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(p.temp).toFixed(1)}`).join(' ');
      return `<path class="series-path" data-series="${esc(s.city.id)}" d="${d}" stroke="${s.color}" aria-hidden="true"/>`;
    });

    const cursorDots = visible.map((s) => `<circle class="cursor-dot" r="3.8" fill="${s.color}" data-dot="${esc(s.city.id)}" cx="0" cy="0"/>`).join('');
    const names = visible.map((s) => s.city.short).join('、');

    el.chartWrap.innerHTML = `
      <svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" tabindex="0"
        aria-label="未来二十四小时气温折线图：${esc(names)}。使用左右方向键或触摸逐小时查看。">
        ${axisParts.join('')}
        ${dayParts.join('')}
        ${xParts.join('')}
        ${seriesParts.join('')}
        <g class="cursor-group" aria-hidden="true">
          <line class="cursor-line" x1="0" x2="0" y1="${margin.top}" y2="${margin.top + plotH}"/>
          ${cursorDots}
        </g>
      </svg>
      <div class="chart-tip" id="chart-tip" aria-hidden="true"></div>`;

    const svg = $('.chart', el.chartWrap);
    const paths = Array.from(svg.querySelectorAll('.series-path'));
    if (animate) {
      requestAnimationFrame(() => {
        paths.forEach((path, index) => {
          let length = 0;
          try { length = path.getTotalLength(); } catch (e) { length = 0; }
          if (!length) return;
          path.style.strokeDasharray = String(length);
          path.style.strokeDashoffset = String(length);
          path.style.setProperty('--len', String(length));
          path.style.animationDelay = `${index * 90}ms`;
          path.classList.add('is-drawing');
        });
      });
    }

    state.chart = {
      W, H, margin, plotW, plotH, count, xAt, yAt,
      series: visible,
      svg,
      tip: $('#chart-tip', el.chartWrap),
      cursorLine: $('.cursor-line', svg),
      dots: new Map(Array.from(svg.querySelectorAll('[data-dot]')).map((dot) => [dot.dataset.dot, dot])),
      index: null
    };
  }

  function renderLegend(series) {
    if (!el.chartLegend) return;
    if (!series.length) {
      el.chartLegend.innerHTML = '';
      return;
    }
    el.chartLegend.innerHTML = series.map((s) => {
      const pressed = !state.hidden.has(s.city.id);
      const entry = state.data.get(s.city.id);
      const current = entry && entry.forecast && entry.forecast.current
        ? entry.forecast.current.temperature_2m
        : s.points[0].temp;
      return `<button type="button" class="legend-btn" data-legend="${esc(s.city.id)}" aria-pressed="${pressed}" style="--c:${s.color}">
        <span class="legend-dot" aria-hidden="true"></span>
        <span>${esc(s.city.short)}</span>
        <span class="legend-temp">${fmtInt(current)}°</span>
      </button>`;
    }).join('');
  }

  function showChartIndex(index, announce) {
    const chart = state.chart;
    if (!chart) return;
    const clamped = clamp(index, 0, chart.count - 1);
    chart.index = clamped;
    const x = chart.xAt(clamped);
    const active = chart.svg.classList.contains('is-active');
    if (!active) chart.svg.classList.add('is-active');
    chart.cursorLine.setAttribute('x1', String(x));
    chart.cursorLine.setAttribute('x2', String(x));

    let topPoint = Infinity;
    const rows = [];
    for (const series of chart.series) {
      const point = series.points[clamped];
      const dot = chart.dots.get(series.city.id);
      if (!point) {
        if (dot) dot.style.opacity = '0';
        continue;
      }
      const y = chart.yAt(point.temp);
      topPoint = Math.min(topPoint, y);
      if (dot) {
        dot.setAttribute('cx', String(x));
        dot.setAttribute('cy', String(y));
        dot.style.opacity = '1';
      }
      rows.push({
        name: series.city.short,
        color: series.color,
        temp: point.temp,
        label: condition(point.code, true).label,
        time: point.time
      });
    }

    if (!rows.length) return;
    const first = rows[0];
    const tip = chart.tip;
    const rowsHTML = rows.map((row) => `
      <div class="tip-row">
        <span class="tip-dot" style="--c:${row.color}"></span>
        <span class="tip-name">${esc(row.name)}</span>
        <span class="tip-val">${fmtTemp(row.temp)}</span>
        <span class="tip-cond">${esc(row.label)}</span>
      </div>`).join('');
    tip.innerHTML = `<div class="tip-time">${rows[0].time.slice(11, 13)}时 · ${Number(rows[0].time.slice(5, 7))}月${Number(rows[0].time.slice(8, 10))}日</div>${rowsHTML}`;
    tip.classList.add('is-on');

    const tipH = 44 + rows.length * 20;
    let top = Math.min(topPoint + 16, chart.H - tipH - 6);
    top = Math.max(6, top);
    tip.style.top = `${top}px`;
    tip.style.left = `${clamp(x, 100, chart.W - 100)}px`;

    if (announce) {
      el.chartLive.textContent = `${first.time.slice(11, 13)}时，${rows.map((r) => `${r.name} ${fmtTemp(r.temp)}`).join('，')}。`;
    }
  }

  function hideChartCursor() {
    const chart = state.chart;
    if (!chart) return;
    chart.svg.classList.remove('is-active');
    if (chart.tip) chart.tip.classList.remove('is-on');
    chart.dots.forEach((dot) => { dot.style.opacity = '0'; });
    chart.index = null;
  }

  function chartPointerIndex(clientX) {
    const chart = state.chart;
    if (!chart) return null;
    const rect = el.chartWrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = (x - chart.margin.left) / (chart.plotW / (chart.count - 1));
    return Math.round(clamp(ratio, 0, chart.count - 1));
  }

  /* ---------------------------------------------------------------------
     Rendering: comparison table
     --------------------------------------------------------------------- */
  function renderCompare() {
    const items = withDataItems().filter((item) => fitsPayload(item.data));
    if (!items.length) {
      el.compareTable.innerHTML = '<p class="empty-state">暂时无法获取对照数据。</p>';
      return;
    }

    const rows = [
      {
        label: '天气',
        value: (d) => {
          const info = condition(d.forecast.current.weather_code, d.forecast.current.is_day === 1);
          return `<span class="cell-cond">${glyphSVG(info.glyph)}<span>${info.label}</span></span>`;
        }
      },
      { label: '气温', value: (d) => fmtTemp(d.forecast.current.temperature_2m) },
      { label: '体感', value: (d) => fmtTemp(d.forecast.current.apparent_temperature) },
      {
        label: '今日最高 / 最低',
        value: (d) => `${fmtTemp(d.forecast.daily.temperature_2m_max[0])} / ${fmtTemp(d.forecast.daily.temperature_2m_min[0])}`
      },
      { label: '相对湿度', value: (d) => `${fmtInt(d.forecast.current.relative_humidity_2m)}%` },
      {
        label: '风',
        value: (d) => `${windDir(d.forecast.current.wind_direction_10m)} ${fmt1(d.forecast.current.wind_speed_10m)} km/h`
      },
      { label: '阵风', value: (d) => `${fmt1(d.forecast.current.wind_gusts_10m)} km/h` },
      {
        label: '降水 / 概率',
        value: (d) => {
          const prob = d.forecast.daily.precipitation_probability_max;
          return `${fmt1(d.forecast.current.precipitation)} mm <span class="cell-sub">${Number.isFinite(prob && prob[0]) ? prob[0] : '—'}%</span>`;
        }
      },
      { label: '云量', value: (d) => `${fmtInt(d.forecast.current.cloud_cover)}%` },
      { label: '气压', value: (d) => `${fmt1(d.forecast.current.pressure_msl)} hPa` },
      {
        label: '能见度',
        value: (d) => (Number.isFinite(d.forecast.current.visibility) ? `${fmt1(d.forecast.current.visibility / 1000)} km` : '—')
      },
      {
        label: '紫外线（今日最大）',
        value: (d) => fmt1(d.forecast.daily.uv_index_max && d.forecast.daily.uv_index_max[0])
      },
      {
        label: '空气质量',
        value: (d) => {
          const air = d.air && d.air.current;
          const level = air ? aqiLevel(air.pm2_5) : null;
          if (!level) return '<span class="cell-sub">—</span>';
          return `<span class="cell-aqi"><span class="aqi-dot" style="--aqi:${level.color}" aria-hidden="true"></span>${level.label} <span class="cell-sub">PM2.5 ${fmtInt(air.pm2_5)}</span></span>`;
        }
      },
      {
        label: '日出 / 日落',
        value: (d) => `${hhmm(d.forecast.daily.sunrise && d.forecast.daily.sunrise[0])} / ${hhmm(d.forecast.daily.sunset && d.forecast.daily.sunset[0])}`
      }
    ];

    const head = items.map((item) => `
      <th scope="col"><span class="th-city"><span class="dot" style="--c:${item.color}" aria-hidden="true"></span>${esc(item.city.short)}</span></th>`).join('');

    const body = rows.map((row) => `
      <tr>
        <th scope="row">${row.label}</th>
        ${items.map((item) => `<td>${row.value(item.data)}</td>`).join('')}
      </tr>`).join('');

    el.compareTable.innerHTML = `
      <table class="compare" style="--city-count:${items.length}">
        <caption class="sr-only">各城市当前天气逐项对照</caption>
        <thead><tr><th scope="col" class="row-label">指标</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  /* ---------------------------------------------------------------------
     Rendering: seven day
     --------------------------------------------------------------------- */
  function renderWeek() {
    const items = withDataItems().filter((item) => fitsPayload(item.data) && item.data.forecast.daily.time);
    if (!items.length) {
      el.weekGrid.innerHTML = '<p class="empty-state">暂时无法获取七日预报。</p>';
      return;
    }

    const days = items[0].data.forecast.daily.time;
    const today = bjParts().date;

    const head = days.map((iso, index) => {
      const weekday = index === 0 && iso === today ? '今天' : WEEK_FMT.format(new Date(`${iso}T12:00:00+08:00`));
      const md = `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
      return `<th scope="col" class="week-head${iso === today ? ' is-today' : ''}"><span>${weekday}</span><span class="wk-date">${md}</span></th>`;
    }).join('');

    const body = items.map((item) => {
      const daily = item.data.forecast.daily;
      const cells = days.map((iso, index) => {
        const code = daily.weather_code[index];
        const info = condition(code, true);
        const high = daily.temperature_2m_max[index];
        const low = daily.temperature_2m_min[index];
        return `<td>
          <div class="week-cell">
            ${glyphSVG(info.glyph)}
            <span class="hi">${fmtInt(high)}°</span>
            <span class="lo">${fmtInt(low)}°</span>
          </div>
        </td>`;
      }).join('');
      return `<tr>
        <th scope="row"><span class="week-city"><span class="dot" style="--c:${item.color}" aria-hidden="true"></span>${esc(item.city.short)}</span></th>
        ${cells}
      </tr>`;
    }).join('');

    el.weekGrid.innerHTML = `
      <table class="week-table">
        <caption class="sr-only">未来七日各城市最高与最低气温</caption>
        <thead><tr><th scope="col" class="week-corner">城市</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  /* ---------------------------------------------------------------------
     Render orchestration
     --------------------------------------------------------------------- */
  function renderAll() {
    const hasAny = loadedItems().length > 0;
    applyPhase(computePhase());

    if (hasAny) {
      renderSky();
      renderChart(!state.chartAnimated);
      state.chartAnimated = true;
      renderCompare();
      renderWeek();
    } else if (state.loading || !state.lastError) {
      renderSkeleton();
    } else {
      renderError();
    }

    updateBanner();
    updateUpdatedMeta();
  }

  function applyPhase(phase) {
    if (!el.sky) return;
    if (state.phase !== phase) {
      state.phase = phase;
      el.sky.dataset.phase = phase;
      if (el.themeColor && SKY_THEMES[phase]) el.themeColor.setAttribute('content', SKY_THEMES[phase]);
    } else {
      el.sky.dataset.phase = phase;
    }
    if (loadedItems().length) renderSolar();
  }

  function updateBanner() {
    if (!el.banner) return;
    if (state.lastError && state.fetchedAt) {
      el.bannerText.textContent = `网络连接不稳定，当前显示 ${timeHM(state.fetchedAt)} 的缓存数据。`;
      el.banner.hidden = false;
    } else if (state.lastError && !state.fetchedAt) {
      el.bannerText.textContent = '天气数据暂时获取失败，请检查网络后重试。';
      el.banner.hidden = false;
    } else {
      el.banner.hidden = true;
    }
  }

  function updateUpdatedMeta() {
    if (!el.updatedAt) return;
    if (!state.fetchedAt) {
      el.updatedAt.textContent = '—';
      return;
    }
    const minutes = Math.floor((Date.now() - state.fetchedAt) / 60000);
    const rel = minutes <= 0 ? '刚刚' : `${minutes} 分钟前`;
    el.updatedAt.textContent = `${timeHM(state.fetchedAt)}（${rel}）`;
  }

  /* ---------------------------------------------------------------------
     Clock + phase loop
     --------------------------------------------------------------------- */
  let lastDateLabel = '';
  let lastMinute = -1;

  function tickClock() {
    const now = new Date();
    el.clockTime.textContent = SEC_FMT.format(now);
    el.clockTime.setAttribute('datetime', now.toISOString());

    const dateLabel = DATE_FMT.format(now).replace('星期', ' 星期');
    if (dateLabel !== lastDateLabel) {
      el.clockDate.textContent = dateLabel;
      lastDateLabel = dateLabel;
    }

    const minute = now.getMinutes();
    if (minute !== lastMinute) {
      lastMinute = minute;
      applyPhase(computePhase());
      updateUpdatedMeta();
    }
  }

  /* ---------------------------------------------------------------------
     Add / remove cities
     --------------------------------------------------------------------- */
  let toastTimer = 0;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-on'), 2600);
  }

  function openDialog() {
    if (!el.dialog || el.dialog.open) return;
    el.search.value = '';
    state.geoResults = [];
    state.geoQuery = '';
    el.search.disabled = false;
    renderQuick();
    renderResults('');
    el.cityCount.textContent = `已添加 ${state.cities.length} 座`;
    if (typeof el.dialog.showModal === 'function') el.dialog.showModal();
    else el.dialog.setAttribute('open', '');
    setTimeout(() => el.search.focus(), 30);
  }

  function closeDialog() {
    if (!el.dialog) return;
    if (typeof el.dialog.close === 'function') el.dialog.close();
    else el.dialog.removeAttribute('open');
  }

  function renderQuick() {
    const remaining = MAX_CITIES - state.cities.length;
    el.quick.innerHTML = QUICK_IDS.map((id) => {
      const city = PRESETS.find((c) => c.id === id);
      if (!city) return '';
      const added = state.cities.some((c) => c.id === id);
      const disabled = added || remaining <= 0;
      return `<button type="button" class="chip" data-quick="${esc(city.id)}"${disabled ? ' disabled' : ''}>${esc(city.name)}</button>`;
    }).join('');
  }

  function cityRowHTML(city, key) {
    const added = state.cities.some((c) => c.id === city.id);
    const full = state.cities.length >= MAX_CITIES && !added;
    const disabled = added || full;
    let note = '添加';
    if (added) note = '已添加';
    else if (full) note = '已达上限';
    return `<button type="button" class="result-row" data-result="${esc(key)}"${disabled ? ' disabled' : ''}>
      <span class="result-main">
        <span class="result-name">${esc(city.name)}</span>
        <span class="result-region">${esc(city.region)}</span>
      </span>
      <span class="result-add">${note}</span>
    </button>`;
  }

  function renderResults(query, options = {}) {
    if (!el.results) return;
    const q = String(query || '').trim();
    const rows = [];
    dialogCityMap = new Map();

    if (q) {
      const local = PRESETS.concat(getPlaces()).filter((city) => {
        const haystack = `${city.name}${city.short}${city.region}`;
        return haystack.includes(q);
      }).slice(0, MAX_RESULTS);
      for (const city of local) {
        const key = `p:${city.id}`;
        rows.push(cityRowHTML(city, key));
        dialogCityMap.set(key, city);
      }
    }

    if (state.geoResults.length) {
      for (const city of state.geoResults) {
        if (state.cities.some((c) => c.id === city.id)) continue;
        const key = `g:${city.id}`;
        rows.push(cityRowHTML(city, key));
        dialogCityMap.set(key, city);
      }
    }

    if (!q) {
      el.results.innerHTML = '<p class="result-hint">输入城市或区县名称搜索（如 微山县、薛城区），也可以从上方热门城市中添加。区县坐标来自 AreaCity（高德地图）。</p>';
      return;
    }

    if (!rows.length) {
      const searching = options.searching;
      el.results.innerHTML = `<p class="result-status">${searching ? '正在搜索更多地点…' : `没有找到「${esc(q)}」，换个名称试试，或输入上一级城市名。`}</p>`;
      return;
    }

    const status = options.searching ? '<p class="result-status">正在搜索更多地点…</p>' : '';
    el.results.innerHTML = rows.join('') + status;
  }

  let dialogCityMap = new Map();
  let searchTimer = 0;

  function onSearchInput() {
    const query = el.search.value.trim();
    state.geoQuery = query;
    state.geoResults = [];
    const token = ++state.geoToken;
    renderResults(query);
    clearTimeout(searchTimer);
    if (!query) return;

    const localHit = PRESETS.concat(getPlaces()).some((city) => `${city.name}${city.short}${city.region}`.includes(query));
    if (localHit) return;

    searchTimer = setTimeout(async () => {
      const currentToken = token;
      renderResults(query, { searching: true });
      try {
        const meteoParams = new URLSearchParams({ name: query, count: '8', language: 'zh', format: 'json' });
        const payload = await fetchJSON(`${API.geo}?${meteoParams.toString()}`, 8000);
        if (currentToken !== state.geoToken || query !== state.geoQuery) return;
        const seen = new Set();
        const results = [];
        for (const raw of (payload && payload.results) || []) {
          const city = toCityFromGeo(raw);
          if (!city) continue;
          const dedupe = `${city.name}|${city.lat.toFixed(2)}|${city.lon.toFixed(2)}`;
          if (seen.has(dedupe)) continue;
          if (PRESETS.some((preset) => preset.name === city.name)) continue;
          seen.add(dedupe);
          results.push(city);
          if (results.length >= 8) break;
        }
        state.geoResults = results;
        renderResults(query);
      } catch (e) {
        if (currentToken !== state.geoToken) return;
        renderResults(query);
      }
    }, 600);
  }

  async function addCity(city) {
    if (!city) return;
    if (state.cities.length >= MAX_CITIES) {
      toast(`最多同时对照 ${MAX_CITIES} 座城市`);
      return;
    }
    if (state.cities.some((c) => c.id === city.id)) {
      toast(`${city.name} 已经在对照列表中`);
      return;
    }

    state.cities.push(city);
    persistCities();
    syncUrl();
    closeDialog();
    toast(`已添加${city.name}`);
    renderAll();

    state.loading = true;
    syncLoadingUI();
    try {
      const entry = await fetchCityData(city);
      if (!state.cities.some((c) => c.id === city.id)) return;
      state.data.set(city.id, entry);
      state.fetchedAt = Date.now();
      state.lastError = false;
      saveCache();
    } catch (e) {
      toast(`${city.name} 的天气数据获取失败，稍后重试`);
    } finally {
      state.loading = false;
      syncLoadingUI();
      renderAll();
    }
  }

  function removeCity(id) {
    if (state.cities.length <= 1) {
      toast('至少保留一座城市');
      return;
    }
    const city = state.cities.find((c) => c.id === id);
    state.cities = state.cities.filter((c) => c.id !== id);
    persistCities();
    syncUrl();
    renderAll();
    toast(city ? `已移除${city.short}` : '已移除城市');
  }

  function resetCities() {
    state.cities = DEFAULT_IDS.map((id) => PRESETS.find((c) => c.id === id)).filter(Boolean);
    persistCities();
    syncUrl();
    closeDialog();
    renderAll();
    toast('已恢复默认城市');
    refresh();
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */
  function attachEvents() {
    el.refreshBtn.addEventListener('click', () => refresh());
    el.bannerRetry.addEventListener('click', () => refresh());
    el.addBtn.addEventListener('click', openDialog);
    el.dialogClose.addEventListener('click', closeDialog);
    el.dialog.addEventListener('click', (event) => {
      if (event.target === el.dialog) closeDialog();
    });
    el.dialog.addEventListener('close', () => { el.geoToken += 1; });
    el.search.addEventListener('input', debounce(onSearchInput, 120));
    el.search.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const first = el.results.querySelector('.result-row:not(:disabled)');
      if (first) first.click();
    });
    el.quick.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-quick]');
      if (!chip || chip.disabled) return;
      const city = PRESETS.find((c) => c.id === chip.dataset.quick);
      if (city) addCity(city);
    });
    el.results.addEventListener('click', (event) => {
      const row = event.target.closest('[data-result]');
      if (!row || row.disabled) return;
      const city = dialogCityMap.get(row.dataset.result);
      if (city) addCity(city);
    });
    el.resetCities.addEventListener('click', resetCities);

    el.cityRow.addEventListener('scroll', () => {
      const atEnd = el.cityRow.scrollLeft + el.cityRow.clientWidth >= el.cityRow.scrollWidth - 4;
      el.cityRow.classList.toggle('is-end', atEnd);
      if (atEnd) el.swipeHint.hidden = true;
      else updateSwipeHint();
    }, { passive: true });

    el.cityRow.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove]');
      if (remove) {
        removeCity(remove.dataset.remove);
        return;
      }
      if (event.target.closest('[data-action="add"]')) openDialog();
    });

    el.chartLegend.addEventListener('click', (event) => {
      const button = event.target.closest('[data-legend]');
      if (!button) return;
      const id = button.dataset.legend;
      if (state.hidden.has(id)) state.hidden.delete(id);
      else state.hidden.add(id);
      renderChart(false);
    });

    el.chartWrap.addEventListener('pointermove', (event) => {
      if (!state.chart) return;
      if (event.pointerType === 'touch' && event.buttons === 0) return;
      const index = chartPointerIndex(event.clientX);
      if (index !== null) showChartIndex(index, false);
    });
    el.chartWrap.addEventListener('pointerdown', (event) => {
      if (!state.chart) return;
      const index = chartPointerIndex(event.clientX);
      if (index !== null) showChartIndex(index, false);
    });
    el.chartWrap.addEventListener('pointerleave', () => hideChartCursor());
    el.chartWrap.addEventListener('focusin', () => {
      if (state.chart && state.chart.index === null) showChartIndex(0, true);
    });
    el.chartWrap.addEventListener('focusout', (event) => {
      if (!el.chartWrap.contains(event.relatedTarget)) hideChartCursor();
    });
    el.chartWrap.addEventListener('keydown', (event) => {
      if (!state.chart) return;
      const current = state.chart.index === null ? 0 : state.chart.index;
      let next = null;
      if (event.key === 'ArrowRight') next = current + 1;
      else if (event.key === 'ArrowLeft') next = current - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = state.chart.count - 1;
      else if (event.key === 'Escape') { hideChartCursor(); return; }
      if (next === null) return;
      event.preventDefault();
      showChartIndex(next, true);
    });

    const onResize = debounce(() => {
      updateSwipeHint();
      if (state.chart) renderChart(false);
      else if (loadedItems().length) renderChart(false);
    }, 160);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(onResize);
      observer.observe(el.chartWrap);
    } else {
      window.addEventListener('resize', onResize);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - state.fetchedAt > AUTO_REFRESH_MS) refresh();
    });

    setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, AUTO_REFRESH_MS);
  }

  function observeReveals() {
    const targets = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        target.style.transitionDelay = `${order * 80}ms`;
        target.classList.add('is-in');
        observer.unobserve(target);
        order += 1;
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((target) => observer.observe(target));
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    cacheDom();
    state.cities = loadCities();
    loadCache();
    persistCities();
    syncUrl();
    el.maxCities.textContent = String(MAX_CITIES);
    el.cityCount.textContent = `已添加 ${state.cities.length} 座`;

    applyPhase(computePhase());
    renderAll();
    tickClock();
    setInterval(tickClock, 1000);
    observeReveals();
    attachEvents();
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
