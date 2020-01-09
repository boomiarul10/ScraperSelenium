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

        await driver.get('http://boeing.recruitasp.com.au/jobtools/JnCustomLogin.Login?in_organid=14599');
        var loop;
        var searchElement = await driver.findElement(By.xpath('//*[@id="rasp_left"]/div[4]/div/div[2]/form/div[4]/div[1]/input'));
        await searchElement.click();
        var atsJobCount = await driver.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/form[1]/p[1]/strong[2]'));
        var atscount = await atsJobCount.getText();
        var record = atscount.split("of");
        var atsJob = record[1].split("opportunities");
        jobMaker.setatsJobCount(parseInt(atsJob[0].trim()));
        do {
            loop = false;
            var counter = 1;
            do {
                var jobContainer = await driver.findElements(By.xpath('//*[@id="rasp_search_tmpl"]/form[1]/table[' + counter + ']/tbody/tr[1]/td[1]/fieldset/span/a'));
                var isPresent = await jobContainer.length;
                if (isPresent) {
                    try {
                        var job = jobMaker.create();

                        var titleElement = await driver.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/form[1]/table[' + counter + ']/tbody/tr[1]/td[1]/fieldset/span/a'));
                        job.JOB_TITLE = await titleElement.getText();
                        var locationElement = await driver.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/form[1]/table[' + counter + ']/tbody/tr[1]/td[3]'));
                        var location = await locationElement.getText();

                        job.JOB_CATEGORY = "Boeing Defence Australia";
                        job.JOB_CONTACT_COMPANY = "Boeing";
                        job.COMPANY_URL = "http://boeing.recruitasp.com.au/jobtools/JnCustomLogin.Login?in_organid=14599";
                        job.JOB_LOCATION_COUNTRY = "Australia";
                        if (location) {
                            var city = location.split(":");
                            job.JOB_LOCATION_CITY = city[1];
                        }

                        var urlElement = await driver.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/form[1]/table[' + counter + ']/tbody/tr[1]/td[1]/fieldset/span/a'));
                        var url = await urlElement.getAttribute("href");
                        var id = "";
                        if (url) {
                            job.JOB_APPLY_URL = url;
                            var apply = url;
                            var applyurl = apply.replace(".", "").replace("?", "").replace("&", "");
                            if (applyurl.includes("in_jnCounter=")) {
                                var jobID = applyurl.split("in_jnCounter=");
                                id = jobID[1];
                            }
                        }

                        await driverjobdetails.get(url);

                        var jobdetailspage = await driverjobdetails.findElements(By.xpath("//*[@id='rasp_search_tmpl']/div[1]/div[3]"));
                        var isDetailPage = await jobdetailspage.length;
                        if (isDetailPage) {
                            var JobDescription = await driverjobdetails.findElement(By.xpath("//*[@id='rasp_search_tmpl']/div[1]/div[3]"));
                            var desc = await JobDescription.getAttribute("outerHTML");
                            var descriptionRemovedTag;
                            var optionsTag = {
                                'add-remove-tags': ['table', 'tr', 'td']
                            };

                            cleanHtml.clean(desc, optionsTag, function (html) {
                                descriptionRemovedTag = html;
                            });
                           
                            var descr = descriptionRemovedTag.replace("Description:", "<b>Description:</b>").replace("<p align='left'></p><p align='left'></p>", "").replace('<img src="http://boeing.recruitasp.com.au/M_images/content/attachment.gif" alt="Note clip"><a href="http://boeing.recruitasp.com.au/jobtools/b_fileupload.proc_download?in_file_id=26549788&amp;in_servicecode=CUSTOMSEARCH&amp;in_organid=14599&amp;in_sessionid=0&amp;in_hash_key=06AE2BE698029A2B7D5CB1284372A3DA">1156861 Land 121 Ph4 Hawkei Support System IPT Lead-Deputy PM (3).pdf</a> (PDF, 111KB)<br>Job Specification<br><br></div>  <div class="elem_1">Share This:</div> <div class="elem_2"><share_this_buttons></share_this_buttons>", "<b>Description:</b>").replace("<p align="left"></p><p align="left"></p>', '').replace('<div class="elem_1">Attachments:</div>', '');
                            job.TEXT = HtmlEscape(descr);
                        }

                        var desc1;
                        var jobdetailsreqpage = await driverjobdetails.findElements(By.xpath('//*[@id="mainContainer"]/table/tbody/tr[3]'));
                        var isreqPage = await jobdetailsreqpage.length;
                        if (isreqPage) {
                            var descElement = await driverjobdetails.findElement(By.xpath('//*[@id="mainContainer"]/table/tbody/tr[3]'));
                            var decriptionReq = await descElement.getAttribute("outerHTML");

                            var descriptionRemovedTag1;
                            var optionTag = {
                                'add-remove-tags': ['table', 'tr', 'td']
                            };

                            cleanHtml.clean(decriptionReq, optionTag, function (html) {
                                descriptionRemovedTag1 = html;
                            });

                            desc1 = descriptionRemovedTag1.replace("Description:", "<b>Description:</b>").replace("<p align='left'></p><p align='left'></p>", "");
                        }

                        var jobidElement = await driverjobdetails.findElements(By.xpath('//*[@id="rasp_search_tmpl"]/div[1]/div[3]/div/table/tbody/tr[4]/td[2]/div'));
                        var isJobID = await jobidElement.length;
                        if (isJobID) {
                            var idElement = await driverjobdetails.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/div[1]/div[3]/div/table/tbody/tr[4]/td[2]/div'));
                            job.JDTID_UNIQUE_NUMBER = await idElement.getText();
                        }

                        var jobtypeElement = await driverjobdetails.findElements(By.xpath('//*[@id="rasp_search_tmpl"]/div[1]/div[3]/div/table/tbody/tr[3]/td[2]/div'));
                        var isJobType = await jobtypeElement.length;
                        if (isJobType) {
                            var type = await driverjobdetails.findElement(By.xpath('//*[@id="rasp_search_tmpl"]/div[1]/div[3]/div/table/tbody/tr[3]/td[2]/div')).getText();
                            job.JOB_TYPE = type;
                        }

                        var msg = "";
                        var jobID = job.JDTID_UNIQUE_NUMBER;
                        if (jobID == "") {
                            msg = "BlankJobID";
                        }
                        if (msg.includes("BlankJobID")) {
                            job.JDTID_UNIQUE_NUMBER = id;
                            job.TEXT = HtmlEscape(desc1);
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
                var nextContainer = await driver.findElements(By.xpath('//input[@value="Next & store"]'));
                var next = nextContainer.length;
                if (next) {
                    var nextLink = await driver.findElement(By.xpath('//input[@value="Next & store"]'));
                    await nextLink.click();
                    loop = true;
                }
            } catch (e) {

            }
        } while (loop);
        driver.quit();
        driverjobdetails.quit();
        snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
    } catch (e) {
        driver.quit();
        driverjobdetails.quit();
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

var snippet = async (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {
    var values = await service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "feedgeneratorwithasync");
    var snippet = package.resource.download.snippet("feedgeneratorwithasync");
    var input = snippet.createInput(configuration, jobs);
    try {
        var jobcount = await snippet.execute(input);
        var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);
        onsuccess(output);
    }
    catch (e) {
        var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);
        onfailure(output);
    }
}