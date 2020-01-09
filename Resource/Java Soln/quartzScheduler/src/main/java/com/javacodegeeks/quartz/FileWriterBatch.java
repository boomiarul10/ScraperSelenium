package com.javacodegeeks.quartz;

import java.io.*;
import java.net.*;
import java.util.*;
import org.json.*;
import org.quartz.*;
import com.javacodegeeks.quartz.Shared.*;

import com.javacodegeeks.quartz.Job.FileWriterJob;

public class FileWriterBatch {
	static Properties props;
	static String hostName;

	public static void main(String[] args) throws Exception {
		try {
			GetHostName();
			String fileType = args[0];
			String fileName = "";
			String fileID = "";
			JobDetail jobDetail;
			boolean isDurable = false;
			if (fileType != "Migration") {
				fileID = args[1];
				isDurable = Boolean.parseBoolean(args[2].toString());
				fileName = fileType + " " + fileID;
			} else {
				isDurable = Boolean.parseBoolean(args[1].toString());
			}
			JobKey jobKey = new JobKey("FileWriter", "FileWriterExecution");
			JSONArray jsonval = new JSONArray(GetResponse(GetURL()));
			for (int i = 0; i < jsonval.length(); i++) {
				String hostname = jsonval.getJSONObject(i).getString("name");
				props = Utility.GetQuartzProperties();

				props.setProperty("org.quartz.scheduler.instanceName", hostname + "_FileWriterScheduler");
				SchedulerFactory schedFact = new org.quartz.impl.StdSchedulerFactory(props);
				Scheduler scheduler = schedFact.getScheduler();

				if (scheduler.getJobDetail(jobKey) != null) {
					jobDetail = scheduler.getJobDetail(jobKey);
				} else {
					JobBuilder jobBuilder = JobBuilder.newJob(FileWriterJob.class).withDescription("FileWriter");
					jobDetail = jobBuilder.withIdentity(jobKey).storeDurably(isDurable).build();
					scheduler.addJob(jobDetail, false);
				}
				JobDataMap data = new JobDataMap();
				data.put("fileType", fileType);
				data.put("fileID", fileID);
				TriggerKey triggerKey = new TriggerKey(fileName + " Trigger", "FileWriterExecution");
				Trigger trigger = TriggerBuilder.newTrigger().withIdentity(triggerKey).startNow().usingJobData(data)
						.withSchedule(SimpleScheduleBuilder.simpleSchedule()).forJob(jobDetail).build();
				scheduler.scheduleJob(trigger);
			}

		} catch (JSONException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			System.exit(1);
		}
	}

	public static String GetResponse(String url) {
		try {
			URL obj = new URL(url);
			HttpURLConnection con = (HttpURLConnection) obj.openConnection();
			con.setRequestMethod("GET");
			con.setRequestProperty("Content-Type", "application/json");
			int responseCode = con.getResponseCode();
			System.out.println("\nSending 'GET' request to URL : " + url);
			System.out.println("Response Code : " + responseCode);
			BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
			String inputLine;
			StringBuffer response = new StringBuffer();
			while ((inputLine = in.readLine()) != null) {
				response.append(inputLine);
			}
			in.close();
			return response.toString();
		} catch (Exception e) {

		}
		return "";
	}

	public static void GetHostName() {
		try {
			String OS = System.getProperty("os.name").toLowerCase();

			if (OS.indexOf("win") >= 0) {
				hostName = System.getenv("COMPUTERNAME");
			} else {
				if (OS.indexOf("nix") >= 0 || OS.indexOf("nux") >= 0) {
					hostName = System.getenv("HOSTNAME");
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static String GetURL() {

		String url = "";
		try {
			Properties props = Utility.GetProperties();
			url = props.getProperty("batchServerURL");
		} catch (Exception e) {
			
		}
		return url;
	}
}