package com.javacodegeeks.quartz;

import java.util.Properties;

import com.javacodegeeks.quartz.Shared.Utility;

public class QuartzSchedulerConfigurationExample {
	public static void main(String[] args) {
		UpdateExecutionStatus("1", 1);
	}

	public static void UpdateExecutionStatus(String botScheduleId, int logtypeid) {
		Properties prop = Utility.GetProperties();
		String url = String.format(prop.getProperty("checkBotExecutionStarted"), botScheduleId);
		try {
			String val = Utility.GetResponse(url);
			if (val.equals("null")) {
				
			}
		} catch (Exception e) {
			throw new RuntimeException("Error in checking the Status" + e.getMessage());
		}
	}
}