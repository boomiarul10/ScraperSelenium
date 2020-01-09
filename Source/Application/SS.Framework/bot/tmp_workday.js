var Promise = require('promise');
var package = global.createPackage();

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");
var botScheduleID = "";
jobMaker.setAlertCount(10);

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
    var categoryCount;

    function GetCategoryCount(optionArray) {
        categoryCount = new Array();
        for (var i = 1; i < optionArray.length; i++) {
            categoryCount.push(i);
        }
    }

    driver.get('https://cuna.wd1.myworkdayjobs.com/en-US/CUNAMutualGroup').then(() => {
        driver.sleep(6000).then(() => {
            driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-PaginationText-facetSearchResultList.jobProfile.data"]')).then(e => {
                e.getText().then(atsJobCount => {
                    jobMaker.setatsJobCount(parseInt(atsJobCount.replace(" Results", "")));
                    driver.findElements(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div')).then(categoryElement => {
                        if (categoryElement.length > 1) {
                            GetCategoryCount(categoryElement);
                            driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + categoryElement.length + ']')).then(moreLink => {
                                moreLink.click().then(() => {
                                    async.eachSeries(categoryCount, function (value, categorycallback) {
                                        driver.findElements(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + (value - 1) + ']/div/div/div')).then(categoryElements => {
                                            if (categoryElements.length > 0) {
                                                categoryElements[0].click().then(() => {
                                                    driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/div')).then(categoryElement => {
                                                        categoryElement.click().then(() => {
                                                            driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/label')).then(categoryElement => {
                                                                categoryElement.getAttribute("id").then(categoryTadId => {
                                                                    driver.findElement(By.xpath('//*[@id="' + categoryTadId + '"]')).then(categoryElement => {
                                                                        categoryElement.getText().then(category => {
                                                                            driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li')).then(e => {
                                                                                if (e.length > 0) {
                                                                                    driver.getWindowHandle().then(parentWindow => {
                                                                                        driver.sleep(2000).then(() => {
                                                                                            forEachTag(driver, By, until, jobs, async, categorycallback, category, parentWindow);
                                                                                        });
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    driver.navigate().back().then(() => {
                                                                                        categorycallback();
                                                                                    });
                                                                                }
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            }
                                            else {
                                                driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/div')).then(categoryElement => {
                                                    categoryElement.click().then(() => {
                                                        driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/label')).then(categoryElement => {
                                                            categoryElement.getAttribute("id").then(categoryTadId => {
                                                                driver.findElement(By.xpath('//*[@id="' + categoryTadId + '"]')).then(categoryElement => {
                                                                    categoryElement.getText().then(category => {
                                                                        driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li')).then(e => {
                                                                            if (e.length > 0) {
                                                                                driver.getWindowHandle().then(parentWindow => {
                                                                                    forEachTag(driver, By, until, jobs, async, categorycallback, category, parentWindow);
                                                                                });
                                                                            }
                                                                            else {
                                                                                driver.navigate().back().then(() => {
                                                                                    categorycallback();
                                                                                });
                                                                            }
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    });
                });
            });
        }).then(() => {
            driver.quit();
            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);
        }, err => {
            driver.quit();
            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);
            onfailure(output);
        });
    });

}


function GetCount(jobList) {
    jobCount = new Array();
    for (var i = 1; i <= jobList.length; i++) {
        jobCount.push(i);
    }
}

var forEachTag = (driver, By, until, jobs, async, categorycallback, category, parent) => {


    driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li[' + prime + ']/div/div/div/ul/li/div/div/div')).then(titleElement => {
                titleElement.getText().then(title => {
                    driver.actions().keyDown(webdriver.Key.CONTROL).click(titleElement, webdriver.Button.RIGHT).keyUp(webdriver.Key.CONTROL).perform().then(() => {
                        driver.getAllWindowHandles().then(windows => {
                            driver.switchTo().window(windows[1]).then(() => {
                                driver.findElement(By.xpath('//*[@id="wd-PageContent-vbox"]/div/ul[1]/li/div[2]')).then(locationelement => {
                                    locationelement.getText().then(location => {
                                        driver.findElements(By.xpath('//*[@id="promptOption"]')).then(elements => {
                                            elements[2].getText().then(jobType => {
                                                elements[3].getText().then(jobId => {
                                                    driver.findElement(By.xpath('//*[@id="wd-PageContent-vbox"]/div/ul[1]/li/div[2]')).then(descriptionElement => {
                                                        descriptionElement.getAttribute("innerHTML").then(description => {
                                                            driver.getCurrentUrl().then(url => {
                                                                driver.close().then(() => {
                                                                    driver.switchTo().window(parent).then(() => {
                                                                        driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-PaginationText-facetSearchResultList.jobProfile.data"]')).then(element => {
                                                                            element.click().then(() => {
                                                                                job.JOB_TITLE = title;
                                                                                job.JDTID_UNIQUE_NUMBER = jobId;
                                                                                job.TEXT = description;
                                                                                job.JOB_CATEGORY = category;
                                                                                job.JOB_APPLY_URL = url;
                                                                                if (location) {
                                                                                    var loc = location.split(",");
                                                                                    job.JOB_LOCATION_CITY = loc[0];
                                                                                    job.JOB_LOCATION_STATE = loc[1];
                                                                                }
                                                                                jobMaker.successful.add(job, botScheduleID);
                                                                                callback(false);
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

            });
        }, function (err) {
            if (err) { throw err; }
        });
    }).then(() => {
        categorycallback();
    });
}



var snippet = (configuration, jobs, onsuccess, onfailure) => {

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