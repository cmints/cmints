# CMS
[![Build Status](https://travis-ci.org/Manvel/cmints.svg?branch=master)](https://travis-ci.org/Manvel/cmints)

CMS created with the internationalization in mind

**Note:** CMintS is under extensive beta development. Contributions in form of
Bugreports, Documentation updates and Content Translations will help to boost
the development speed up. Thanks for stars and word spreading.❤️

## Dependencies
- [NodeJs](https://nodejs.org/en/download/)

## Installation
```bash
npm install -g cmints
```

## Example projects
Generate example project for quick start, by running:
```bash
# Download example project into current directory
cmints --example

# Replace optional {PATH} with the path to the download target directory
cmints {PATH} --example
```

## Running the server

### For the production:
```bash
# Run http server serving current folder 
cmints --start

# Replace optional {PATH} with the path to the folder you wish to serve.
cmints {PATH} --start

# Optional port parameter, if ommited the server will run on port 4000
cmints --start -p {PORT}

# https server: Replace {PATH} with the path to the folder you wish to serve
# Replace {PRIVATE_KEY} with the path to the private key file
# Replace {CERTIFICATE} with the path to the certiface file
cmints {PATH} --start --https -k {PRIVATE_KEY} -c {CERTIFICATE}
```

### For development
Use `--no-cache` flag to disable the caching.
```bash
cmints --start --no-cache
```

## Generating a static content
```bash
cmints --static
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
cmints --crowdin update-sources --key {crowdin-key}
# Download translations from the crowdin
cmints --crowdin update-translations --key {crowdin-key}
# Upload locaes to the crowdin
cmints --crowdin get-translations --key {crowdin-key}
```

# Thanks to the awesome contributors

- [@ZloeSabo](https://github.com/ZloeSabo)
  - [PR#114](https://github.com/Manvel/cmints/pull/114)
