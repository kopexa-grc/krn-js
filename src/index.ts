/**
 * Kopexa Resource Names (KRN) - TypeScript implementation
 *
 * KRN Format:
 *   //kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
 *   //{service}.kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
 *
 * Examples:
 *   //kopexa.com/frameworks/iso27001
 *   //kopexa.com/frameworks/iso27001/controls/5.1.1
 *   //catalog.kopexa.com/frameworks/iso27001
 *   //isms.kopexa.com/tenants/acme-corp/workspaces/main
 *   //kopexa.com/frameworks/iso27001/controls/5.1.1@v2
 */

/** Base domain for all KRNs */
export const DOMAIN = "kopexa.com";

/** Error codes for KRN operations */
export const KRNErrorCode = {
  EMPTY_KRN: "EMPTY_KRN",
  INVALID_KRN: "INVALID_KRN",
  INVALID_DOMAIN: "INVALID_DOMAIN",
  INVALID_RESOURCE_ID: "INVALID_RESOURCE_ID",
  INVALID_VERSION: "INVALID_VERSION",
  INVALID_SERVICE: "INVALID_SERVICE",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
} as const;

export type KRNErrorCode = (typeof KRNErrorCode)[keyof typeof KRNErrorCode];

/** Custom error class for KRN operations */
export class KRNError extends Error {
  constructor(
    public readonly code: KRNErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "KRNError";
  }
}

/** A collection/resource-id pair in a KRN path */
export interface Segment {
  collection: string;
  resourceId: string;
}

/** Validation patterns */
const RESOURCE_ID_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,198}[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;
const VERSION_PATTERN = /^(v\d+(\.\d+){0,2}|latest|draft)$/;
const SERVICE_PATTERN = /^[a-z][a-z0-9-]{0,61}[a-z0-9]$|^[a-z]$/;

/**
 * Check if a string is a valid resource ID.
 * Resource IDs must be 1-200 chars, alphanumeric plus - _ .
 * Cannot start or end with - or .
 */
export function isValidResourceId(id: string): boolean {
  if (!id || id.length > 200) {
    return false;
  }
  return RESOURCE_ID_PATTERN.test(id);
}

/**
 * Check if a string is a valid version.
 * Valid formats: v1, v1.2, v1.2.3, latest, draft
 */
export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

/**
 * Check if a string is a valid service name.
 * Service names must be lowercase, start with a letter,
 * and contain only alphanumeric characters and hyphens.
 */
export function isValidService(service: string): boolean {
  if (!service) {
    return false;
  }
  return SERVICE_PATTERN.test(service);
}

/**
 * Convert a string to a valid resource ID by replacing invalid characters.
 */
export function safeResourceId(s: string): string {
  if (!s) {
    return "";
  }

  // Replace invalid characters with -
  let result = "";
  for (const char of s) {
    if (/[a-zA-Z0-9._-]/.test(char)) {
      result += char;
    } else {
      result += "-";
    }
  }

  // Trim leading/trailing - and .
  result = result.replace(/^[-.]+|[-.]+$/g, "");

  // Truncate to 200 characters
  if (result.length > 200) {
    result = result.slice(0, 200);
    // Make sure we don't end with - or .
    result = result.replace(/[-.]+$/, "");
  }

  return result;
}

/**
 * KRN represents a Kopexa Resource Name.
 */
export class KRN {
  private readonly _service: string;
  private readonly _segments: Segment[];
  private readonly _version: string;

  private constructor(service: string, segments: Segment[], version: string) {
    this._service = service;
    this._segments = segments;
    this._version = version;
  }

  /**
   * Parse a KRN string and return a KRN instance.
   * @throws {KRNError} if the string is not a valid KRN
   */
  static parse(input: string): KRN {
    if (!input) {
      throw new KRNError(KRNErrorCode.EMPTY_KRN, "empty KRN string");
    }

    // Must start with //
    if (!input.startsWith("//")) {
      throw new KRNError(KRNErrorCode.INVALID_KRN, "must start with //");
    }

    // Remove // prefix
    let str = input.slice(2);

    // Extract version if present
    let version = "";
    const atIndex = str.lastIndexOf("@");
    if (atIndex !== -1) {
      version = str.slice(atIndex + 1);
      str = str.slice(0, atIndex);
      if (!isValidVersion(version)) {
        throw new KRNError(
          KRNErrorCode.INVALID_VERSION,
          `invalid version format: ${version}`,
        );
      }
    }

    // Split by /
    const parts = str.split("/");
    if (parts.length < 3) {
      throw new KRNError(
        KRNErrorCode.INVALID_KRN,
        "must have at least domain/collection/id",
      );
    }

    // Parse domain - can be "kopexa.com" or "{service}.kopexa.com"
    let service = "";
    const domain = parts[0] ?? "";

    if (domain === DOMAIN) {
      service = "";
    } else if (domain.endsWith(`.${DOMAIN}`)) {
      service = domain.slice(0, -(DOMAIN.length + 1));
      if (!isValidService(service)) {
        throw new KRNError(
          KRNErrorCode.INVALID_DOMAIN,
          `invalid service name: ${service}`,
        );
      }
    } else {
      throw new KRNError(
        KRNErrorCode.INVALID_DOMAIN,
        `expected ${DOMAIN} or {service}.${DOMAIN}, got ${domain}`,
      );
    }

    // Parse resource path (must be pairs of collection/id)
    const resourcePath = parts.slice(1);
    if (resourcePath.length % 2 !== 0) {
      throw new KRNError(
        KRNErrorCode.INVALID_KRN,
        "resource path must be pairs of collection/id",
      );
    }

    const segments: Segment[] = [];
    for (let i = 0; i < resourcePath.length; i += 2) {
      const collection = resourcePath[i] ?? "";
      const resourceId = resourcePath[i + 1] ?? "";

      if (!collection) {
        throw new KRNError(KRNErrorCode.INVALID_KRN, "empty collection name");
      }
      if (!isValidResourceId(resourceId)) {
        throw new KRNError(
          KRNErrorCode.INVALID_RESOURCE_ID,
          `invalid resource ID: ${resourceId}`,
        );
      }

      segments.push({ collection, resourceId });
    }

    return new KRN(service, segments, version);
  }

  /**
   * Parse a KRN string, returning null if invalid instead of throwing.
   */
  static tryParse(s: string): KRN | null {
    try {
      return KRN.parse(s);
    } catch {
      return null;
    }
  }

  /**
   * Check if a string is a valid KRN.
   */
  static isValid(s: string): boolean {
    return KRN.tryParse(s) !== null;
  }

  /**
   * Get the string representation of the KRN.
   */
  toString(): string {
    let result = "//";

    if (this._service) {
      result += `${this._service}.`;
    }
    result += DOMAIN;

    for (const seg of this._segments) {
      result += `/${seg.collection}/${seg.resourceId}`;
    }

    if (this._version) {
      result += `@${this._version}`;
    }

    return result;
  }

  /** Get the service name, or empty string if no service. */
  get service(): string {
    return this._service;
  }

  /** Check if the KRN has a service. */
  hasService(): boolean {
    return this._service !== "";
  }

  /** Get the full domain including service if present. */
  fullDomain(): string {
    if (this._service) {
      return `${this._service}.${DOMAIN}`;
    }
    return DOMAIN;
  }

  /** Get the resource path without domain. */
  path(): string {
    return this._segments
      .map((seg) => `${seg.collection}/${seg.resourceId}`)
      .join("/");
  }

  /** Alias for path() - Mondoo-compatible naming. */
  relativeResourceName(): string {
    return this.path();
  }

  /** Get the version string, or empty string if no version. */
  get version(): string {
    return this._version;
  }

  /** Check if the KRN has a version. */
  hasVersion(): boolean {
    return this._version !== "";
  }

  /**
   * Get the resource ID for a given collection.
   * @throws {KRNError} if the collection is not found
   */
  resourceId(collection: string): string {
    for (const seg of this._segments) {
      if (seg.collection === collection) {
        return seg.resourceId;
      }
    }
    throw new KRNError(
      KRNErrorCode.RESOURCE_NOT_FOUND,
      `resource not found: ${collection}`,
    );
  }

  /**
   * Get the resource ID for a given collection, returning null if not found.
   */
  tryResourceId(collection: string): string | null {
    try {
      return this.resourceId(collection);
    } catch {
      return null;
    }
  }

  /** Check if the KRN has a resource with the given collection. */
  hasResource(collection: string): boolean {
    return this._segments.some((seg) => seg.collection === collection);
  }

  /** Get the last resource ID in the path. */
  basename(): string {
    const lastSegment = this._segments[this._segments.length - 1];
    return lastSegment?.resourceId ?? "";
  }

  /** Get the last collection name in the path. */
  basenameCollection(): string {
    const lastSegment = this._segments[this._segments.length - 1];
    return lastSegment?.collection ?? "";
  }

  /** Get a copy of all segments in the KRN. */
  segments(): Segment[] {
    return [...this._segments];
  }

  /** Get the number of resource levels in the KRN. */
  depth(): number {
    return this._segments.length;
  }

  /**
   * Get the parent KRN (without the last segment), or null if this is a root resource.
   */
  parent(): KRN | null {
    if (this._segments.length <= 1) {
      return null;
    }
    return new KRN(
      this._service,
      this._segments.slice(0, -1),
      "", // Parent doesn't inherit version
    );
  }

  /**
   * Create a new KRN with the specified version.
   * @throws {KRNError} if the version is invalid
   */
  withVersion(version: string): KRN {
    if (!isValidVersion(version)) {
      throw new KRNError(
        KRNErrorCode.INVALID_VERSION,
        `invalid version format: ${version}`,
      );
    }
    return new KRN(this._service, [...this._segments], version);
  }

  /** Create a new KRN without the version. */
  withoutVersion(): KRN {
    return new KRN(this._service, [...this._segments], "");
  }

  /**
   * Create a new KRN with the specified service.
   * @throws {KRNError} if the service name is invalid
   */
  withService(service: string): KRN {
    if (!isValidService(service)) {
      throw new KRNError(
        KRNErrorCode.INVALID_SERVICE,
        `invalid service name: ${service}`,
      );
    }
    return new KRN(service, [...this._segments], this._version);
  }

  /** Create a new KRN without the service. */
  withoutService(): KRN {
    return new KRN("", [...this._segments], this._version);
  }

  /** Check if this KRN equals another KRN. */
  equals(other: KRN | null): boolean {
    if (!other) {
      return false;
    }
    return this.toString() === other.toString();
  }

  /** Check if this KRN equals another KRN string. */
  equalsString(other: string): boolean {
    const otherKrn = KRN.tryParse(other);
    return otherKrn !== null && this.equals(otherKrn);
  }

  /**
   * Create a child KRN from this KRN.
   * @throws {KRNError} if the collection or resourceId is invalid
   */
  child(collection: string, resourceId: string): KRN {
    if (!collection) {
      throw new KRNError(
        KRNErrorCode.INVALID_KRN,
        "collection cannot be empty",
      );
    }
    if (!isValidResourceId(resourceId)) {
      throw new KRNError(
        KRNErrorCode.INVALID_RESOURCE_ID,
        `invalid resource ID: ${resourceId}`,
      );
    }
    return new KRN(
      this._service,
      [...this._segments, { collection, resourceId }],
      "", // Child doesn't inherit version
    );
  }
}

/**
 * Builder provides a fluent API for building KRNs.
 */
export class KRNBuilder {
  private _service = "";
  private _segments: Segment[] = [];
  private _version = "";
  private _error: KRNError | null = null;

  /**
   * Set the service for the KRN (optional).
   */
  service(service: string): this {
    if (this._error) return this;

    if (!isValidService(service)) {
      this._error = new KRNError(
        KRNErrorCode.INVALID_SERVICE,
        `invalid service name: ${service}`,
      );
      return this;
    }

    this._service = service;
    return this;
  }

  /**
   * Add a resource segment to the builder.
   */
  resource(collection: string, resourceId: string): this {
    if (this._error) return this;

    if (!collection) {
      this._error = new KRNError(
        KRNErrorCode.INVALID_KRN,
        "collection cannot be empty",
      );
      return this;
    }

    if (!isValidResourceId(resourceId)) {
      this._error = new KRNError(
        KRNErrorCode.INVALID_RESOURCE_ID,
        `invalid resource ID: ${resourceId}`,
      );
      return this;
    }

    this._segments.push({ collection, resourceId });
    return this;
  }

  /**
   * Set the version for the KRN.
   */
  version(version: string): this {
    if (this._error) return this;

    if (!isValidVersion(version)) {
      this._error = new KRNError(
        KRNErrorCode.INVALID_VERSION,
        `invalid version format: ${version}`,
      );
      return this;
    }

    this._version = version;
    return this;
  }

  /**
   * Build the KRN.
   * @throws {KRNError} if any error occurred during building
   */
  build(): KRN {
    if (this._error) {
      throw this._error;
    }

    if (this._segments.length === 0) {
      throw new KRNError(
        KRNErrorCode.INVALID_KRN,
        "must have at least one resource",
      );
    }

    // Use parse to create the KRN to ensure consistency
    let krn = `//${this._service ? `${this._service}.` : ""}${DOMAIN}`;
    for (const seg of this._segments) {
      krn += `/${seg.collection}/${seg.resourceId}`;
    }
    if (this._version) {
      krn += `@${this._version}`;
    }

    return KRN.parse(krn);
  }

  /**
   * Build the KRN, returning null if invalid instead of throwing.
   */
  tryBuild(): KRN | null {
    try {
      return this.build();
    } catch {
      return null;
    }
  }
}

/**
 * Create a new KRN builder.
 */
export function krn(): KRNBuilder {
  return new KRNBuilder();
}

/**
 * Quick resource extraction from a KRN string.
 * @throws {KRNError} if the KRN is invalid or the collection is not found
 */
export function getResource(krnString: string, collection: string): string {
  const k = KRN.parse(krnString);
  return k.resourceId(collection);
}
