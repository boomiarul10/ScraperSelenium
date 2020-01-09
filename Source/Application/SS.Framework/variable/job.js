exports.create = () => {
    return new jobviper();
}
var service = require(global.file.service);
var resource = require(global.file.resource);
var jobs = new Array();
var failedJobs = new Array();
var atsJobCount = 0;
var alertCount = 40;

function jobviper() {
    this.JDTID_UNIQUE_NUMBER = "";
    this.ASSIGNMENT_START_DATE = "";
    this.OTHER_LOCATIONS = "";
    this.OTHER_CATEGORIEs = "";
    this.COMPANY_URL = "";
    this.EDUCATION = "";
    this.EMAIL_FOR_RESUMES = "";
    this.JOB_APPLY_URL = "";
    this.JOB_APPLY_URL_LIST = "";
    this.JOB_APPLY_URL_NAMES = "";
    this.JOB_CATEGORY = "";
    this.JOB_CONTACT_COMPANY = "";
    this.JOB_CONTACT_CITY = "";
    this.JOB_CONTACT_COUNTRY = "";
    this.JOB_CONTACT_FAMILYNAME = "";
    this.JOB_CONTACT_FAX = "";
    this.JOB_CONTACT_GIVENNAME = "";
    this.JOB_CONTACT_NAME = "";
    this.JOB_CONTACT_PHONE = "";
    this.JOB_CONTACT_STATE = "";
    this.JOB_CONTACT_ZIP = "";
    this.JOB_INDUSTRY = "";
    this.JOB_LOCATION_COUNTRY = "";
    this.JOB_LOCATION_CITY = "";
    this.JOB_LOCATION_STATE = "";
    this.JOB_LOCATION_ZIP = "";
    this.JOB_CONTACT_ADDRESS = "";
    this.JOB_SALARY = "";
    this.JOB_SALARY_FROM = "";
    this.JOB_SALARY_TO = "";
    this.JOB_SHOW_CONTACT = "";
    this.JOB_STATUS = "";
    this.JOB_TITLE = "";
    this.JOB_TYPE = "";
    this.NOTES_FOR_INVOICE = "";
    this.NUMBER_TO_FILL = "";
    this.PO_NUMBER = "";
    this.QUALIFICATIONS = "";
    this.RELOCATION = "";
    this.SALARYTIME = "";
    this.TEXT = "";
    this.TRAVEL = "";
}

exports.failed = {
    add: (jobid, err) => {
        this.failedJobs.push({
            jobid: jobid,
            error: err
        });
    }
}

exports.successful = {
    add: (job, botScheduleID) => {
        var data = { "VIPER_JOB": job };
        this.jobs.push(data);

        if (this.jobs.length % this.alertCount == 0 && this.jobs.length < this.atsJobCount)
            service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.inprogress, this.jobs.length, this.atsJobCount, this.failedJobs.length)
                .then((data) => {
                });
    }
}

exports.setAlertCount = function (value) {
    this.alertCount = value;
}

exports.setatsJobCount = function (value) {
    this.atsJobCount = value;
}

exports.jobs = jobs;
exports.failedJobs = failedJobs;
exports.atsJobCount = atsJobCount;
