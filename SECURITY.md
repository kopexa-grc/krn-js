# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: security@kopexa.com
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We follow responsible disclosure practices
- Security fixes will be released as soon as possible
- Credit will be given to reporters (unless anonymity is requested)
- We will coordinate disclosure timing with you

## Security Best Practices

This package follows security best practices:

- **Supply Chain Security**: npm provenance enabled for package verification
- **Dependency Management**: Automated security updates via Dependabot
- **Code Scanning**: CodeQL analysis on all PRs
- **Minimal Dependencies**: Zero runtime dependencies
- **Type Safety**: Full TypeScript with strict mode

## Package Verification

Verify package integrity using npm provenance:

```bash
npm audit signatures
```
