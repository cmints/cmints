# CMintS
[![Build Status](https://travis-ci.org/cmints/cmints.svg?branch=master)](https://travis-ci.org/cmints/cmints)

CMintS is a CMS and Static Site Generator for single and multi language
websites creation. See full documentation at https://cmints.io.

## Dependencies
- [NodeJs](https://nodejs.org/en/download/)

## Installation
If you would like to deploy your first app to the web without installing CMintS
globally, check [Quick Start guide](https://cmints.io/en/quick-start).

```bash
npm install -g cmints
```

## Example projects
Generate example project for quick start, by running:
```bash
# Generates single language project
cmints --example single

# Generates multi language project
cmints --example multi

# Generates multi language project in the {PATH} directory.
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
  - [PR#114](https://github.com/cmints/cmints/pull/114)
- [Newman](https://www.behance.net/driver202de98)
  - For helping designing the website
- [Kyoopy](https://crowdin.com/profile/Kyoopy)
  - For translating the [contributions guide](https://cmints.io/contribute/) into German
- [ManuelFranz](https://crowdin.com/profile/ManuelFranz)
  - For translating [Homepage](https://cmints.io/de),
    [Tutorial](https://cmints.io/de/quick-start),
    [Structure](https://cmints.io/de/documentation/getting-started/structure) and
    [404](https://cmints.io/de/documentation/pages/404) pages into German
