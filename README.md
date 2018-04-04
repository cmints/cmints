# CMS
[![Build Status](https://travis-ci.org/Manvel/cmints.svg?branch=master)](https://travis-ci.org/Manvel/cmints)

CMS created with the internationalization in mind

## Dependencies
- [NodeJs](https://nodejs.org/en/download/)

## Installation
```bash
npm i
```

## Running the server

### For the production:
```bash
npm start
```

### For development
Use `--no-cache` flag to disable the caching.
```bash
npm start -- --no-cache
```

## Generating a static content
```bash
npm start
npm run static
```

## Test
```bash
# tests with page caching
npm test
# tests without page caching
npm test -- --no-cache
```

## Crowdin integration
```bash
# Upload source files and source locales to the crowdin
npm run crowdin-update-source -- --key {crowdin-key}
# Download translations from the crowdin
npm run crowdin-get-translations -- --key {crowdin-key}
# Upload locaes to the crowdin
npm run crowdin-update-translations -- --key {crowdin-key}
```
