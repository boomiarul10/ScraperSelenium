package com.javacodegeeks.quartz;

import java.util.*;
import org.quartz.*;
import org.quartz.impl.*;
import com.javacodegeeks.quartz.Shared.*;

public class QuartzSchedulerService {
	Properties props;

	public static void main(String[] args) {
		QuartzSchedulerService simple = new QuartzSchedulerService();
		simple.startScheduler();
	}

	public void startScheduler() {
		Scheduler scheduler = null;
		try {
			String[] instances = GetAllInstances();
			for (int i = 0; i < instances.length; i++) {
				props = Utility.GetQuartzProperties();
				props.setProperty("org.quartz.scheduler.instanceName", instances[i]);
				scheduler = new StdSchedulerFactory(props).getScheduler();
				scheduler.start();
			}
		} catch (SchedulerException ex) {
		} finally {
		}
	}

	public String[] GetAllInstances() {
		String hostName = GetHostName();
		return new String[] { "BotExecutionScheduler", "ClientExecutionScheduler", hostName + "_FileWriterScheduler", hostName + "_InteruptBotExecutionScheduler" };
	}
	
	public String GetHostName()
	{
		Properties prop = Utility.GetProperties();
		return prop.getProperty("hostname");
	}
}