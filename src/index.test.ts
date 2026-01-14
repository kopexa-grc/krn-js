import { describe, expect, it } from "vitest";
import {
  DOMAIN,
  getResource,
  isValidResourceId,
  isValidService,
  isValidVersion,
  KRN,
  KRNError,
  KRNErrorCode,
  krn,
  safeResourceId,
} from "./index.js";

describe("KRN.parse", () => {
  describe("valid KRNs", () => {
    it("parses simple KRN", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.depth()).toBe(1);
      expect(k.basename()).toBe("iso27001");
      expect(k.toString()).toBe("//kopexa.com/frameworks/iso27001");
    });

    it("parses nested KRN", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      expect(k.depth()).toBe(2);
      expect(k.basename()).toBe("a-5-1");
      expect(k.basenameCollection()).toBe("controls");
    });

    it("parses KRN with version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@v2");
      expect(k.hasVersion()).toBe(true);
      expect(k.version).toBe("v2");
    });

    it("parses KRN with semantic version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@v1.2.3");
      expect(k.version).toBe("v1.2.3");
    });

    it("parses KRN with latest version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@latest");
      expect(k.version).toBe("latest");
    });

    it("parses KRN with draft version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@draft");
      expect(k.version).toBe("draft");
    });

    it("parses deep nested KRN", () => {
      const k = KRN.parse(
        "//kopexa.com/tenants/acme-corp/control-implementations/ci-123/evidences/ev-456",
      );
      expect(k.depth()).toBe(3);
    });

    it("parses resource ID with dots", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/5.1.1");
      expect(k.basename()).toBe("5.1.1");
    });

    it("parses resource ID with underscores", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso_27001_2022");
      expect(k.basename()).toBe("iso_27001_2022");
    });

    it("parses single character resource ID", () => {
      const k = KRN.parse("//kopexa.com/frameworks/x");
      expect(k.basename()).toBe("x");
    });
  });

  describe("KRN with service", () => {
    it("parses KRN with service", () => {
      const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001");
      expect(k.service).toBe("catalog");
      expect(k.hasService()).toBe(true);
      expect(k.fullDomain()).toBe("catalog.kopexa.com");
      expect(k.toString()).toBe("//catalog.kopexa.com/frameworks/iso27001");
    });

    it("parses KRN with service and version", () => {
      const k = KRN.parse("//isms.kopexa.com/tenants/acme-corp@v1");
      expect(k.service).toBe("isms");
      expect(k.version).toBe("v1");
    });

    it("parses KRN with service - nested", () => {
      const k = KRN.parse(
        "//policy.kopexa.com/frameworks/iso27001/controls/a-5-1",
      );
      expect(k.service).toBe("policy");
      expect(k.depth()).toBe(2);
    });

    it("parses KRN without service has empty service", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.service).toBe("");
      expect(k.hasService()).toBe(false);
      expect(k.fullDomain()).toBe("kopexa.com");
    });
  });

  describe("control number formats", () => {
    it("parses control number with dots", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/5.1.1");
      expect(k.basename()).toBe("5.1.1");
      expect(k.resourceId("controls")).toBe("5.1.1");
    });

    it("parses control number dash style", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/5-1-1");
      expect(k.basename()).toBe("5-1-1");
    });

    it("parses CIS control number style", () => {
      const k = KRN.parse("//kopexa.com/frameworks/cis-aws/controls/1.1.1");
      expect(k.basename()).toBe("1.1.1");
    });

    it("parses NIST control number style", () => {
      const k = KRN.parse("//kopexa.com/frameworks/nist-csf/controls/PR.AC-1");
      expect(k.basename()).toBe("PR.AC-1");
    });
  });

  describe("invalid KRNs", () => {
    it("throws on empty string", () => {
      expect(() => KRN.parse("")).toThrow(KRNError);
      expect(() => KRN.parse("")).toThrow("empty KRN string");
    });

    it("throws on missing prefix", () => {
      expect(() => KRN.parse("kopexa.com/frameworks/iso27001")).toThrow(
        KRNError,
      );
    });

    it("throws on wrong domain", () => {
      expect(() => KRN.parse("//google.com/frameworks/iso27001")).toThrow(
        KRNError,
      );
    });

    it("throws on missing resource", () => {
      expect(() => KRN.parse("//kopexa.com")).toThrow(KRNError);
    });

    it("throws on odd number of path segments", () => {
      expect(() => KRN.parse("//kopexa.com/frameworks")).toThrow(KRNError);
    });

    it("throws on empty collection", () => {
      expect(() => KRN.parse("//kopexa.com//iso27001")).toThrow(KRNError);
    });

    it("throws on invalid resource ID - starts with dash", () => {
      expect(() => KRN.parse("//kopexa.com/frameworks/-iso27001")).toThrow(
        KRNError,
      );
    });

    it("throws on invalid resource ID - ends with dash", () => {
      expect(() => KRN.parse("//kopexa.com/frameworks/iso27001-")).toThrow(
        KRNError,
      );
    });

    it("throws on invalid version format", () => {
      expect(() =>
        KRN.parse("//kopexa.com/frameworks/iso27001@invalid"),
      ).toThrow(KRNError);
    });

    it("throws on invalid service name - uppercase", () => {
      expect(() =>
        KRN.parse("//CATALOG.kopexa.com/frameworks/iso27001"),
      ).toThrow(KRNError);
    });

    it("throws on invalid service name - starts with number", () => {
      expect(() =>
        KRN.parse("//1catalog.kopexa.com/frameworks/iso27001"),
      ).toThrow(KRNError);
    });
  });
});

describe("KRN.tryParse", () => {
  it("returns KRN for valid string", () => {
    const k = KRN.tryParse("//kopexa.com/frameworks/iso27001");
    expect(k).not.toBeNull();
    expect(k?.basename()).toBe("iso27001");
  });

  it("returns null for invalid string", () => {
    expect(KRN.tryParse("invalid")).toBeNull();
    expect(KRN.tryParse("")).toBeNull();
  });
});

describe("KRN.isValid", () => {
  it("returns true for valid KRN", () => {
    expect(KRN.isValid("//kopexa.com/frameworks/iso27001")).toBe(true);
    expect(KRN.isValid("//kopexa.com/frameworks/iso27001@v1")).toBe(true);
    expect(KRN.isValid("//catalog.kopexa.com/frameworks/iso27001")).toBe(true);
  });

  it("returns false for invalid KRN", () => {
    expect(KRN.isValid("")).toBe(false);
    expect(KRN.isValid("invalid")).toBe(false);
    expect(KRN.isValid("//google.com/frameworks/iso27001")).toBe(false);
  });
});

describe("KRN methods", () => {
  describe("resourceId", () => {
    it("finds framework ID", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      expect(k.resourceId("frameworks")).toBe("iso27001");
    });

    it("finds control ID", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      expect(k.resourceId("controls")).toBe("a-5-1");
    });

    it("throws for not found", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(() => k.resourceId("nonexistent")).toThrow(KRNError);
    });
  });

  describe("tryResourceId", () => {
    it("returns ID when found", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.tryResourceId("frameworks")).toBe("iso27001");
    });

    it("returns null when not found", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.tryResourceId("nonexistent")).toBeNull();
    });
  });

  describe("hasResource", () => {
    it("returns true when exists", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      expect(k.hasResource("frameworks")).toBe(true);
      expect(k.hasResource("controls")).toBe(true);
    });

    it("returns false when not exists", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.hasResource("nonexistent")).toBe(false);
    });
  });

  describe("parent", () => {
    it("returns parent KRN", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      const parent = k.parent();
      expect(parent).not.toBeNull();
      expect(parent?.toString()).toBe("//kopexa.com/frameworks/iso27001");
    });

    it("returns null for root resource", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.parent()).toBeNull();
    });

    it("parent does not inherit version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1@v1");
      const parent = k.parent();
      expect(parent?.hasVersion()).toBe(false);
    });

    it("parent preserves service", () => {
      const k = KRN.parse(
        "//catalog.kopexa.com/frameworks/iso27001/controls/a-5-1",
      );
      const parent = k.parent();
      expect(parent?.service).toBe("catalog");
    });
  });

  describe("withVersion", () => {
    it("adds version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      const versioned = k.withVersion("v1");
      expect(versioned.version).toBe("v1");
      expect(k.hasVersion()).toBe(false); // Original unchanged
    });

    it("throws on invalid version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(() => k.withVersion("invalid")).toThrow(KRNError);
    });

    it("preserves service", () => {
      const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001");
      const versioned = k.withVersion("v1");
      expect(versioned.service).toBe("catalog");
    });
  });

  describe("withoutVersion", () => {
    it("removes version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@v1");
      const unversioned = k.withoutVersion();
      expect(unversioned.hasVersion()).toBe(false);
      expect(k.hasVersion()).toBe(true); // Original unchanged
    });

    it("preserves service", () => {
      const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001@v1");
      const unversioned = k.withoutVersion();
      expect(unversioned.service).toBe("catalog");
    });
  });

  describe("withService", () => {
    it("adds service", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      const withService = k.withService("catalog");
      expect(withService.service).toBe("catalog");
      expect(withService.toString()).toBe(
        "//catalog.kopexa.com/frameworks/iso27001",
      );
      expect(k.hasService()).toBe(false); // Original unchanged
    });

    it("throws on invalid service", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(() => k.withService("Invalid")).toThrow(KRNError);
    });

    it("preserves version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@v1");
      const withService = k.withService("catalog");
      expect(withService.version).toBe("v1");
    });
  });

  describe("withoutService", () => {
    it("removes service", () => {
      const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001");
      const withoutService = k.withoutService();
      expect(withoutService.hasService()).toBe(false);
      expect(withoutService.toString()).toBe(
        "//kopexa.com/frameworks/iso27001",
      );
      expect(k.hasService()).toBe(true); // Original unchanged
    });
  });

  describe("equals", () => {
    it("returns true for equal KRNs", () => {
      const k1 = KRN.parse("//kopexa.com/frameworks/iso27001");
      const k2 = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k1.equals(k2)).toBe(true);
    });

    it("returns false for different KRNs", () => {
      const k1 = KRN.parse("//kopexa.com/frameworks/iso27001");
      const k2 = KRN.parse("//kopexa.com/frameworks/iso27002");
      expect(k1.equals(k2)).toBe(false);
    });

    it("returns false for null", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.equals(null)).toBe(false);
    });
  });

  describe("equalsString", () => {
    it("returns true for equal string", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.equalsString("//kopexa.com/frameworks/iso27001")).toBe(true);
    });

    it("returns false for invalid string", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(k.equalsString("invalid")).toBe(false);
    });
  });

  describe("segments", () => {
    it("returns copy of segments", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      const segments = k.segments();
      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({
        collection: "frameworks",
        resourceId: "iso27001",
      });
      expect(segments[1]).toEqual({
        collection: "controls",
        resourceId: "a-5-1",
      });
    });
  });

  describe("child", () => {
    it("creates child KRN", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      const child = k.child("controls", "a-5-1");
      expect(child.toString()).toBe(
        "//kopexa.com/frameworks/iso27001/controls/a-5-1",
      );
    });

    it("child does not inherit version", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001@v1");
      const child = k.child("controls", "a-5-1");
      expect(child.hasVersion()).toBe(false);
    });

    it("child preserves service", () => {
      const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001");
      const child = k.child("controls", "a-5-1");
      expect(child.service).toBe("catalog");
    });

    it("throws on empty collection", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(() => k.child("", "a-5-1")).toThrow(KRNError);
    });

    it("throws on invalid resource ID", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001");
      expect(() => k.child("controls", "-invalid")).toThrow(KRNError);
    });
  });

  describe("path", () => {
    it("returns path without domain", () => {
      const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");
      expect(k.path()).toBe("frameworks/iso27001/controls/a-5-1");
    });
  });
});

describe("KRNBuilder", () => {
  it("builds simple KRN", () => {
    const k = krn().resource("frameworks", "iso27001").build();
    expect(k.toString()).toBe("//kopexa.com/frameworks/iso27001");
  });

  it("builds nested KRN", () => {
    const k = krn()
      .resource("frameworks", "iso27001")
      .resource("controls", "a-5-1")
      .build();
    expect(k.toString()).toBe(
      "//kopexa.com/frameworks/iso27001/controls/a-5-1",
    );
  });

  it("builds KRN with version", () => {
    const k = krn().resource("frameworks", "iso27001").version("v1").build();
    expect(k.toString()).toBe("//kopexa.com/frameworks/iso27001@v1");
  });

  it("builds KRN with service", () => {
    const k = krn()
      .service("catalog")
      .resource("frameworks", "iso27001")
      .build();
    expect(k.toString()).toBe("//catalog.kopexa.com/frameworks/iso27001");
    expect(k.service).toBe("catalog");
  });

  it("builds KRN with service and version", () => {
    const k = krn()
      .service("isms")
      .resource("tenants", "acme-corp")
      .version("v1")
      .build();
    expect(k.toString()).toBe("//isms.kopexa.com/tenants/acme-corp@v1");
  });

  it("throws on empty collection", () => {
    expect(() => krn().resource("", "iso27001").build()).toThrow(KRNError);
  });

  it("throws on invalid resource ID", () => {
    expect(() => krn().resource("frameworks", "-invalid").build()).toThrow(
      KRNError,
    );
  });

  it("throws on invalid version", () => {
    expect(() =>
      krn().resource("frameworks", "iso27001").version("invalid").build(),
    ).toThrow(KRNError);
  });

  it("throws on invalid service", () => {
    expect(() =>
      krn().service("Invalid").resource("frameworks", "iso27001").build(),
    ).toThrow(KRNError);
  });

  it("throws on no resources", () => {
    expect(() => krn().build()).toThrow(KRNError);
  });

  it("tryBuild returns null on error", () => {
    expect(krn().tryBuild()).toBeNull();
    expect(krn().resource("", "id").tryBuild()).toBeNull();
  });

  it("error propagation stops further operations", () => {
    const builder = krn()
      .resource("", "iso27001") // Error here
      .resource("controls", "a-5-1") // Should be skipped
      .version("v1"); // Should be skipped
    expect(() => builder.build()).toThrow(KRNError);
  });
});

describe("validation functions", () => {
  describe("isValidResourceId", () => {
    it("accepts valid IDs", () => {
      expect(isValidResourceId("valid")).toBe(true);
      expect(isValidResourceId("Valid123")).toBe(true);
      expect(isValidResourceId("with-dash")).toBe(true);
      expect(isValidResourceId("with_underscore")).toBe(true);
      expect(isValidResourceId("with.dot")).toBe(true);
      expect(isValidResourceId("a")).toBe(true);
      expect(isValidResourceId("5.1.1")).toBe(true);
      expect(isValidResourceId("PR.AC-1")).toBe(true);
    });

    it("rejects invalid IDs", () => {
      expect(isValidResourceId("")).toBe(false);
      expect(isValidResourceId("-starts-with-dash")).toBe(false);
      expect(isValidResourceId("ends-with-dash-")).toBe(false);
      expect(isValidResourceId(".starts-with-dot")).toBe(false);
      expect(isValidResourceId("ends-with-dot.")).toBe(false);
      expect(isValidResourceId("has space")).toBe(false);
      expect(isValidResourceId("has@symbol")).toBe(false);
      expect(isValidResourceId("a".repeat(201))).toBe(false);
    });
  });

  describe("isValidVersion", () => {
    it("accepts valid versions", () => {
      expect(isValidVersion("v1")).toBe(true);
      expect(isValidVersion("v12")).toBe(true);
      expect(isValidVersion("v1.2")).toBe(true);
      expect(isValidVersion("v1.2.3")).toBe(true);
      expect(isValidVersion("v10.20.30")).toBe(true);
      expect(isValidVersion("latest")).toBe(true);
      expect(isValidVersion("draft")).toBe(true);
    });

    it("rejects invalid versions", () => {
      expect(isValidVersion("")).toBe(false);
      expect(isValidVersion("1")).toBe(false);
      expect(isValidVersion("1.0")).toBe(false);
      expect(isValidVersion("v")).toBe(false);
      expect(isValidVersion("v1.2.3.4")).toBe(false);
      expect(isValidVersion("version1")).toBe(false);
    });
  });

  describe("isValidService", () => {
    it("accepts valid service names", () => {
      expect(isValidService("catalog")).toBe(true);
      expect(isValidService("isms")).toBe(true);
      expect(isValidService("a")).toBe(true);
      expect(isValidService("service-name")).toBe(true);
      expect(isValidService("my-service-123")).toBe(true);
    });

    it("rejects invalid service names", () => {
      expect(isValidService("")).toBe(false);
      expect(isValidService("Catalog")).toBe(false);
      expect(isValidService("ISMS")).toBe(false);
      expect(isValidService("1service")).toBe(false);
      expect(isValidService("-service")).toBe(false);
      expect(isValidService("service_name")).toBe(false);
      expect(isValidService("service.name")).toBe(false);
    });
  });

  describe("safeResourceId", () => {
    it("converts invalid characters", () => {
      expect(safeResourceId("with space")).toBe("with-space");
      expect(safeResourceId("with@symbol")).toBe("with-symbol");
      expect(safeResourceId("with/slash")).toBe("with-slash");
    });

    it("trims leading/trailing dashes and dots", () => {
      expect(safeResourceId("-leading-dash")).toBe("leading-dash");
      expect(safeResourceId("trailing-dash-")).toBe("trailing-dash");
      expect(safeResourceId(".leading-dot")).toBe("leading-dot");
    });

    it("handles empty string", () => {
      expect(safeResourceId("")).toBe("");
    });

    it("truncates long strings", () => {
      expect(safeResourceId("a".repeat(250))).toBe("a".repeat(200));
    });
  });
});

describe("getResource", () => {
  it("extracts resource ID", () => {
    expect(getResource("//kopexa.com/frameworks/iso27001", "frameworks")).toBe(
      "iso27001",
    );
  });

  it("throws on invalid KRN", () => {
    expect(() => getResource("invalid", "frameworks")).toThrow(KRNError);
  });

  it("throws on missing collection", () => {
    expect(() =>
      getResource("//kopexa.com/frameworks/iso27001", "controls"),
    ).toThrow(KRNError);
  });
});

describe("DOMAIN constant", () => {
  it("is kopexa.com", () => {
    expect(DOMAIN).toBe("kopexa.com");
  });
});

describe("KRNErrorCode", () => {
  it("has expected codes", () => {
    expect(KRNErrorCode.EMPTY_KRN).toBe("EMPTY_KRN");
    expect(KRNErrorCode.INVALID_KRN).toBe("INVALID_KRN");
    expect(KRNErrorCode.INVALID_DOMAIN).toBe("INVALID_DOMAIN");
    expect(KRNErrorCode.INVALID_RESOURCE_ID).toBe("INVALID_RESOURCE_ID");
    expect(KRNErrorCode.INVALID_VERSION).toBe("INVALID_VERSION");
    expect(KRNErrorCode.RESOURCE_NOT_FOUND).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("KRNError", () => {
  it("has correct properties", () => {
    const error = new KRNError(KRNErrorCode.INVALID_KRN, "test message");
    expect(error.code).toBe(KRNErrorCode.INVALID_KRN);
    expect(error.message).toBe("test message");
    expect(error.name).toBe("KRNError");
  });
});
