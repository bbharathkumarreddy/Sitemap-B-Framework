const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const { create } = require('xmlbuilder2');
const cron = require('node-cron');

class sitemapBFramework {

  constructor(config) {
    this.init(config);
  }

  async init(config) {
    this.config = config || {};
    if (_.get(this.config, 'build.cron') && !cron.validate(this.config.build.cron)) console.error('Invalid Build Cron Expression , Auto Build Will Not Trigger');
    if (_.get(this.config, 'backup.cron') && !cron.validate(this.config.backup.cron)) console.error('Invalid Backup Cron Expression , Auto Bakcup Will Not Trigger');
    if (!this.config.maxLinksPerSitemap || parseInt(this.config.maxLinksPerSitemap) < 1 || parseInt(this.config.maxLinksPerSitemap) > 50000) this.config.maxLinksPerSitemap = 50000;
    if (!this.config.path) this.config.path = './';
    if (this.config.path.charAt(this.config.path.length - 1) != '/') this.config.path = this.config.path + '/';
    this.config.configPath = this.config.path + 'sitemap-config/';
    this.config.sitemapPath = this.config.path + 'sitemap-xml/';
    fs.mkdirSync(this.config.configPath, { recursive: true });
    fs.mkdirSync(this.config.sitemapPath + 'build', { recursive: true });
    this.config.configDataJSON = this.config.configPath + 'data.json';
    await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    this.changes = true;
    if (_.get(this.config, 'build.cron')) {
      const task_build = cron.schedule(this.config.build.cron, () => {
        this.sitemapBuildAndDeploy()
      });
      task_build.start();
    }
    if (_.get(this.config, 'backup.cron')) {
      const task_backup = cron.schedule(this.config.backup.cron, () => {
        this.BackupToBucket()
      });
      task_backup.start();
    }
  }


  async sitemapIndexAdd(sitemapName, loc, type = 'webpages', limit = this.config.maxLinksPerSitemap, locked = false) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    sitemapName = this.sitemapNameCheck(sitemapName);
    const indexPosition = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
    if (indexPosition >= 0) this.throwError(`Duplicate sitemapName Already Exists`);
    loc = this.locCheck(loc);
    const indexPositionLoc = _.findIndex(configDataJSON.sitemapIndex, ['loc', loc]);
    if (indexPositionLoc >= 0) this.throwError(`Duplicate loc Already Exists`);
    const data = {
      name: sitemapName,
      loc,
      limit: this.limitCheck(limit),
      locked: this.lockedCheck(locked),
      type: this.typeCheck(type),
      lastUpdated: new Date()
    };
    configDataJSON.sitemapIndex.push(data);
    await this.saveFile(this.config.configDataJSON, configDataJSON, 'json');
    this.changes = true;
    return { data, status: 200 };
  }

  async sitemapIndexUpdate(sitemapName, loc, type = 'webpages', limit = this.config.maxLinksPerSitemap, locked = false) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    sitemapName = this.sitemapNameCheck(sitemapName);
    const indexPosition = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
    if (indexPosition < 0) this.throwError(`SitemapName Does Not Exists`);
    loc = this.locCheck(loc);
    const data = {
      name: sitemapName,
      loc,
      limit: this.limitCheck(limit),
      locked: this.lockedCheck(locked),
      type: this.typeCheck(type),
      lastUpdated: new Date()
    };
    configDataJSON.sitemapIndex[indexPosition] = data;
    await this.saveFile(this.config.configDataJSON, configDataJSON, 'json');
    this.changes = true;
    return { data, status: 200 };
  }

  async sitemapIndexDelete(sitemapName) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    sitemapName = this.sitemapNameCheck(sitemapName);
    const indexPositionExists = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
    if (indexPositionExists == -1) this.throwError(`sitemapName Does Not Exists`);
    if (configDataJSON.sitemapIndex[indexPositionExists].locked == true) this.throwError(`Cannot Delete sitemapName in locked state`);
    configDataJSON.sitemapIndex.splice(indexPositionExists, 1);
    await this.saveFile(this.config.configDataJSON, configDataJSON, 'json');
    this.changes = true;
    return { data: 'Deleted Successfully', status: 200 };
  }

  async sitemapIndexList() {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    return { data: configDataJSON.sitemapIndex, status: 200 };
  }

  async sitemapItemAdd(itemLoc, sitemapName = null, lastmod = null, changefreq = null, priority = null) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    let indexPositionExists;
    if (!sitemapName || sitemapName == 'index_default') {
      sitemapName = this.sitemapNameCheck('index_default', 'name', true);
    } else {
      sitemapName = this.sitemapNameCheck(sitemapName);
      indexPositionExists = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
      if (indexPositionExists == -1) this.throwError(`sitemapName Does Not Exists`);
    }
    let sitemapDataJSON = await this.loadFile(this.config.configPath + sitemapName + '.json', true, 'json', []);
    if (sitemapName == 'index_default' && sitemapDataJSON.length > this.config.maxLinksPerSitemap) {
      this.throwError(`Default Sitemap Items Exceeding maxLinksPerSitemap of set limit : ${this.config.maxLinksPerSitemap}`);
    } else {
      const checkLimit = indexPositionExists ? configDataJSON.sitemapIndex[indexPositionExists].limit : this.config.maxLinksPerSitemap;
      if (sitemapDataJSON.length > checkLimit) {
        this.throwError(`${sitemapName} Sitemap Items Exceeding maxLinksPerSitemap of set limit : ${checkLimit}`);
      }
    }
    if (indexPositionExists && configDataJSON.sitemapIndex[indexPositionExists].locked) {
      this.throwError(`${sitemapName} Sitemap is in locked state`);
    }

    itemLoc = this.locCheck(itemLoc);
    const sitemapPosition = _.findIndex(sitemapDataJSON, ['loc', itemLoc]);
    if (sitemapPosition > -1) this.throwError(`Duplicate sitemap Item loc is not allowed`);

    const data = {
      loc: itemLoc,
      lastmod: this.lastmodCheck(lastmod),
      changefreq: this.changefreqCheck(changefreq),
      priority: this.priorityCheck(priority)
    };
    sitemapDataJSON.push(data);
    await this.saveFile(this.config.configPath + sitemapName + '.json', sitemapDataJSON, 'json');
    this.changes = true;
    return { data, status: 200 };
  }

  async sitemapItemUpdate(oldItemLoc, itemLoc, sitemapName = null, lastmod = null, changefreq = null, priority = null) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    let indexPositionExists;
    if (!sitemapName || sitemapName == 'index_default') {
      sitemapName = this.sitemapNameCheck('index_default', 'name', true);
    } else {
      sitemapName = this.sitemapNameCheck(sitemapName);
      indexPositionExists = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
      if (indexPositionExists == -1) this.throwError(`sitemapName Does Not Exists`);
    }
    let sitemapDataJSON = await this.loadFile(this.config.configPath + sitemapName + '.json', true, 'json', []);
    if (sitemapName == 'index_default' && sitemapDataJSON.length > this.config.maxLinksPerSitemap) {
      this.throwError(`Default Sitemap Items Exceeding maxLinksPerSitemap of set limit : ${this.config.maxLinksPerSitemap}`);
    } else {
      const checkLimit = indexPositionExists ? configDataJSON.sitemapIndex[indexPositionExists].limit : this.config.maxLinksPerSitemap;
      if (sitemapDataJSON.length > checkLimit) {
        this.throwError(`${sitemapName} Sitemap Items Exceeding maxLinksPerSitemap of set limit : ${checkLimit}`);
      }
    }
    if (indexPositionExists && configDataJSON.sitemapIndex[indexPositionExists].locked) {
      this.throwError(`${sitemapName} Sitemap is in locked state`);
    }
    oldItemLoc = this.locCheck(oldItemLoc);
    const sitemapPositionExists = _.findIndex(sitemapDataJSON, ['loc', oldItemLoc]);
    if (sitemapPositionExists < 0) this.throwError(`oldLoc Item loc not found in sitemap ${sitemapName}`);

    itemLoc = this.locCheck(itemLoc);
    const sitemapPosition = _.findIndex(sitemapDataJSON, ['loc', itemLoc]);
    if (sitemapPosition > -1 && sitemapPositionExists != sitemapPosition) this.throwError(`Duplicate sitemap Item loc is not allowed`);

    const data = {
      loc: itemLoc,
      lastmod: this.lastmodCheck(lastmod),
      changefreq: this.changefreqCheck(changefreq),
      priority: this.priorityCheck(priority)
    };
    sitemapDataJSON[sitemapPositionExists] = data;
    await this.saveFile(this.config.configPath + sitemapName + '.json', sitemapDataJSON, 'json');
    this.changes = true;
    return { data, status: 200 };
  }

  async sitemapItemDelete(itemLoc, sitemapName = null) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    let indexPositionExists;
    if (!sitemapName || sitemapName == 'index_default') {
      sitemapName = this.sitemapNameCheck('index_default', null, true);
    } else {
      sitemapName = this.sitemapNameCheck(sitemapName);
      indexPositionExists = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
      if (indexPositionExists == -1) this.throwError(`sitemapName Does Not Exists`);
    }
    if (indexPositionExists && configDataJSON.sitemapIndex[indexPositionExists].locked) this.throwError(`${sitemapName} Sitemap is in locked state`);
    let sitemapDataJSON = await this.loadFile(this.config.configPath + sitemapName + '.json', true, 'json', []);
    itemLoc = this.locCheck(itemLoc);
    const sitemapPositionExists = _.findIndex(sitemapDataJSON, ['loc', itemLoc]);
    if (sitemapPositionExists < 0) this.throwError(`loc Item not found in sitemap ${sitemapName}`);
    sitemapDataJSON.splice(sitemapPositionExists, 1);
    await this.saveFile(this.config.configPath + sitemapName + '.json', sitemapDataJSON, 'json');
    this.changes = true;
    return { data: 'Deleted Successfully', status: 200 };
  }

  async sitemapItemList(sitemapName = null) {
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    if (!sitemapName || sitemapName == 'index_default') {
      sitemapName = this.sitemapNameCheck('index_default', null, true);
    } else {
      sitemapName = this.sitemapNameCheck(sitemapName);
      const indexPositionExists = _.findIndex(configDataJSON.sitemapIndex, ['name', sitemapName]);
      if (indexPositionExists == -1) this.throwError(`sitemapName Does Not Exists`);
    }
    const sitemapDataJSON = await this.loadFile(this.config.configPath + sitemapName + '.json', true, 'json', []);
    return { data: sitemapDataJSON, status: 200 };
  }

  async sitemapGlobalSearch(loc) {
    if (!loc) this.throwError(`loc argument is manadatory for this method`);
    let configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    const sitemapIndexList = configDataJSON.sitemapIndex.map(i => { return i.name });
    sitemapIndexList.push('index_default');
    loc = this.locCheck(loc);
    for (let i = 0; i < sitemapIndexList.length; i++) {
      const sitemapName = sitemapIndexList[i] == 'index_default' ? this.sitemapNameCheck(sitemapIndexList[i], 'name', true) : this.sitemapNameCheck(sitemapIndexList[i]);
      const sitemapDataJSON = await this.loadFile(this.config.configPath + sitemapName + '.json', false, 'json');
      const sitemapPositionExists = _.findIndex(sitemapDataJSON, ['loc', loc]);
      if (sitemapPositionExists < 0) continue;
      return { data: { sitemapName: sitemapName, sitemap: { position: sitemapPositionExists, ...sitemapDataJSON[sitemapPositionExists] } }, status: 200 };
    }
    return 'itemLoc Not Found';
  }

  async sitemapBuildAndDeploy() {
    const configDataJSON = await this.loadFile(this.config.configDataJSON, true, 'json', { data: {}, sitemapIndex: [] });
    const buildNo = Date.now();
    fs.mkdirSync(`${this.config.sitemapPath}build-${buildNo}`, { recursive: true });
    console.log('Sitemap Build Started @ ' + buildNo);
    if (configDataJSON.sitemapIndex.length <= 0) {
      const sitemapName = this.sitemapNameCheck('index_default', 'name', 'true');
      await this.sitemapEachBuild(sitemapName + '.json', 'sitemap.xml', buildNo, 'webpages');
    } else {
      await this.sitemapIndexBuild(configDataJSON, buildNo);
      const sitemapName = this.sitemapNameCheck('index_default', 'name', 'true');
      await this.sitemapEachBuild(sitemapName + '.json', 'sitemap-01.xml', buildNo, 'webpages');
      for (let i = 0; i < configDataJSON.sitemapIndex.length; i++) {
        const name = this.sitemapNameCheck(configDataJSON.sitemapIndex[i].name);
        await this.sitemapEachBuild(name + '.json', name + '.xml', buildNo, configDataJSON.sitemapIndex[i].type || 'webpages');
      }
    }
    this.changes = false;
    if (this.config.build.deployToBucket) {
      this.DeployToBucket();
      return { data: `Sitemap Build Success, Deployment to Bucket in Background process @ '${this.config.sitemapPath}'`, status: 200 };
    }
    return { data: `Sitemap Build Success @ '${this.config.sitemapPath}'`, status: 200 };
  }

  async sitemapIndexBuild(configDataJSON, buildNo) {
    const sitemapIndexXML = create({ version: '1.0', encoding: "UTF-8" });
    const sitemapIndexXMLUP = sitemapIndexXML.ele('sitemapindex', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });
    configDataJSON.sitemapIndex.forEach(element => {
      sitemapIndexXMLUP.ele('sitemap').ele('loc').txt(element.loc).up();
    });
    const xml = sitemapIndexXML.end({ prettyPrint: true });
    fs.writeFileSync(`${this.config.sitemapPath}build/sitemap.xml`, xml);
    fs.writeFileSync(`${this.config.sitemapPath}build-${buildNo}/sitemap.xml`, xml);
    return true;
  }

  async sitemapEachBuild(jsonName, buildName, buildNo, type = 'webpages') {
    const sitemapDataJSON = await this.loadFile(this.config.configPath + jsonName, false, 'json');
    const sitemapXML = create({ version: '1.0', encoding: "UTF-8" });
    const rootAttr = { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }
    if (type == 'video') rootAttr['xmlns:video'] = 'http://www.google.com/schemas/sitemap-video/1.1';
    else if (type == 'image') rootAttr['xmlns:image'] = 'http://www.google.com/schemas/sitemap-image/1.1';
    else if (type == 'news') rootAttr['xmlns:news'] = '"http://www.google.com/schemas/sitemap-news/0.9';
    const sitemapXMLUP = sitemapXML.ele('urlset', rootAttr);
    if (sitemapDataJSON) {
      sitemapDataJSON.forEach(element => {
        let sitemapXMLUPLoc = sitemapXMLUP.ele('url').ele('loc').txt(element.loc).up();
        if (element.lastmod) sitemapXMLUPLoc.ele('lastmod').txt(element.lastmod).up();
        if (element.changefreq) sitemapXMLUPLoc.ele('changefreq').txt(element.changefreq).up();
        if (element.priority) sitemapXMLUPLoc.ele('priority').txt(element.priority).up();
      });
    }
    const xml = sitemapXML.end({ prettyPrint: true });
    fs.writeFileSync(`${this.config.sitemapPath}build/${buildName}`, xml);
    fs.writeFileSync(`${this.config.sitemapPath}build-${buildNo}/${buildName}`, xml);
    return true;
  }

  async DeployToBucket() {
    if (_.get(this.config, 'build.deployToBucket')) {
      let modeArr = Object.keys(this.config.build.deployToBucket);
      if (modeArr.length < 1) return true;
      const mode = modeArr[0];
      if (mode == 's3') {
        if (!_.get(this.config, 'build.deployToBucket.s3.accessKeyId')) { console.error('s3 is defined, config.build.deployToBucket.s3.accessKeyId Missing '); return false; }
        if (!_.get(this.config, 'build.deployToBucket.s3.secretAccessKey')) { console.error('s3 is defined, config.build.deployToBucket.s3.secretAccessKey Missing '); return false; }
        if (!_.get(this.config, 'build.deployToBucket.s3.bucket')) { console.error('s3 is defined, config.build.deployToBucket.s3.bucket Missing '); return false; }
      } else if (mode == 'gcs') {
        if (!_.get(this.config, 'build.deployToBucket.gcs.projectId')) { console.error('gcs is defined, config.build.deployToBucket.gcs.projectId Missing '); return false; }
        if (!_.get(this.config, 'build.deployToBucket.gcs.service_account_key_path')) { console.error('gcs is defined, config.build.deployToBucket.gcs.service_account_key_path Missing '); return false; }
        if (!_.get(this.config, 'build.deployToBucket.gcs.bucket')) { console.error('gcs is defined, config.build.deployToBucket.gcs.bucket Missing '); return false; }
      }
      if (mode == 's3') {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: this.config.build.deployToBucket.s3.accessKeyId,
          secretAccessKey: this.config.build.deployToBucket.s3.secretAccessKey
        });
        if (!this.config.build.deployToBucket.gcs.path) this.config.build.deployToBucket.gcs.path = '';
        else if (this.config.build.deployToBucket.gcs.path != '' && this.config.build.deployToBucket.gcs.path.charAt(this.config.build.deployToBucket.gcs.path.length - 1) != '/') {
          this.config.build.deployToBucket.gcs.path = this.config.build.deployToBucket.gcs.path + '/';
        }
        fs.readdirSync(this.config.sitemapPath + 'build').forEach(async (file) => {
          const fileContent = fs.readFileSync(this.config.sitemapPath + 'build/' + file);
          const params = {
            Bucket: this.config.build.deployToBucket.s3.bucket,
            Key: this.config.build.deployToBucket.gcs.path + file,
            Body: fileContent
          };
          if (_.get(this.config, 'build.deployToBucket.s3.makePublic')) params.ACL = 'public-read';
          s3.upload(params, function (err, data) {
            if (err) console.error(err.message);
          });
        });
      } else if (mode == 'gcs') {
        const { Storage } = require('@google-cloud/storage')
        const storage = new Storage({
          projectId: this.config.build.deployToBucket.gcs.projectId,
          keyFilename: this.config.build.deployToBucket.gcs.service_account_key_path
        });
        if (!this.config.build.deployToBucket.gcs.path) this.config.build.deployToBucket.gcs.path = '';
        else if (this.config.build.deployToBucket.gcs.path != '' && this.config.build.deployToBucket.gcs.path.charAt(this.config.build.deployToBucket.gcs.path.length - 1) != '/') {
          this.config.build.deployToBucket.gcs.path = this.config.build.deployToBucket.gcs.path + '/';
        }
        fs.readdirSync(this.config.sitemapPath + 'build').forEach(async (file) => {
          await storage.bucket(this.config.build.deployToBucket.gcs.bucket).upload(this.config.sitemapPath + 'build/' + file, {
            destination: this.config.build.deployToBucket.gcs.path + file,
            gzip: true,
          });
          if (_.get(this.config, 'build.deployToBucket.gcs.makePublic')) {
            await storage.bucket(this.config.build.deployToBucket.gcs.bucket).file(this.config.build.deployToBucket.gcs.path + file).makePublic();
          }
        });
      }
    }
  }

  async BackupToBucket() {
    if (_.get(this.config, 'backup.bakcupToBucket')) {
      let modeArr = Object.keys(this.config.backup.bakcupToBucket);
      if (modeArr.length < 1) return true;
      const mode = modeArr[0];
      if (mode == 's3') {
        if (!_.get(this.config, 'backup.bakcupToBucket.s3.accessKeyId')) { console.error('s3 is defined, config.backup.bakcupToBucket.s3.accessKeyId Missing '); return false; }
        if (!_.get(this.config, 'backup.bakcupToBucket.s3.secretAccessKey')) { console.error('s3 is defined, config.backup.bakcupToBucket.s3.secretAccessKey Missing '); return false; }
        if (!_.get(this.config, 'backup.bakcupToBucket.s3.bucket')) { console.error('s3 is defined, config.backup.bakcupToBucket.s3.bucket Missing '); return false; }
      } else if (mode == 'gcs') {
        if (!_.get(this.config, 'backup.bakcupToBucket.gcs.projectId')) { console.error('gcs is defined, config.backup.bakcupToBucket.gcs.projectId Missing '); return false; }
        if (!_.get(this.config, 'backup.bakcupToBucket.gcs.service_account_key_path')) { console.error('gcs is defined, config.backup.bakcupToBucket.gcs.service_account_key_path Missing '); return false; }
        if (!_.get(this.config, 'backup.bakcupToBucket.gcs.bucket')) { console.error('gcs is defined, config.backup.bakcupToBucket.gcs.bucket Missing '); return false; }
      }
      const BackupNo = Date.now();
      console.log('Sitemap Backup Started @ ' + BackupNo);
      if (mode == 's3') {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: this.config.backup.bakcupToBucket.s3.accessKeyId,
          secretAccessKey: this.config.backup.bakcupToBucket.s3.secretAccessKey
        });
        if (!this.config.backup.bakcupToBucket.s3.path) this.config.backup.bakcupToBucket.s3.path = '';
        else if (this.config.backup.bakcupToBucket.s3.path != '' && this.config.backup.bakcupToBucket.s3.path.charAt(this.config.backup.bakcupToBucket.s3.path.length - 1) != '/') {
          this.config.backup.bakcupToBucket.s3.path = this.config.backup.bakcupToBucket.s3.path + '/';
        }
        fs.readdirSync(this.config.sitemapPath + 'build').forEach(async (file) => {
          const fileContent = fs.readFileSync(this.config.sitemapPath + 'build/' + file);
          const params = {
            Bucket: this.config.backup.bakcupToBucket.s3.bucket,
            Key: this.config.backup.bakcupToBucket.s3.path + 'sitemapbck-' + BackupNo + '/sitemap-xml/' + file,
            Body: fileContent
          };
          s3.upload(params, function (err, data) {
            if (err) console.error(err.message);
          });
        });
        fs.readdirSync(this.config.configPath).forEach(async (file) => {
          const fileContent = fs.readFileSync(this.config.sitemapPath + file);
          const params = {
            Bucket: this.config.backup.bakcupToBucket.s3.bucket + 'sitemapbck-' + BackupNo + '/sitemap-config/' + file,
            Key: file,
            Body: fileContent
          };
          s3.upload(params, function (err, data) {
            if (err) console.error(err.message);
          });
        });
      } else if (mode == 'gcs') {
        const { Storage } = require('@google-cloud/storage')
        const storage = new Storage({
          projectId: this.config.backup.bakcupToBucket.gcs.projectId,
          keyFilename: this.config.backup.bakcupToBucket.gcs.service_account_key_path
        });
        if (!this.config.backup.bakcupToBucket.gcs.path) this.config.backup.bakcupToBucket.gcs.path = '';
        else if (this.config.backup.bakcupToBucket.gcs.path != '' && this.config.backup.bakcupToBucket.gcs.path.charAt(this.config.backup.bakcupToBucket.gcs.path.length - 1) != '/') {
          this.config.backup.bakcupToBucket.gcs.path = this.config.backup.bakcupToBucket.gcs.path + '/';
        }
        fs.readdirSync(this.config.sitemapPath + 'build').forEach(async (file) => {
          await storage.bucket(this.config.backup.bakcupToBucket.gcs.bucket).upload(this.config.sitemapPath + 'build/' + file, {
            destination: this.config.backup.bakcupToBucket.gcs.path + 'sitemapbck-' + BackupNo + '/sitemap-xml/' + file,
            gzip: true,
          });
        });
        fs.readdirSync(this.config.configPath).forEach(async (file) => {
          await storage.bucket(this.config.backup.bakcupToBucket.gcs.bucket).upload(this.config.configPath + file, {
            destination: this.config.backup.bakcupToBucket.gcs.path + 'sitemapbck-' + BackupNo + '/sitemap-config/' + file,
            gzip: true,
          });
        });
      }
    }
  }

  sitemapNameCheck(sitemapName, identifier = 'Name', force = false) {
    if (!sitemapName || typeof (sitemapName) != 'string') this.throwError(`${identifier} is mandatory, Should be string`);
    sitemapName = sitemapName.toLowerCase();
    if (!(/^[a-zA-Z0-9- _]*$/.test(sitemapName))) this.throwError(`sitemapNames special characters not allowed`);
    if (['sitemap-01', 'sitemap', 'index_default'].includes(sitemapName) && !force) this.throwError(`sitemapNames with ['sitemap', 'sitemap-01', 'index_default'] are reserved and not allowed`);
    return sitemapName
  }

  limitCheck(limit = this.config.maxLinksPerSitemap) {
    limit = parseInt(limit);
    if(isNaN(limit)) limit = this.config.maxLinksPerSitemap;
    if (limit && (limit < 0 || limit > this.config.maxLinksPerSitemap)) this.throwError(`Max limit cannot exceed set limit of ${this.config.maxLinksPerSitemap}`);
    return limit || this.config.maxLinksPerSitemap;
  }

  lockedCheck(locked = 'false') {
    locked = locked.toString().toLowerCase();
    if (locked == 'true') return true;
    if (locked == 'false') return false;
    this.throwError(`Locked State should be True or False`);
  }

  typeCheck(type = 'webpages') {
    if (type && ['webpages', 'news', 'image', 'video'].includes(type)) return type;
    else {
      this.throwError(`Invalid Type Declared, Allowed types [webpages,news,image,video], Default webpages`);
    }
  }

  locCheck(loc, identifier = 'loc') {
    if (!loc || typeof (loc) != 'string' || loc.length > 2048) {
      this.throwError(`${identifier} is mandatory, Should be string of max length of 2048 characters`);
    }
    return loc
  }

  lastmodCheck(lastmod = null) {
    if (lastmod && (typeof (lastmod) != 'string' || !moment(lastmod, "YYYY-MM-DD").isValid())) {
      this.throwError(`lastmod is optional, Should be string of format YYYY-MM-DD`);
    }
    return lastmod;
  }

  changefreqCheck(changefreq = null) {
    if (changefreq && (typeof (changefreq) != 'string' || !['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].includes(changefreq))) {
      this.throwError(`changefreq is optional, Should be string of values [always,hourly,daily,weekly,monthly,yearly,never]`);
    }
    return changefreq
  }

  priorityCheck(priority = null) {
    if (priority) priority = parseFloat(priority).toFixed(1);
    if (priority && (priority < 0 || priority > 1)) this.throwError(`priority is optional, Should be values between 0.0 to 1.0`);
    return priority
  }


  async loadFile(file, createIfNotExists = true, format = 'json', data = null) {
    try {
      if (!fs.existsSync(file) && createIfNotExists) {
        if (format == 'json' && !data) data = '{}';
        else if (format == 'json' && data) data = JSON.stringify(data);
        else if (!data) data = '';
        fs.writeFileSync(file, data);
      } else if (!fs.existsSync(file)) {
        return false;
      }
      const finalData = fs.readFileSync(file, 'utf8');
      if (format == 'json') return JSON.parse(finalData);
      return finalData;
    } catch (e) {
      console.errro(e.message)
    }
  }

  async saveFile(file, data, format = 'json') {
    try {
      if (format == 'json') return fs.writeFileSync(file, JSON.stringify(data))
      return fs.writeFileSync(file, data)
    } catch (e) {
      console.errro(e.message)
    }
  }

  throwError(errorString, status = 400) {
    let error = new Error(errorString);
    error.status = status;
    throw error;
  }

}

module.exports = sitemapBFramework;