package com.javacodegeeks.quartz.Job;

import java.util.*;

import org.quartz.*;
import com.javacodegeeks.quartz.Shared.*;

public class InteruptBotExecutionJob implements Job {
	Properties prop = new Properties();
	String botExecutionID = "";
	Process process = null;

	public void execute(JobExecutionContext jobContext) throws JobExecutionException {
		try {
			JobDataMap jobData = jobContext.getMergedJobDataMap();
			prop = Utility.GetProperties();
			String botExecutionID = jobData.getString("botExecutionID");
			String processID = jobData.getString("processID");
			StopExecutionProcess(processID);
			Utility.UpdateExecutionStatus(botExecutionID, 5);
		} catch (Exception e) {
			e.printStackTrace();
		} finally {

		}
	}

	public void StopExecutionProcess(String processID) {
		Process process = null;
		try {
			String operatingSystem = System.getProperty("os.name");
			String cmd = "";
			if (operatingSystem.toLowerCase().contains("window")) {
				cmd = "taskkill /F /PID ";
			} else {
				cmd = "sudo kill -9 ";
			}
			cmd = cmd + processID;
			Runtime rt = Runtime.getRuntime();
			process = rt.exec(cmd);
			process.waitFor();
		} catch (InterruptedException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			if (process.isAlive())
				process.destroyForcibly();
		}
	}
}