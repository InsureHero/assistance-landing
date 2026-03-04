import {
  getBaseUrl,
  isTokenExpired,
  BOOKING_STORAGE_KEYS,
  SESSION_EXPIRED_EVENT,
} from "@/services/auth.service";

describe("auth.service — getBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("devuelve vacío si no hay URL configurada", () => {
    delete process.env.NEXT_API_BASE_URL;
    expect(getBaseUrl()).toBe("");
  });

  it("quita la barra final de la URL", () => {
    process.env.NEXT_API_BASE_URL = "https://api.example.com/";
    expect(getBaseUrl()).toBe("https://api.example.com");
  });
});

describe("auth.service — isTokenExpired", () => {
  function makeJWT(exp: number): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "user@test.com", exp })).toString("base64url");
    const signature = Buffer.from("sig").toString("base64url");
    return `${header}.${payload}.${signature}`;
  }

  it("devuelve true si el token es null o vacío", () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired("")).toBe(true);
    expect(isTokenExpired("short")).toBe(true);
  });

  it("devuelve true si el token está expirado", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(isTokenExpired(makeJWT(past))).toBe(true);
  });

  it("devuelve false si el token no ha expirado", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(makeJWT(future))).toBe(false);
  });

  it("devuelve false si el payload no tiene exp (token inválido pero no expirado)", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "user" })).toString("base64url");
    const token = `${header}.${payload}.x`;
    expect(isTokenExpired(token)).toBe(false);
  });
});

describe("auth.service — constants", () => {
  it("BOOKING_STORAGE_KEYS tiene las claves esperadas", () => {
    expect(BOOKING_STORAGE_KEYS.step).toBe("booking_step");
    expect(BOOKING_STORAGE_KEYS.email).toBe("booking_email");
    expect(BOOKING_STORAGE_KEYS.riskItem).toBe("booking_risk_item");
    expect(BOOKING_STORAGE_KEYS.travelers).toBe("booking_travelers");
  });

  it("SESSION_EXPIRED_EVENT está definido", () => {
    expect(SESSION_EXPIRED_EVENT).toBe("auth:session-expired");
  });
});
