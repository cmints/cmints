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
# http server
npm start

# Optional port parameter if ommited the server will run on port 4000
npm start -p {PORT}

# https server, replace {PRIVATE_KEY} with the path to the private key file
# and {CERTIFICATE} with the path to the certiface file
npm start -- --https -k {PRIVATE_KEY} -c {CERTIFICATE}
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
