var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
var cleanHtml = require('clean-html');
var service = package.service;
var resource = package.resource;
var log = resource.constants.log;
var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
jobMaker.setAlertCount(5);
var botScheduleID = "";

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
            onfailure(output);
        }
    });
}

var core = async (configuration, onsuccess, onfailure) => {
    try {
        botScheduleID = configuration.scheduleid;
        var By = selenium.By;
        var until = selenium.until;
        var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
        var driverjobdetails = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());
       
        //var driver = selenium.createDriver("chrome");
        //var driverjobdetails = selenium.createDriver("chrome");

        await driver.get('http://tbe.taleo.net/NA3/ats/careers/jobSearch.jsp?org=CLIFFSNATURALRESOURCES&cws=1');        
        var submitElement = await driver.findElement(By.xpath('//*[@name="tbe_cws_submit"]'));
        await submitElement.click();      

        var atsJobCount = await driver.findElement(By.xpath('//*[@id="taleoContent"]/table/tbody/tr[3]/td/b'));
        var record = await atsJobCount.getText();
        jobMaker.setatsJobCount(record);

        var loop;                
        do {                        
            var counter = 2;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + counter + ']'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();
                        var titleElement = await driver.findElement(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + counter + ']/td[1]//a'));
                        var title = await titleElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + counter + ']/td[2]'));
                        var location = await locationElement.getText();

                        var countryElement = await driver.findElement(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + counter + ']/td[3]'));
                        var country = await countryElement.getText();
                        var categoryElement = await driver.findElement(By.xpath('//*[@id="cws-search-results"]/tbody/tr[' + counter + ']/td[4]'));
                        var category = await categoryElement.getText();                        
                        var applyURL = await titleElement.getAttribute("href");                     

                        
                        await driverjobdetails.get(applyURL);
                        
                        
                        var jobIdElement = await driverjobdetails.findElement(By.xpath('//*[@id="taleoContent"]/table/tbody/tr[5]/td[2]/b'));
                        var jobid = await jobIdElement.getText();
                        var jobtypeElement = await driverjobdetails.findElement(By.xpath('//*[@id="taleoContent"]/table/tbody/tr[6]/td[2]/b'));
                        var type = await jobtypeElement.getText();

                        var descriptionElement = await driverjobdetails.findElement(By.xpath('//*[@id="taleoContent"]/table/tbody'));
                        var description = await descriptionElement.getAttribute("innerHTML");
                        description = description.split('<td class="nowrapFormLabel width160 top">Location:</td>');
                        description = '<td class="nowrapFormLabel width160 top">Location:</td>' + description[1];                        
                        var descriptionText = description.split('<form action="https://chj.tbe.taleo.net/chj05/ats/careers/apply.jsp');
                        descriptionText = descriptionText[0];
                        descriptionText = descriptionText.replace(/<\/tr>/g, '<br>').replace(/<h1>/g, '<h3>').replace(/<\/h1>/g, '</h3>');
                        descriptionText = descriptionText.replace(/<br><\/br>/g, '').replace(/&#xf0b7;/g, '•');
                        descriptionText = HtmlEscape(descriptionText) + '<br><br><br>';
                        descriptionText = descriptionText.replace(/<p><\/p>/g, '');                

                        var optionsTag = {
                            'add-remove-tags': ['tr', 'thead', 'tbody', 'table','input']
                        };
                        cleanHtml.clean(descriptionText, optionsTag, function (html) {
                            descriptionText = html;
                        });

                        job.JOB_TITLE = title;
                        job.JDTID_UNIQUE_NUMBER = jobid;
                        job.TEXT = descriptionText;                        
                        job.JOB_CATEGORY = category;
                        job.JOB_APPLY_URL = applyURL;
                        if (location.indexOf('Toronto') > 0 || location.indexOf('Sudbury') > 0 || location.indexOf('Northern Ontario') > 0 ||
                            location.indexOf('Ontario') > 0 || location.indexOf('ON') > 0) {
                            country = "Canada";
                        }
                        if (location) {
                            if (location.indexOf(',') > 0) {
                                var loc = location.split(",");
                                job.JOB_LOCATION_CITY = loc[0];
                                job.JOB_LOCATION_STATE = loc[1];
                            } else {
                                job.JOB_LOCATION_CITY = location;
                            }                                                                             
                        }
                        job.JOB_LOCATION_COUNTRY = country;
                        job.JOB_TYPE = type;
                        job.JOB_CONTACT_COMPANY = "Cliffs Natural Resources";
                        job.COMPANY_URL = "http://tbe.taleo.net/NA3/ats/careers/jobSearch.jsp?org=CLIFFSNATURALRESOURCES&cws=1";
                        jobMaker.successful.add(job, botScheduleID);
                        counter++;
                    } catch (e) {
                        jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                        counter++;
                    }
                }
            } while (isPresent);

            try {
                var pageElement = await driver.findElement(By.xpath('//*[@id="taleoContent"]/table/tbody/tr[4]/td/table/tbody/tr[1]/td/table'));
                var page = await pageElement.getText();
                page = page.split('of');
                var totalJobs = page[1].trim();                
                page = page[0].split("-");
                page = page[1].trim();
                if (page == totalJobs) {
                    loop = false;
                }
                else {
                    var nextContainer = await driver.findElement(By.xpath('//*[@title="Next Page"]'));
                    await nextContainer.click();
                    loop = true;
                }
                }                
             catch (e) {

            }
        } while (loop);
        await driver.quit();
        await driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        await driver.quit();
        await driverjobdetails.quit();
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}
function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#9;/g, ' ');
    description = description.replace(/&nbsp;/g, '');
    description = description.replace(/\s\s+/g, ' ');
    description = description.replace(/\r?\n|\r/g, '');
    description = description.replace(/&#x9;/g, '');
    return description;
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgenerator").then(values => {
        var snippet = package.resource.download.snippet("feedgenerator");
        var input = snippet.createInput(configuration, jobs);
        snippet
            .execute(input)
            .then(jobcount => {
                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
                onsuccess(output);
            })
            .catch(err => {
                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
                onfailure(output);
            });
    });
}
