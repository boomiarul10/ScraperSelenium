package com.javacodegeeks.quartz;

import java.util.*;
import org.quartz.*;
import org.quartz.impl.*;
import com.javacodegeeks.quartz.Shared.*;

public class QuartzSchedulerServiceStop {

	Properties props;

	public static void main(String[] args) {
		QuartzSchedulerService simple = new QuartzSchedulerService();
		simple.startScheduler();
	}

	public void startScheduler() {
		Scheduler scheduler = null;
		try {
			String instances = GetHostName() + "_InteruptBotExecutionScheduler";
			props = Utility.GetQuartzProperties();
			props.setProperty("org.quartz.scheduler.instanceName", instances);
			scheduler = new StdSchedulerFactory(props).getScheduler();
			scheduler.start();
		} catch (SchedulerException ex) {
		} finally {
		}
	}

	public String GetHostName() {
		Properties prop = Utility.GetProperties();
		return prop.getProperty("hostname");
	}
}