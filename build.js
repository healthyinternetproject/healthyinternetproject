// TOOL
// This tool allows us to run a simple node command and 
// pull our content from an airtable

// REQUIREMENTS
// node     -->  brew install node
// fs       -->  npm install fs
// airtable -->  npm install airtable
// bestzip  -->  npm install bestzip
// set api key environment variable (get from Anand)

// HOW TO RUN
// in the root directory of our github, run node cms.js to update the language json files

var fs = require('fs');
var zip = require('bestzip');

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
var spanish = {};
var french = {};
var arabic = {};


// MAIN API CALL
base('Main CMS').select({
    view: "Main View"
}).eachPage(function page(records, fetchNextPage) {

    records.forEach(function(record) {
        english[record.get('key')] = {"message":record.get('en')};
        if(record.get('en') === undefined || record.get('en') === ""){
            english[record.get('key')] = {"message":""};
        }
        portuguese[record.get('key')] = {"message":record.get('pt_BR')};
        if(record.get('pt_BR') === undefined || record.get('pt_BR') === ""){
            portuguese[record.get('key')] = {"message":""};
        }
        spanish[record.get('key')] = {"message":record.get('es')};
        if(record.get('es') === undefined || record.get('es') === ""){
            spanish[record.get('key')] = {"message":""};
        }
        french[record.get('key')] = {"message":record.get('fr')};
        if(record.get('fr') === undefined || record.get('fr') === ""){
            french[record.get('key')] = {"message":""};
        }
        arabic[record.get('key')] = {"message":record.get('ar')};
        if(record.get('ar') === undefined || record.get('ar') === ""){
            arabic[record.get('key')] = {"message":""};
        }
    });
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
    console.log(done);

    var stringifyEn = JSON.stringify(english);
    var stringifyPt = JSON.stringify(portuguese);
    var stringifySp = JSON.stringify(spanish);
    var stringifyFr = JSON.stringify(french);
    var stringifyAr = JSON.stringify(arabic);

    fs.writeFile("./extension/_locales/en/messages.json", stringifyEn, function(err){
        if (err) throw err;
        console.log('English file is created successfully.');
        fs.writeFile("./extension/_locales/pt_BR/messages.json", stringifyPt, function(err){
            if (err) throw err;
            console.log('Portuguese file is created successfully.');
            fs.writeFile("./extension/_locales/es/messages.json", stringifySp, function(err){
                if (err) throw err;
                console.log('Spanish file is created successfully.');
                fs.writeFile("./extension/_locales/fr/messages.json", stringifyFr, function(err){
                    if (err) throw err;
                    console.log('French file is created successfully.');
                    fs.writeFile("./extension/_locales/ar/messages.json", stringifyAr, function(err){
                        if (err) throw err;
                        console.log('Arabic file is created successfully.');
                        zip({
                            source: 'extension/*',
                            destination: './extension.zip'
                          }).then(function() {
                            console.log('Zip created successfully');
                          }).catch(function(err) {
                            console.error(err.stack);
                            process.exit(1);
                          });
                    });
                });
            });
        });
    });
});