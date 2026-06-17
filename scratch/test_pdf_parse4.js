const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;
console.log('load method string representation:');
console.log(PDFParse.prototype.load.toString());
