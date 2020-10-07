// TOOL
// This tool allows us to run a simple node command and 
// pull our content from an airtable

// REQUIREMENTS
// node     -->  brew install node
// fs       -->  npm install fs
// airtable -->  npm install airtable
// set api key environment variable (get from Anand)

// HOW TO RUN
// in the root directory of our github, run node cms.js to update the language json files

var fs = require('fs');
var Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY              
});
var base = Airtable.base('appsGDOWZSAPscKAl');

// ARRAYS TO FILL
// TODO: make this dynamic so a new array is created for each airtable column
var english = {};
var portuguese = {};

// MAIN API CALL
base('Main CMS').select({
    view: "Main View"
}).eachPage(function page(records, fetchNextPage) {

    records.forEach(function(record) {
        english[record.get('key')] = {"message":record.get('en')};
        portuguese[record.get('key')] = {"message":record.get('pt_BR')};
    });
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
    console.log(done);

    var stringifyEn = JSON.stringify(english);
    var stringifyPt = JSON.stringify(portuguese);

    fs.writeFile("./extension/_locales/en/messages.json", stringifyEn, function(err){
        if (err) throw err;
        console.log('File is created successfully.');
    });

    fs.writeFile("./extension/_locales/pt_BR/messages.json", stringifyPt, function(err){
        if (err) throw err;
        console.log('File is created successfully.');
    });

});