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
    
    await driver.get('https://re12.ultipro.com/DEB1001/JobBoard/ListJobs.aspx?__VT=ExtCan');
    
    var totalJobElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[1]/tbody/tr/td/span[5]'));
    var totalJobCount = awaittotalJobElement.getText();
    jobMaker.setatsJobCount(parseInt(totalJobCount));
    
    do {
        loop = false;
        var counter = 2;
        do {
            
            var jobContainer = awaitdriver.findElements(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]'));
            var isPresent = awaitjobContainer.length;
            if (isPresent) {
                try {
                    var job = jobMaker.create();
                    
                    var idElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[1]'));
                    var jobId = awaitidElement.getText();
                    job.JDTID_UNIQUE_NUMBER = jobId.trim();
                    var titleElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]'));
                    job.JOB_TITLE = await titleElement.getText();
                    var cityElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[6]/a'));
                    job.JOB_LOCATION_CITY = await cityElement.getAttribute('title');
                    var stateElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[7]/a'));
                    job.JOB_LOCATION_STATE = await stateElement.getAttribute('title');
                    var categoryElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[5]'));
                    job.JOB_CATEGORY = await categoryElement.getText();
                    
                    var urlElement = awaitdriver.findElement(By.xpath('//*[@id="PXForm"]/table[2]/tbody/tr[' + counter + ']/td[2]/a'));
                    var url = awaiturlElement.getAttribute("href");
                    await driverjobdetails.get(url);
                    
                    var jobdetailspage = awaitdriverjobdetails.findElements(By.xpath('//*[@id="PXForm"]//table[@class="DetailsTable"]'));
                    var isDetailPage = awaitjobdetailspage.length;
                    if (isDetailPage) {
                        var jobDescriptionElement = awaitdriverjobdetails.findElement(By.xpath('//*[@id="PXForm"]//table[@class="DetailsTable"]'));
                        var desc = awaitjobDescriptionElement.getAttribute("outerHTML");
                        
                        var urlElement = awaitdriverjobdetails.findElement(By.xpath('//*[@id="PXForm"]/table[2]//a[@title="Apply On-line"]'));
                        job.JOB_APPLY_URL = await urlElement.getAttribute("href");
                        
                        var jobDescription = "";
                        jobDescription = desc.replace(/<a.*?\/a>/g, '');
                        //jobDescription = desc;
                        
                        var description = jobDescription.replace('', '').replace('Send This Job to a Friend', '');
                        job.TEXT = HtmlEscape(description);
                    }
                    jobMaker.successful.add(job, botScheduleID);
                    counter++;
                } catch (e) {
                    jobMaker.failed.add(job.JDTID_UNIQUE_NUMBER, e.message);
                    counter++;
                }
            }
        } while (isPresent);
        try {
            var nextContainer = awaitdriver.findElements(By.xpath('//input[@value=" > "][@disabled="disabled"]'));
            var next = nextContainer.length;
            if (next == 0) {
                var nextLink = awaitdriver.findElement(By.xpath('//input[@value=" > "]'));
                await nextLink.click();
                loop = true;
            }
        } catch (e) {

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
    description = description.replace(/&#9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var snippet = async(configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure)=> {
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