import { sendOtp, verifyOtp } from "@/services/otp.service";
import * as authService from "@/services/auth.service";

jest.mock("@/services/auth.service", () => ({
  requestPostventaOtp: jest.fn(),
  verifyPostventaOtp: jest.fn(),
}));

describe("otp.service — sendOtp", () => {
  it("llama a requestPostventaOtp con el email recibido (la normalización la hace el componente)", async () => {
    const requestOtp = authService.requestPostventaOtp as jest.Mock;
    requestOtp.mockResolvedValue(undefined);

    await sendOtp("user@example.com");

    expect(requestOtp).toHaveBeenCalledWith("user@example.com");
  });

  it("propaga el error si requestPostventaOtp falla", async () => {
    const requestOtp = authService.requestPostventaOtp as jest.Mock;
    requestOtp.mockRejectedValue(new Error("Network error"));

    await expect(sendOtp("user@test.com")).rejects.toThrow("Network error");
  });
});

describe("otp.service — verifyOtp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve success true y newToken cuando la verificación es correcta", async () => {
    const verifyPostventa = authService.verifyPostventaOtp as jest.Mock;
    verifyPostventa.mockResolvedValue("jwt-token-123");

    const result = await verifyOtp("user@test.com", "123456");

    expect(result).toEqual({ success: true, newToken: "jwt-token-123" });
    expect(verifyPostventa).toHaveBeenCalledWith("user@test.com", "123456");
  });

  it("devuelve success false con mensaje cuando la verificación falla", async () => {
    const verifyPostventa = authService.verifyPostventaOtp as jest.Mock;
    verifyPostventa.mockRejectedValue(new Error("Código incorrecto"));

    const result = await verifyOtp("user@test.com", "000000");

    expect(result).toEqual({
      success: false,
      errorMessage: "Código incorrecto",
    });
  });

  it("devuelve mensaje genérico cuando el error no es instancia de Error", async () => {
    const verifyPostventa = authService.verifyPostventaOtp as jest.Mock;
    verifyPostventa.mockRejectedValue("string error");

    const result = await verifyOtp("user@test.com", "123456");

    expect(result.success).toBe(false);
    expect(result).toHaveProperty("errorMessage", "Error al verificar el código");
  });
});
