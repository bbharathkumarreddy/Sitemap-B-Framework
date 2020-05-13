# Sitemap B Framework
Advanced Sitemap Management, Building, Deployment Framework [Open Source]

## Installation
```sh
npm i sitemap-b-framework --save
```
https://www.npmjs.com/package/sitemap-b-framework

## Features
- Simple and Advanced Sitemap with Index supported
- Auto Deploy Generated Sitemap to S3 or Google Cloud Storage Buckets
- Persistent Local JSON File as Database
- Auto Build and Deploy to Buckets or Local Storage with Manual Trigger and CRON
- Backup Sitemap JSON DB and Sitemap XML to Buckets with Manual Trigger and CRON
- Webpages, Image, Video, News Sitemap Supported
- Sitemap Links with Limit and Locking Constraints In Options

## Usage
### Simple Usage
```js
var sitemapBFramework = require("sitemap-b-framework");
var SitemapBFramework = new sitemapBFramework();

// sitemapItemAdd (loc , sitemapName @optional, lastmod @optional, changefreq @optional, priority @optional);
const data = await SitemapBFramework.sitemapItemAdd('https://example.com');
const data = await SitemapBFramework.sitemapBuildAndDeploy();

// Sitemap XML will be generated at ./sitemap-xml/build folder;
```
### Advanced Usage
```

[Documentation Development In Progress, GA by june,2020 ]

```

## Maintainers
- [@bbharathkumarreddy](https://github.com/bbharathkumarreddy/)

## License

See [LICENSE](https://github.com/bbharathkumarreddy/Sitemap-B-Framework/blob/master/LICENSE) file.

Development In Progress [GA by june,2020 ]
