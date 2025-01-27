export const API_CONFIG = {
  BASE_URL: "http://0.0.0.0:8000",
  ENDPOINTS: {
    LOGIN: "/api/v1/login",
    COMPETITORS: "/api/v1/competitor/yachts/details",
    COMPETITOR_YACHTS: "/api/v1/competitor/yachts/names",
    BOT_START: "/api/v1/bot/start",
    BOT_STOP: "/api/v1/bot/stop",
    BOT_STATUS: "/api/v1/bot/status",
    PRICE_DATA: "/api/v1/price-data",
  },
}

export const OUR_BOATS = [
  { id: "52110487", name: "Mitra" },
  { id: "52110484", name: "Apollo" },
  { id: "52110486", name: "Artemis" },
  { id: "52071436", name: "Poseidon" },
  { id: "52110483", name: "Zeus" },
]
