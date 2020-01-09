var Promise = require('promise');
var package = global.createPackage();

var selenium = package.scrape.selenium();
var jobMaker = package.resource.download.variable("job");

exports.execute = (configuration) => {
    return new Promise((onsuccess, onfailure) => {
        try {
            var result = core(configuration, onsuccess, onfailure);
        } catch (e) {
            onfailure(e);
        }
    });
}

var core = (configuration, onsuccess, onfailure) => {

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
            driver.findElements(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div')).then(categoryElement => {
                if (categoryElement.length > 1) {
                    GetCategoryCount(categoryElement);
                    driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + categoryElement.length + ']')).then(moreLink => {
                        moreLink.click().then(() => {
                            async.eachSeries(categoryCount, function (value, categorycallback) {
                                driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/div')).then(categoryElement => {
                                    categoryElement.click().then(() => {
                                        driver.findElement(By.xpath('//*[@id="wd-Facet-jobFamilyGroup-wd-FieldSet"]/div[2]/div/div[' + value + ']/div/div/label')).then(categoryElement => {
                                            categoryElement.getAttribute("id").then(categoryTadId => {
                                                driver.findElement(By.xpath('//*[@id="' + categoryTadId + '"]')).then(categoryElement => {
                                                    categoryElement.getText().then(category=> {
                                                        driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li')).then(e => {
                                                            if (e.length > 0) {
                                                                forEachTag(driver, By, until, jobs, async, categorycallback, category);
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
                        });
                    });
                }
            })
                .then(() => {
                    driver.quit();
                    snippet(configuration, jobMaker, onsuccess, onfailure);
                }, err => {
                    driver.quit();
                    onfailure(err);
                });
        });
    });
}


function GetCount(jobList) {
    jobCount = new Array();
    for (var i = 1; i <= jobList.length; i++) {
        jobCount.push(i);
    }
}

var forEachTag = (driver, By, until, jobs, async, categorycallback, category) => {
    driver.findElements(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li')).then(jobList => {
        GetCount(jobList);
        async.eachSeries(jobCount, function (prime, callback) {
            var job = jobMaker.create();
            driver.findElement(By.xpath('//*[@id="wd-FacetedSearchResultList-facetSearchResultList.jobProfile.data"]/div[2]/ul/li[' + prime + ']/div/div/div/ul/li/div/div/div')).then(titleElement => {

                titleElement.getText().then(title=> {
                    console.log(title);
                    driver.actions()
                        .keyDown(webdriver.Key.CONTROL)
                        .click(titleElement)                                           
                        .perform()
                        .then(() => {
                            driver.getCurrentUrl().then(url=> {
                                console.log(url);
                                driver.navigate().back().then(() => {
                                    driver.sleep(3000).then(() => {
                                        callback();
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
        driver.navigate().back().then(() => {
            categorycallback();
        });
    });
}



var snippet = (configuration, jobs, onsuccess, onfailure) => {

    var snippet = package.resource.download.snippet("writeObjectToFile");
    var input = snippet.createInput(configuration, jobs);
    snippet
        .execute(input)
        .then(jobcount => {
            var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount);
            onsuccess(output);
        })
        .catch(err => {
            onfailure(err);
        });
}