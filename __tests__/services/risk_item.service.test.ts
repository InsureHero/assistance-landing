import { getRiskItemsByEmail } from "@/services/risk_item.service";
import type { RiskItem } from "@/services/risk_item.service";
import * as authService from "@/services/auth.service";

jest.mock("@/services/auth.service", () => ({
  getStoredAccessToken: jest.fn(),
  getBaseUrl: jest.fn(() => "https://api.test.com"),
  clearSessionAndNotify: jest.fn(),
}));

const mockGetStoredAccessToken = authService.getStoredAccessToken as jest.Mock;
const mockGetBaseUrl = authService.getBaseUrl as jest.Mock;

describe("risk_item.service — getRiskItemsByEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBaseUrl.mockReturnValue("https://api.test.com");
  });

  it("lanza si no hay token de sesión", async () => {
    mockGetStoredAccessToken.mockReturnValue(null);

    await expect(getRiskItemsByEmail("user@test.com")).rejects.toThrow(
      "No hay token de sesión"
    );
  });

  it("usa el token pasado como argumento si se proporciona", async () => {
    mockGetStoredAccessToken.mockReturnValue(null);
    const riskItems: RiskItem[] = [{ id: "ri-1", status: "active" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: riskItems })),
    });

    const result = await getRiskItemsByEmail("user@test.com", "custom-token");

    expect(result).toEqual(riskItems);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/postventa/v1/me/risk-items",
      expect.objectContaining({
        method: "GET",
        headers: { authorization: "Bearer custom-token" },
      })
    );
  });

  it("devuelve array de risk items cuando la API responde data", async () => {
    mockGetStoredAccessToken.mockReturnValue("jwt-token");
    const riskItems: RiskItem[] = [{ id: "ri-1" }, { id: "ri-2" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: riskItems })),
    });

    const result = await getRiskItemsByEmail("user@test.com");

    expect(result).toEqual(riskItems);
  });

  it("acepta respuesta con Data (mayúscula)", async () => {
    mockGetStoredAccessToken.mockReturnValue("jwt-token");
    const riskItems: RiskItem[] = [{ id: "ri-1" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ Data: riskItems })),
    });

    const result = await getRiskItemsByEmail("user@test.com");

    expect(result).toEqual(riskItems);
  });

  it("lanza cuando la respuesta no es ok", async () => {
    mockGetStoredAccessToken.mockReturnValue("jwt-token");
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Error interno"),
    });

    await expect(getRiskItemsByEmail("user@test.com")).rejects.toThrow(
      /Error al obtener risk items/
    );
  });
});
