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

// sitemapItemAdd(loc , sitemapName @optional, lastmod @optional, changefreq @optional, priority @optional);
const data = await SitemapBFramework.sitemapItemAdd('https://example.com');
const data = await SitemapBFramework.sitemapBuildAndDeploy();

// Sitemap XML files will be generated at ./sitemap-xml/build folder;
```
### Advanced Usage
```js
var sitemapBFramework = require("sitemap-b-framework");
// Refer options in heading below for more documentation
const options = {
  path:'data/sitemap',
  maxLinksPerSitemap: 50000,
  build:{ 
    cron: '0 1 * * *',
    deployToBucket: {
      s3: {
        accessKeyId: "Access Key ID",
        secretAccessKey: "Secret Key",
        bucket: "Name of Bucket",
        path: "Path Inside Bucket",
        makePublic: true | false,
      },
    }
  }
}
var SitemapBFramework = new sitemapBFramework(options);

/*
 Add sitemap index file for multiple sitemaps
 sitemapIndexAdd(sitemap-name , type @optional, limit @optional, locked @optional);
 sitemap-name = sitemapName
 type = webpages,news,image,video
 limit = 0 to 50000
 locked = true or false
 */
 await SitemapBFramework.sitemapIndexAdd('sitemap-products.xml','webpages',50000,false);

/*
 Add sitemap links to each sitemap file
 sitemapItemAdd(loc , sitemapName @optional, lastmod @optional, changefreq @optional, priority @optional);
 loc = URL
 lastmod = Last Modified Date YYYY-MM-DD
 changefreq = always, hourly, daily, weekly, monthly, yearly, never
 priority = 0.1 to 1.0 
 */
 await SitemapBFramework.sitemapItemAdd('https://example.com/product/laptop','sitemap-products.xml','2020-05-10','monthly',0.5);


/*
 Build Sitemap Index and  Sitemap Files and Deploy To Buckets - AWS S3 or GCP GCS
 sitemapBuildAndDeploy();
 - Sitemap generated at default folder  ./sitemap-xml/build , Can be overridden in option parameters
 - Deploying To Buckets depends on options parameters
 - Auto Build can be trigger on cron parameters in options
 */
 await SitemapBFramework.sitemapBuildAndDeploy();

/*
 Notes:
 - Default path for framework data stored as json files at ./sitemap-config
 - Default path for lastest generated sitemap files are stored at ./sitemap-xml/build
 - Persistent storage requires for ./sitemap-config path for all operations
```
### Options Allowed
```json
const options = {
  path: 'data/sitemap', // Persistent folder location, optional
  maxLinksPerSitemap: 15000, // Max of 50000 links allowed per sitemap file, optional
  build: { // optional
    cron: "Cron Expression to auto build sitemap files and deploy to bucket if defined",  // optional
    deployToBucket: { // optional
      gcs: {
        projectId: "GCP Project ID"
        service_account_key_path: "Path to gcp service account json file"
        bucket: "Name of Bucket",
        path: "Path Inside Bucket",
        makePublic: true | false,
      },
      s3: {
        accessKeyId: "Access Key ID",
        secretAccessKey: "Secret Key",
        bucket: "Name of Bucket",
        path: "Path Inside Bucket",
        makePublic: true | false,
      },
    }
  },
  backup: {  // optional
    cron: "Cron Expression to auto backup framework data and sitemap xml files to bucket if defined",  // optional
    bakcupToBucket: { // optional
      gcs: {
        projectId: "GCP Project ID"
        service_account_key_path: "Path to gcp service account json file"
        bucket: "Name of Bucket",
        path: "Path Inside Bucket"
      },
      s3: {
        accessKeyId: "Access Key ID",
        secretAccessKey: "Secret Key",
        bucket: "Name of Bucket",
        path: "Path Inside Bucket"
      },
    }
  }
};
```
### Methods Available
```js

 //sitemapIndexAdd(sitemap-name , type @optional, limit @optional, locked @optional);
 sitemapIndexAdd('sitemap-products.xml','webpages',50000,false);

 
 //sitemapIndexAdd(existing-sitemap-name ,new-sitemap-name , type @optional, limit @optional, locked @optional);
 sitemapIndexUpdate('sitemap-products.xml','sitemap-products-trending.xml','webpages',50000,false);


 //sitemapIndexDelete(sitemap-name);
 sitemapIndexDelete('sitemap-products-trending.xml');


 //sitemapIndexList();
 sitemapIndexList();


 //sitemapItemAdd(loc , sitemapName @optional, lastmod @optional, changefreq @optional, priority @optional);
 sitemapItemAdd('https://example.com/product/laptop','sitemap-products.xml','2020-05-10','monthly',0.5);

 
 //sitemapItemAdd(oldloc, loc , sitemapName @optional, lastmod @optional, changefreq @optional, priority @optional);
 sitemapItemUpdate('https://example.com/product/laptop','https://example.com/product/laptop-trending','sitemap-products.xml','2020-05-10','daily',0.9);

 
 //sitemapItemDelete(loc , sitemapName @optional);
 sitemapItemDelete('https://example.com/product/laptop-trending','sitemap-products.xml');


 //sitemapItemList(sitemapName @optional)
 sitemapItemList('sitemap-products.xml');
 

 //sitemapGlobalSearch(loc)
 sitemapGlobalSearch('ttps://example.com/product/laptop-trending');

 //sitemapBuildAndDeploy()
 sitemapBuildAndDeploy();

 //BackupToBucket()
 BackupToBucket();

```

## Maintainers
- [@bbharathkumarreddy](https://github.com/bbharathkumarreddy/)

## License

See [LICENSE](https://github.com/bbharathkumarreddy/Sitemap-B-Framework/blob/master/LICENSE) file.

Development In Progress [GA by june,2020 ]
