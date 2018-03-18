---
title: Documentation
navTitle: Document
showDocNav: true
---

# Documentations

## What is CMintS?

CMintS is a CMS and Static Content Generator that has been implemented with the
Internationalization in mind. CMintS is quite easy to install, it has only few
requirements.

## Requirements

- [Node.js](https://nodejs.org/en/download/)
- [Git](https://git-scm.com/)

If you have both requirements in place, please follow this installation steps.

## Installing Git

- Mac: [installing Xcode CLT](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git#_installing_on_mac)
- Windows: Get [git for windows](https://git-scm.com/download/win)
- Linux (Ubuntu, Debian): `sudo apt-get install git-core`

## Installing Node.js

Get Node.js from the [https://nodejs.org/](https://nodejs.org).

## Install CMintS

[Fork](https://help.github.com/articles/fork-a-repo/) or clone the [CMintS repository](https://github.com/Manvel/cmints):
```bash
git clone https://github.com/Manvel/cmints.git myNewWebsite
cd myNewWebsite
```

With cloned CMintS repository you will also get current website downloaded, you can modify existing files, delete or manage the way you want. [Learn more about folders structure](/documentation/getting-started/structure).

### Starting server

For the development purposes Use `--no-cache` flag to disable the caching.

```bash
npm start -- --no-cache
npm start # will cache pages, use it for production
```
### Generating static content

Run commands below in order to generate static content
```bash
npm start
npm run static
```
