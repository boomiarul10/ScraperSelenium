var Promise = require('promise');
var package = global.createPackage();
var he = require('he');
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

var core = (configuration, onsuccess, onfailure) => {
    botScheduleID = configuration.scheduleid;
    var By = selenium.By;
    var until = selenium.until;
    var async = require("async");
    var driver = selenium.createDriver("chrome");

    var jobs = new Array();
    var jobCount;

    driver.get('http://careers.peopleclick.eu.com/careerscp/client_ams_sourcecloud/external2/rssfeed.do?functionName=searchRss&rssFeedSearchId2=aihSCGSLdJ4XBZPzjn6YuQ%253D%');
    driver.findElement(By.xpath('//*[@id="searchCriteriaLink"]')).then(searchelement => {
        searchelement.click().then(() => {
            driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.FLD_JPM_COUNTRY"]/option[1]')).then(element => {
                element.getText().then(recordsValue => {
                    var record = recordsValue.split('(');
                    var atscount = record[1].replace(")", "");
                    jobMaker.setatsJobCount(parseInt(atscount));
                    driver.findElement(By.xpath('//*[@id="searchButton"]')).then(element => {
                        element.click().then(() => {
                            driver.findElements(By.xpath('//*[@id="pcSearchResults"]/form')).then(e => {
                                return !!e.length;
                            }).then(data => {
                                if (data == true) {
                                    new Promise((onsuccess, onfailure) => {
                                        try {
                                            forEachTag(driver, By, until, jobs, async);
                                        } catch (e) {
                                            onfailure(e);
                                        }
                                    }).then(() => {
                                        thecallback();
                                    });
                                }
                            });
                        });
                    });
                });
            });
        });
    })
        .then(() => {
            driver.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
        }, err => {
            driver.quit();
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
            onfailure(output);
        });
}

function GetCount(jobList) {
    jobCount = new Array();
    for (var i = 2; i <= jobList.length - 2; i++) {
        jobCount.push(i);
    }
}

function HtmlEscape(description) {
    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });
    description = description.replace(/&#x9;/g, '');
    description = description.replace(/^\s+|\s+$/g, '');
    description = description.replace(/\r?\n|\r/g, '');
    return description;
}

var forEachTag = (driver, By, until, jobs, async) => {
    driver.findElements(By.className('panel panel-default')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver.findElement(By.xpath('//*[@id="pcSearchResults"]/form/div[' + prime + ']/div/div / div / div[1] / div[1] / span / a'))
                .then(titleElement => {
                    if (titleElement != null) {
                        titleElement.getText().then(title => {
                            driver.findElement(By.xpath('//*[@id="pcSearchResults"]/form/div[' + prime + ']/div/div/div/div[1]/div[2]/p')).then(jobIDElement => {
                                jobIDElement.getText().then(id => {
                                    driver.findElement(By.xpath('//*[@id="pcSearchResults"]/form/div[' + prime + ']/div/div / div / div[1] / div[1] / span / a')).then(urlElement => {
                                        urlElement.getAttribute("href").then(url => {
                                            titleElement.click().then(() => {
                                                driver.findElement(By.xpath("//*[@id='jobDetailsDetails']/div[2]")).then(descriptionElement => {
                                                    descriptionElement.getAttribute("outerHTML").then(description => {
                                                        driver.findElement(By.xpath("//*[@id='rdMainContent']/form/div[2]/div[2]/div[1]/div[2]/ul/li[3]")).then(categoryElement => {
                                                            categoryElement.getText().then(category => {
                                                                driver.findElement(By.xpath("//*[@id='rdMainContent']/form/div[2]/div[2]/div[1]/div[1]/ul/li[2]")).then(countryElement => {
                                                                    countryElement.getText().then(countryValue => {
                                                                        driver.findElement(By.xpath("//*[@id='rdMainContent']/form/div[2]/div[2]/div[1]/div[1]/ul/li[3]")).then(cityElement => {
                                                                            cityElement.getText().then(cityValue => {
                                                                                driver.navigate().back().then(() => {
                                                                                    job.JOB_TITLE = title;
                                                                                    if (id) {
                                                                                        var jobId = id.split("ID:");
                                                                                        job.JDTID_UNIQUE_NUMBER = jobId[1].trim();
                                                                                    }
                                                                                    job.TEXT = HtmlEscape(description);
                                                                                    if (category) {
                                                                                        var cate = category.split("Area di responsabilità:");
                                                                                        job.JOB_CATEGORY = cate[1].trim();
                                                                                    }
                                                                                    if (url) {
                                                                                        job.JOB_APPLY_URL = url.replace("/jobDetails.do", "/en-us/jobDetails.do");
                                                                                    }
                                                                                    if (cityValue) {
                                                                                        var city = cityValue.split("Località:");
                                                                                        job.JOB_LOCATION_CITY = city[1].trim();
                                                                                    }
                                                                                    if (countryValue) {
                                                                                        var country = countryValue.split("Paese:");
                                                                                        job.JOB_LOCATION_COUNTRY = country[1].trim();
                                                                                    }
                                                                                    jobMaker.successful.add(job, botScheduleID);
                                                                                    callback(false);
                                                                                }).catch(e => { });

                                                                            }).catch(e => { });
                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                                    }).catch(e => { });
                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });
                                                            }).catch(e => { });
                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });

                                                    }).catch(e => { });
                                                }).catch(e => { });
                                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                                        }).catch(e => { });
                                    }).catch(e => { });
                                }).catch(e => { });
                            }).catch(e => { failedJobCount = failedJobCount + 1 });
                        }).catch(e => { });
                    }
                }).catch(e => { failedJobCount = failedJobCount + 1 });
        }, function (err) {
            if (err) { throw err; }
        });
    }).then(() => {
        driver.findElements(By.xpath('//input[@value=">"]')).then(e => {
            if (e.length == 2) {
                driver.findElement(By.xpath('//input[@value=">"]')).then(nextElement => {
                    nextElement.click().then(() => {
                        forEachTag(driver, By, until, jobs, async);
                    });
                });
            }
        });
    });
}

var snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {

    var snippet = package.resource.download.snippet("writeObjectToFile");
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
}