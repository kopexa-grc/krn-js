<div align="center">

# @kopexa/krn - Kopexa Resource Names

**Part of the [Kopexa](https://kopexa.com) GRC Platform**

[![npm version](https://badge.fury.io/js/%40kopexa%2Fkrn.svg)](https://www.npmjs.com/package/@kopexa/krn)
[![CI](https://github.com/kopexa-grc/krn-js/actions/workflows/ci.yml/badge.svg)](https://github.com/kopexa-grc/krn-js/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

A TypeScript package for working with Kopexa Resource Names (KRN), following [Google's Resource Name Design](https://cloud.google.com/apis/design/resource_names).

## Installation

```bash
npm install @kopexa/krn
# or
pnpm add @kopexa/krn
# or
yarn add @kopexa/krn
```

## KRN Specification

### Format

```
//kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
//{service}.kopexa.com/{collection}/{resource-id}[/{collection}/{resource-id}][@{version}]
```

### Components

| Component | Description | Example |
|-----------|-------------|---------|
| Service | Optional service subdomain | `catalog`, `isms`, `policy` |
| Domain | Always `kopexa.com` | `kopexa.com` |
| Collection | Resource type (plural) | `frameworks`, `controls`, `tenants` |
| Resource ID | Unique identifier | `iso27001`, `5.1.1`, `acme-corp` |
| Version | Optional version tag | `@v1`, `@v1.2.3`, `@latest`, `@draft` |

### Examples

```
//kopexa.com/frameworks/iso27001
//kopexa.com/frameworks/iso27001/controls/5.1.1
//catalog.kopexa.com/frameworks/iso27001
//catalog.kopexa.com/frameworks/iso27001/controls/5.1.1@v2
//isms.kopexa.com/tenants/acme-corp/workspaces/main
```

## Usage

### Parsing KRNs

```typescript
import { KRN } from "@kopexa/krn";

// Parse a KRN string
const k = KRN.parse("//kopexa.com/frameworks/iso27001");

// Parse without throwing (returns null on error)
const k2 = KRN.tryParse("//kopexa.com/frameworks/iso27001");
if (k2) {
  console.log(k2.basename());
}

// Check if a string is a valid KRN
if (KRN.isValid(s)) {
  // ...
}
```

### Building KRNs

```typescript
import { krn } from "@kopexa/krn";

// Build a simple KRN
const k = krn()
  .resource("frameworks", "iso27001")
  .build();
// Result: //kopexa.com/frameworks/iso27001

// Build a nested KRN with version
const k2 = krn()
  .resource("frameworks", "iso27001")
  .resource("controls", "a-5-1")
  .version("v2")
  .build();
// Result: //kopexa.com/frameworks/iso27001/controls/a-5-1@v2

// Build a KRN with service
const k3 = krn()
  .service("catalog")
  .resource("frameworks", "iso27001")
  .build();
// Result: //catalog.kopexa.com/frameworks/iso27001

// Build without throwing (returns null on error)
const k4 = krn().resource("frameworks", "iso27001").tryBuild();
```

### Creating Child KRNs

```typescript
const parent = KRN.parse("//kopexa.com/frameworks/iso27001");

// Create a child KRN
const child = parent.child("controls", "a-5-1");
// Result: //kopexa.com/frameworks/iso27001/controls/a-5-1
```

### Extracting Information

```typescript
const k = KRN.parse("//catalog.kopexa.com/frameworks/iso27001/controls/5.1.1@v1");

k.service;              // "catalog"
k.hasService();         // true
k.fullDomain();         // "catalog.kopexa.com"
k.path();               // "frameworks/iso27001/controls/5.1.1"
k.version;              // "v1"
k.hasVersion();         // true
k.basename();           // "5.1.1"
k.basenameCollection(); // "controls"
k.depth();              // 2

// Get resource ID by collection
const frameworkId = k.resourceId("frameworks"); // "iso27001"
const controlId = k.tryResourceId("controls");  // "5.1.1" or null

// Check if a collection exists
k.hasResource("frameworks"); // true
k.hasResource("policies");   // false

// Get all segments
for (const seg of k.segments()) {
  console.log(`${seg.collection}: ${seg.resourceId}`);
}
```

### Working with Parents

```typescript
const k = KRN.parse("//kopexa.com/frameworks/iso27001/controls/a-5-1");

const parent = k.parent();
// Result: //kopexa.com/frameworks/iso27001

// Root resources return null
const root = KRN.parse("//kopexa.com/frameworks/iso27001");
root.parent(); // null
```

### Version Manipulation

```typescript
const k = KRN.parse("//kopexa.com/frameworks/iso27001");

// Add version
const versioned = k.withVersion("v1.2.3");
// Result: //kopexa.com/frameworks/iso27001@v1.2.3

// Remove version
const k2 = KRN.parse("//kopexa.com/frameworks/iso27001@v1");
const unversioned = k2.withoutVersion();
// Result: //kopexa.com/frameworks/iso27001
```

### Service Manipulation

```typescript
const k = KRN.parse("//kopexa.com/frameworks/iso27001");

// Add service
const withService = k.withService("catalog");
// Result: //catalog.kopexa.com/frameworks/iso27001

// Remove service
const k2 = KRN.parse("//catalog.kopexa.com/frameworks/iso27001");
const withoutService = k2.withoutService();
// Result: //kopexa.com/frameworks/iso27001
```

### Comparison

```typescript
const k1 = KRN.parse("//kopexa.com/frameworks/iso27001");
const k2 = KRN.parse("//kopexa.com/frameworks/iso27001");

k1.equals(k2);                                       // true
k1.equalsString("//kopexa.com/frameworks/iso27001"); // true
```

### Framework Versioning

Compliance frameworks often have different editions (e.g., ISO 27001:2013 vs ISO 27001:2022).
Include the edition year or version number in the framework resource ID:

```typescript
// ISO 27001:2022
const k1 = KRN.parse("//catalog.kopexa.com/frameworks/iso27001-2022/controls/5.1.1");

// NIST CSF 2.0
const k2 = KRN.parse("//catalog.kopexa.com/frameworks/nist-csf-2.0/controls/GV.OC-01");

// CIS AWS Benchmark v1.4.0
const k3 = KRN.parse("//catalog.kopexa.com/frameworks/cis-aws-1.4.0/controls/1.1.1");
```

**Naming conventions:**
- Use lowercase with hyphens: `iso27001-2022`, `nist-csf-2.0`
- Include the year or version: `iso27001-2022`, `cis-aws-1.4.0`
- Keep it readable: `pci-dss-4.0` not `pcidssv4.0`

**Note:** The `@version` suffix (e.g., `@v1`, `@draft`) is for versioning the KRN content itself
(like draft vs published mappings), not for framework editions.

### Utility Functions

```typescript
import {
  getResource,
  isValidResourceId,
  isValidVersion,
  isValidService,
  safeResourceId
} from "@kopexa/krn";

// Quick resource extraction from string
const id = getResource("//kopexa.com/frameworks/iso27001", "frameworks");
// Result: "iso27001"

// Validate resource IDs
isValidResourceId("valid-id");   // true
isValidResourceId("-invalid");   // false

// Validate versions
isValidVersion("v1.2.3");  // true
isValidVersion("latest");  // true
isValidVersion("invalid"); // false

// Validate service names
isValidService("catalog"); // true
isValidService("Catalog"); // false (must be lowercase)
isValidService("1svc");    // false (can't start with number)

// Convert strings to valid resource IDs
safeResourceId("Hello World!"); // "Hello-World"
```

## Service Name Rules

Service names must follow DNS label rules:

- Length: 1-63 characters
- Allowed characters: `a-z`, `0-9`, `-`
- Must start with a letter
- Cannot end with `-`

## Resource ID Rules

Resource IDs must follow these rules:

- Length: 1-200 characters
- Allowed characters: `a-z`, `A-Z`, `0-9`, `-`, `_`, `.`
- Cannot start or end with `-` or `.`

## Version Formats

Supported version formats:

- Semantic: `v1`, `v1.2`, `v1.2.3`
- Keywords: `latest`, `draft`

## Error Handling

The package exports a `KRNError` class with error codes:

```typescript
import { KRN, KRNError, KRNErrorCode } from "@kopexa/krn";

try {
  const k = KRN.parse(input);
} catch (err) {
  if (err instanceof KRNError) {
    switch (err.code) {
      case KRNErrorCode.EMPTY_KRN:
        // Handle empty input
        break;
      case KRNErrorCode.INVALID_KRN:
        // Handle invalid format
        break;
      case KRNErrorCode.INVALID_DOMAIN:
        // Handle wrong domain
        break;
      case KRNErrorCode.INVALID_RESOURCE_ID:
        // Handle invalid resource ID
        break;
      case KRNErrorCode.INVALID_VERSION:
        // Handle invalid version format
        break;
      case KRNErrorCode.RESOURCE_NOT_FOUND:
        // Handle missing resource
        break;
    }
  }
}
```

## Related Packages

- [github.com/kopexa-grc/krn](https://github.com/kopexa-grc/krn) - Go implementation (source of truth)
- [krn-fixtures](https://github.com/kopexa-grc/krn-fixtures) - Shared test fixtures

## About Kopexa

[Kopexa](https://kopexa.com) is a modern GRC (Governance, Risk, and Compliance) platform that helps organizations manage their compliance requirements efficiently.

- **Website**: [kopexa.com](https://kopexa.com)
- **Documentation**: [docs.kopexa.com](https://docs.kopexa.com)

## License

Copyright (c) [Kopexa GRC](https://kopexa.com)

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
