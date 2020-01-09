package com.javacodegeeks.quartz;

import java.util.Properties;
import com.javacodegeeks.quartz.Shared.*;
import org.quartz.*;
import com.javacodegeeks.quartz.Job.BotExecutionJob;

public class BotExecutionBatch {
	static Properties props;

	public static void main(String[] args) throws Exception {
		try {
			JobDetail jobDetail;
			String botExecutionID = args[0];
			props = Utility.GetQuartzProperties();
			props.setProperty("org.quartz.scheduler.instanceName", "BotExecutionScheduler");
			String botExecutionName = "BotExecution";
			SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory(props);
			JobKey jobKey = new JobKey(botExecutionName, "BotExecution");
			Scheduler scheduler = schedFact.getScheduler();
			if (scheduler.getJobDetail(jobKey) != null) {
				jobDetail = scheduler.getJobDetail(jobKey);
			} else {
				JobBuilder jobBuilder = JobBuilder.newJob(BotExecutionJob.class).withDescription("Bot Execution");
				jobDetail = jobBuilder.withIdentity(jobKey).build();
				scheduler.addJob(jobDetail, false);
			}
			JobDataMap data = new JobDataMap();
			data.put("botExecutionID", botExecutionID);
			TriggerKey triggerKey = new TriggerKey("botExecution " + botExecutionID, "BotExecution");
			Trigger trigger = TriggerBuilder.newTrigger().withIdentity(triggerKey).startNow().forJob(jobDetail)
					.withSchedule(SimpleScheduleBuilder.simpleSchedule()).usingJobData(data).build();
			scheduler.scheduleJob(trigger);
			// scheduler.scheduleJob(jobDetail, trigger);
		} catch (Exception ex) {
			ex.printStackTrace();
		} finally {
			System.exit(1);
		}
	}
}