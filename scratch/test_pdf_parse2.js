const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;
console.log('PDFParse properties:', Object.getOwnPropertyNames(PDFParse));
console.log('PDFParse prototype properties:', Object.getOwnPropertyNames(PDFParse.prototype));
