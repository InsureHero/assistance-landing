import { toIsoDate, formatDateOnly } from "@/lib/dates";

describe("lib/dates — toIsoDate", () => {
  it("devuelve cadena vacía si el valor está vacío", () => {
    expect(toIsoDate("")).toBe("");
    expect(toIsoDate("   ")).toBe("");
  });

  it("devuelve la misma cadena si ya está en formato ISO (YYYY-MM-DD)", () => {
    expect(toIsoDate("2025-03-15")).toBe("2025-03-15");
    expect(toIsoDate("2025-03-15")).toBe("2025-03-15");
    expect(toIsoDate("  2025-12-01  ")).toBe("2025-12-01");
  });

  it("convierte DD/MM/YYYY a YYYY-MM-DD", () => {
    expect(toIsoDate("15/3/2025")).toBe("2025-03-15");
    expect(toIsoDate("01/12/2024")).toBe("2024-12-01");
    expect(toIsoDate("9/9/2020")).toBe("2020-09-09");
  });

  it("mantiene valores que no coinciden con los formatos esperados", () => {
    expect(toIsoDate("invalid")).toBe("invalid");
    expect(toIsoDate("15-03-2025")).toBe("15-03-2025");
  });
});

describe("lib/dates — formatDateOnly (sin off-by-one por TZ)", () => {
  const originalTZ = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  // El bug original: new Date("2026-09-20") en TZ negativa mostraba el 19.
  for (const tz of ["America/Mexico_City", "UTC"]) {
    it(`renderiza "2026-09-20" como "20 de septiembre de 2026" con TZ=${tz}`, () => {
      process.env.TZ = tz;
      expect(formatDateOnly("2026-09-20", "es")).toBe("20 de septiembre de 2026");
    });
  }

  it("acepta valores con hora y solo usa la fecha", () => {
    process.env.TZ = "America/Mexico_City";
    expect(formatDateOnly("2026-09-20T23:00:00Z", "es")).toBe("20 de septiembre de 2026");
  });

  it("retorna fallback para valores vacíos o inválidos", () => {
    expect(formatDateOnly(undefined, "es")).toBe("—");
    expect(formatDateOnly("nope", "es")).toBe("nope");
  });
});
