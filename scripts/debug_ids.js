const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../data/student_classes.json');
const mapping = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const targetIds = ['2104006', '2004009'];

targetIds.forEach(id => {
    console.log(`ID ${id}: ${mapping[id] ? mapping[id] : 'NOT FOUND'}`);
});
