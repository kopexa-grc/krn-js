/**
 * Shared Fixtures Compatibility Tests
 *
 * These tests read from the shared fixtures at ../fixtures/testcases.json
 * to ensure cross-language compatibility between Go and TypeScript implementations.
 *
 * The fixtures repo (github.com/kopexa-grc/krn-fixtures) is the source of truth
 * for cross-platform test cases.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isValidResourceId,
  isValidService,
  isValidVersion,
  KRN,
  KRNError,
  KRNErrorCode,
  type KRNErrorCodeType,
  safeResourceId,
} from "./index.js";

// Load shared fixtures
const fixturesPath = join(__dirname, "..", "fixtures", "testcases.json");
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8"));

interface Segment {
  collection: string;
  resourceId: string;
}

interface ParseExpected {
  service?: string;
  version?: string;
  segments?: Segment[];
  depth?: number;
  basename?: string;
  basenameCollection?: string;
  fullDomain?: string;
  path?: string;
}

interface ValidParseCase {
  name: string;
  input: string;
  expected: ParseExpected;
}

interface InvalidParseCase {
  name: string;
  input: string;
  expectedError: KRNErrorCodeType;
}

interface SafeResourceIdCase {
  input: string;
  expected: string;
}

interface ParentCase {
  input: string;
  expected: string | null;
  comment?: string;
}

interface WithVersionCase {
  input: string;
  version: string;
  expected: string;
  comment?: string;
}

interface WithoutVersionCase {
  input: string;
  expected: string;
  comment?: string;
}

interface WithServiceCase {
  input: string;
  service: string;
  expected: string;
  comment?: string;
}

interface WithoutServiceCase {
  input: string;
  expected: string;
}

interface ChildCase {
  input: string;
  collection: string;
  resourceId: string;
  expected: string;
  comment?: string;
}

interface ResourceIdCase {
  input: string;
  collection: string;
  expected?: string;
  expectedError?: KRNErrorCodeType;
}

describe("Shared Fixtures Compatibility", () => {
  describe("Parse - valid cases", () => {
    const validCases: ValidParseCase[] = fixtures.parse.valid;

    for (const tc of validCases) {
      it(tc.name, () => {
        const k = KRN.parse(tc.input);

        if (tc.expected.service !== undefined) {
          expect(k.service).toBe(tc.expected.service);
        }
        if (tc.expected.version !== undefined) {
          expect(k.version).toBe(tc.expected.version);
        }
        if (tc.expected.depth !== undefined) {
          expect(k.depth()).toBe(tc.expected.depth);
        }
        if (tc.expected.basename !== undefined) {
          expect(k.basename()).toBe(tc.expected.basename);
        }
        if (tc.expected.basenameCollection !== undefined) {
          expect(k.basenameCollection()).toBe(tc.expected.basenameCollection);
        }
        if (tc.expected.fullDomain !== undefined) {
          expect(k.fullDomain()).toBe(tc.expected.fullDomain);
        }
        if (tc.expected.path !== undefined) {
          expect(k.path()).toBe(tc.expected.path);
        }
        if (tc.expected.segments !== undefined) {
          const segments = k.segments();
          expect(segments).toHaveLength(tc.expected.segments.length);
          for (let i = 0; i < tc.expected.segments.length; i++) {
            expect(segments[i].collection).toBe(
              tc.expected.segments[i].collection,
            );
            expect(segments[i].resourceId).toBe(
              tc.expected.segments[i].resourceId,
            );
          }
        }
      });
    }
  });

  describe("Parse - invalid cases", () => {
    const invalidCases: InvalidParseCase[] = fixtures.parse.invalid;

    for (const tc of invalidCases) {
      it(`throws ${tc.expectedError} for ${tc.name}`, () => {
        expect(() => KRN.parse(tc.input)).toThrow(KRNError);
        try {
          KRN.parse(tc.input);
        } catch (err) {
          expect((err as KRNError).code).toBe(tc.expectedError);
        }
      });
    }
  });

  describe("Round-trip", () => {
    const roundTripCases: string[] = fixtures.roundTrip;

    for (const input of roundTripCases) {
      it(`round-trips: ${input}`, () => {
        const k = KRN.parse(input);
        expect(k.toString()).toBe(input);
      });
    }
  });

  describe("Validation - resourceId", () => {
    const validIds: string[] = fixtures.validation.resourceId.valid;
    const invalidIds: string[] = fixtures.validation.resourceId.invalid;
    const maxLength: number = fixtures.validation.resourceId.maxLength;

    for (const id of validIds) {
      it(`accepts valid: "${id}"`, () => {
        expect(isValidResourceId(id)).toBe(true);
      });
    }

    for (const id of invalidIds) {
      it(`rejects invalid: "${id}"`, () => {
        expect(isValidResourceId(id)).toBe(false);
      });
    }

    it(`accepts maxLength (${maxLength} chars)`, () => {
      expect(isValidResourceId("a".repeat(maxLength))).toBe(true);
    });

    it(`rejects over maxLength (${maxLength + 1} chars)`, () => {
      expect(isValidResourceId("a".repeat(maxLength + 1))).toBe(false);
    });
  });

  describe("Validation - version", () => {
    const validVersions: string[] = fixtures.validation.version.valid;
    const invalidVersions: string[] = fixtures.validation.version.invalid;

    for (const v of validVersions) {
      it(`accepts valid: "${v}"`, () => {
        expect(isValidVersion(v)).toBe(true);
      });
    }

    for (const v of invalidVersions) {
      it(`rejects invalid: "${v}"`, () => {
        expect(isValidVersion(v)).toBe(false);
      });
    }
  });

  describe("Validation - service", () => {
    const validServices: string[] = fixtures.validation.service.valid;
    const invalidServices: string[] = fixtures.validation.service.invalid;

    for (const s of validServices) {
      it(`accepts valid: "${s}"`, () => {
        expect(isValidService(s)).toBe(true);
      });
    }

    for (const s of invalidServices) {
      it(`rejects invalid: "${s}"`, () => {
        expect(isValidService(s)).toBe(false);
      });
    }
  });

  describe("safeResourceId", () => {
    const cases: SafeResourceIdCase[] = fixtures.safeResourceId;

    for (const tc of cases) {
      it(`converts "${tc.input}" to "${tc.expected}"`, () => {
        expect(safeResourceId(tc.input)).toBe(tc.expected);
      });
    }

    it("truncates to 200 characters", () => {
      const input = "a".repeat(250);
      expect(safeResourceId(input)).toBe("a".repeat(200));
    });
  });

  describe("Operations - parent", () => {
    const cases: ParentCase[] = fixtures.operations.parent;

    for (const tc of cases) {
      it(`parent of "${tc.input}" is "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const parent = k.parent();
        if (tc.expected === null) {
          expect(parent).toBeNull();
        } else {
          expect(parent).not.toBeNull();
          expect(parent?.toString()).toBe(tc.expected);
        }
      });
    }
  });

  describe("Operations - withVersion", () => {
    const cases: WithVersionCase[] = fixtures.operations.withVersion;

    for (const tc of cases) {
      it(`"${tc.input}".withVersion("${tc.version}") = "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const versioned = k.withVersion(tc.version);
        expect(versioned.toString()).toBe(tc.expected);
      });
    }
  });

  describe("Operations - withoutVersion", () => {
    const cases: WithoutVersionCase[] = fixtures.operations.withoutVersion;

    for (const tc of cases) {
      it(`"${tc.input}".withoutVersion() = "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const unversioned = k.withoutVersion();
        expect(unversioned.toString()).toBe(tc.expected);
      });
    }
  });

  describe("Operations - withService", () => {
    const cases: WithServiceCase[] = fixtures.operations.withService;

    for (const tc of cases) {
      it(`"${tc.input}".withService("${tc.service}") = "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const withService = k.withService(tc.service);
        expect(withService.toString()).toBe(tc.expected);
      });
    }
  });

  describe("Operations - withoutService", () => {
    const cases: WithoutServiceCase[] = fixtures.operations.withoutService;

    for (const tc of cases) {
      it(`"${tc.input}".withoutService() = "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const withoutService = k.withoutService();
        expect(withoutService.toString()).toBe(tc.expected);
      });
    }
  });

  describe("Operations - child", () => {
    const cases: ChildCase[] = fixtures.operations.child;

    for (const tc of cases) {
      it(`"${tc.input}".child("${tc.collection}", "${tc.resourceId}") = "${tc.expected}"`, () => {
        const k = KRN.parse(tc.input);
        const child = k.child(tc.collection, tc.resourceId);
        expect(child.toString()).toBe(tc.expected);
      });
    }
  });

  describe("Operations - resourceId", () => {
    const cases: ResourceIdCase[] = fixtures.operations.resourceId;

    for (const tc of cases) {
      if (tc.expectedError) {
        it(`"${tc.input}".resourceId("${tc.collection}") throws ${tc.expectedError}`, () => {
          const k = KRN.parse(tc.input);
          expect(() => k.resourceId(tc.collection)).toThrow(KRNError);
          try {
            k.resourceId(tc.collection);
          } catch (err) {
            expect((err as KRNError).code).toBe(tc.expectedError);
          }
        });
      } else {
        it(`"${tc.input}".resourceId("${tc.collection}") = "${tc.expected}"`, () => {
          const k = KRN.parse(tc.input);
          expect(k.resourceId(tc.collection)).toBe(tc.expected);
        });
      }
    }
  });

  describe("Error codes", () => {
    const expectedCodes: string[] = fixtures.errorCodes;

    it(`has exactly ${expectedCodes.length} error codes`, () => {
      const codes = Object.keys(KRNErrorCode);
      expect(codes).toHaveLength(expectedCodes.length);
    });

    for (const code of expectedCodes) {
      it(`has error code: ${code}`, () => {
        expect(KRNErrorCode).toHaveProperty(code);
      });
    }
  });
});
