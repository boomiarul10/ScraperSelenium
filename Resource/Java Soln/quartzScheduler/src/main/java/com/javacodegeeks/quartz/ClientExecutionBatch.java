package com.javacodegeeks.quartz;

import java.util.*;
import org.quartz.*;
import com.javacodegeeks.quartz.Shared.*;

import com.javacodegeeks.quartz.Job.ClientExecutionJob;

public class ClientExecutionBatch {
	static Properties props;

	public static void main(String[] args) throws Exception {
		try {
			String clientID = args[0];
			boolean isDurable = Boolean.parseBoolean(args[1].toString());
			String ClientName = "Client " + clientID;
			Set<Trigger> triggerList = new HashSet<Trigger>();
			props = Utility.GetQuartzProperties();
			props.setProperty("org.quartz.scheduler.instanceName", "ClientExecutionScheduler");
			SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory(props);
			JobKey jobKey = new JobKey(ClientName, "ClientBotExecution");
			Scheduler scheduler = schedFact.getScheduler();
			if (scheduler.getJobDetail(jobKey) != null) {
				scheduler.deleteJob(jobKey);
			}
			JobBuilder jobBuilder = JobBuilder.newJob(ClientExecutionJob.class)
					.withDescription("BotExecution For Client");
			JobDataMap data = new JobDataMap();
			data.put("clientID", clientID);
			JobDetail jobDetail = jobBuilder.withIdentity(jobKey).usingJobData(data).storeDurably(isDurable).build();

			for (int i = 3; i < args.length; i++) {
				TriggerKey triggerKey = new TriggerKey(ClientName + " Trigger_" + (i - 2), "Client Bot Execution");
				Trigger trigger = TriggerBuilder.newTrigger().withIdentity(triggerKey)
						.withSchedule(CronScheduleBuilder.cronSchedule((args[i])).inTimeZone(TimeZone.getTimeZone("America/New_York"))).build();
				triggerList.add(trigger);
			}
			scheduler.scheduleJob(jobDetail, triggerList, true);
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			System.exit(1);
		}
	}
}