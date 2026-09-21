# Project Instructions

## Environment Requirements

This project requires:
- **Node.js:** 26+ (managed via `.nvmrc`)
- **npm:** 11.14.1+ (installed by CI setup)

## Setup for Development

Before running any npm commands:

1. **Use correct Node version:**
   ```bash
   nvm use
   ```

## Why npm 11.14.1?

npm 11.5.1+ required for **npm OIDC trusted publishing** (see RHCLOUD-47582). The `engine-strict=true` setting in `.npmrc` enforces this requirement. CI installs npm 11.14.1 explicitly because Node.js 26 may bundle older npm.

## CI/CD

All CI jobs use `.github/actions/setup-environment` which:
- Installs Node 26 from `.nvmrc`
- Installs npm 11.14.1 for trusted publishing
- Runs `npm ci`

Release job additionally sets `registry-url` for npm publishing with OIDC.
