package com.javacodegeeks.quartz;

import java.util.Properties;

import org.json.JSONObject;
import org.quartz.JobBuilder;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SchedulerFactory;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.quartz.TriggerKey;
import com.javacodegeeks.quartz.Job.InteruptBotExecutionJob;
import com.javacodegeeks.quartz.Shared.Utility;

public class InteruptBotExecutionBatch {
	static Properties props;

	public static void main(String[] args) throws Exception {
		try {

			String hostname = "";
			String processID = "";
			String botExecutionID = args[1];
			RemoveTrigger(botExecutionID);
			if (Boolean.parseBoolean(args[0])) {
				hostname = args[2];
				processID = args[3];
			} else {
				String url = String.format(Utility.GetProperties().getProperty("checkBotExecutionStarted"),
						botExecutionID);
				String val = Utility.GetResponse(url);
				if (!val.equals("null")) {
					JSONObject jsonObj = new JSONObject(Utility.GetResponse(url));
					processID = jsonObj.getString("processid");
					hostname = jsonObj.getString("servername");
				} else {
					Utility.UpdateExecutionStatus(botExecutionID, 5);
				}
			}

			if (!hostname.equals("")) {
				StopProcess(hostname, processID, botExecutionID);
			}

		} catch (Exception ex) {
			ex.printStackTrace();
		} finally {
			System.exit(1);
		}
	}

	public static void RemoveTrigger(String botExecutionID) {
		Properties prop = Utility.GetQuartzProperties();
		prop.setProperty("org.quartz.scheduler.instanceName", "BotExecutionScheduler");
		try {
			SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory(prop);
			Scheduler scheduler = schedFact.getScheduler();
			scheduler.unscheduleJob(new TriggerKey("botExecution " + botExecutionID, "BotExecution"));
		} catch (SchedulerException e) {
			e.printStackTrace();
		}
	}

	public static void StopProcess(String hostname, String processID, String botExecutionID) {
		JobDetail jobDetail;
		try {
			props = Utility.GetQuartzProperties();
			props.setProperty("org.quartz.scheduler.instanceName", hostname + "_InteruptBotExecutionScheduler");
			String jobName = "InteruptBotExecution";
			SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory(props);
			JobKey jobKey = new JobKey(jobName, hostname + "_InteruptBotExecution");

			Scheduler scheduler = schedFact.getScheduler();
			if (scheduler.getJobDetail(jobKey) != null) {
				jobDetail = scheduler.getJobDetail(jobKey);
			} else {
				JobBuilder jobBuilder = JobBuilder.newJob(InteruptBotExecutionJob.class)
						.withDescription("InteruptBotExecution");
				jobDetail = jobBuilder.withIdentity(jobKey).storeDurably(true).build();
				scheduler.addJob(jobDetail, false);
			}
			JobDataMap data = new JobDataMap();
			data.put("botExecutionID", botExecutionID);
			data.put("processID", processID);
			TriggerKey triggerKey = new TriggerKey(jobName + botExecutionID, "BotExecution");
			Trigger trigger = TriggerBuilder.newTrigger().withIdentity(triggerKey).startNow().forJob(jobDetail)
					.withSchedule(SimpleScheduleBuilder.simpleSchedule()).usingJobData(data).build();
			scheduler.scheduleJob(trigger);
		} catch (Exception e) {
			throw new RuntimeException(e.getMessage());
		}
	}
}