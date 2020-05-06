"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const zip_1 = require("./zip");
const unzip_1 = require("./unzip");
__export(require("./zip"));
__export(require("./unzip"));
/**
 * Compress a single file to zip.
 * @param file
 * @param zipFile the zip file path.
 * @param options
 */
function archiveFile(file, zipFile, options) {
    const zip = new zip_1.Zip(options);
    zip.addFile(file);
    return zip.archive(zipFile);
}
exports.archiveFile = archiveFile;
/**
 * Compress all the contents of the specified folder to zip.
 * @param folder
 * @param zipFile the zip file path.
 * @param options
 */
function archiveFolder(folder, zipFile, options) {
    const zip = new zip_1.Zip(options);
    zip.addFolder(folder);
    return zip.archive(zipFile);
}
exports.archiveFolder = archiveFolder;
/**
 * Extract the zip file to the specified location.
 * @param zipFile
 * @param targetFolder
 * @param options
 */
function extract(zipFile, targetFolder, options) {
    const unzip = new unzip_1.Unzip(options);
    return unzip.extract(zipFile, targetFolder);
}
exports.extract = extract;
//# sourceMappingURL=index.js.map