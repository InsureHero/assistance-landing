import React from "react";
import { render, screen } from "@testing-library/react";
import { BookingFlow } from "@/components/BookingFlow";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: { src: string; alt: string }) {
    return <img src={props.src} alt={props.alt} />;
  },
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

describe("BookingFlow", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  it("renderiza el flujo envuelto en LanguageProvider", () => {
    render(<BookingFlow />);
    // Sin token válido, debe mostrarse el paso 1 (OtpVerification) tras hidratación
    expect(screen.getByText(/Cargando|Loading|Encuentra tu Reservación|Find Your Reservation/i)).toBeTruthy();
  });

  it("muestra el paso 1 (OTP) cuando está hidratado", async () => {
    render(<BookingFlow />);
    // Sin token, debe mostrarse el paso 1: título "Find Your Reservation" o "Encuentra tu Reservación"
    const title = await screen.findByRole("heading", {
      name: /Find Your Reservation|Encuentra tu Reservación/i,
    });
    expect(title).toBeInTheDocument();
  });
});
