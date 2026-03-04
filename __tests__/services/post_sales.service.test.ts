import {
  getPostSalesBaseUrl,
  getPostSalesChannelId,
  toPostSalesBeneficiary,
  type PostSalesBeneficiary,
} from "@/services/post_sales.service";
import type { BeneficiaryPayload } from "@/services/risk_item.service";

describe("post_sales.service — getPostSalesBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("devuelve vacío si no hay URL configurada", () => {
    delete process.env.NEXT_PUBLIC_POST_SALES_API_URL;
    expect(getPostSalesBaseUrl()).toBe("");
  });

  it("devuelve la URL sin barra final", () => {
    process.env.NEXT_PUBLIC_POST_SALES_API_URL = "https://postsales.example.com/";
    expect(getPostSalesBaseUrl()).toBe("https://postsales.example.com");
  });
});

describe("post_sales.service — getPostSalesChannelId", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("devuelve null si no está configurado", () => {
    delete process.env.NEXT_PUBLIC_POST_SALES_CHANNEL_ID;
    expect(getPostSalesChannelId()).toBeNull();
  });

  it("devuelve el channel ID recortado", () => {
    process.env.NEXT_PUBLIC_POST_SALES_CHANNEL_ID = "  uuid-123  ";
    expect(getPostSalesChannelId()).toBe("uuid-123");
  });
});

describe("post_sales.service — toPostSalesBeneficiary", () => {
  const basePayload: BeneficiaryPayload = {
    name: "Juan",
    lastname: "Pérez",
    isHolder: true,
    isTraveler: false,
    dateOfBirth: "15/3/1990",
    fiscalType: "1004",
    fiscalId: "PEJP900315",
    documentCountry: "MX",
    source: "IH_LANDING",
    added_at: new Date().toISOString(),
  };

  it("convierte payload a PostSalesBeneficiary con action create", () => {
    const result = toPostSalesBeneficiary(basePayload, "create");
    expect(result).toMatchObject({
      name: "Juan",
      lastname: "Pérez",
      isHolder: true,
      dateOfBirth: "1990-03-15",
      fiscalType: "1004",
      fiscalId: "PEJP900315",
      action: "create",
    });
    expect(result.dateOfBirth).toBe("1990-03-15");
  });

  it("convierte payload con action edit", () => {
    const result = toPostSalesBeneficiary(basePayload, "edit");
    expect(result.action).toBe("edit");
  });

  it("incluye email, mobilePrefix y phone cuando están presentes", () => {
    const withContact: BeneficiaryPayload = {
      ...basePayload,
      email: "juan@test.com",
      mobilePrefix: "+52",
      phone: "5512345678",
    };
    const result = toPostSalesBeneficiary(withContact, "create");
    expect(result.email).toBe("juan@test.com");
    expect(result.mobilePrefix).toBe("+52");
    expect(result.phone).toBe("5512345678");
  });

  it("no incluye email ni teléfono cuando están vacíos", () => {
    const result = toPostSalesBeneficiary(basePayload, "create");
    expect("email" in result ? result.email : undefined).toBeUndefined();
    expect("mobilePrefix" in result ? result.mobilePrefix : undefined).toBeUndefined();
    expect("phone" in result ? result.phone : undefined).toBeUndefined();
  });

  it("acepta fecha ya en formato ISO", () => {
    const payload: BeneficiaryPayload = {
      ...basePayload,
      dateOfBirth: "1990-03-15",
    };
    const result = toPostSalesBeneficiary(payload, "create");
    expect(result.dateOfBirth).toBe("1990-03-15");
  });
});
