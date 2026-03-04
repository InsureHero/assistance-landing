import { toIsoDate } from "@/lib/dates";

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
