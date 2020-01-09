package com.javacodegeeks.quartz.Job;

import java.io.*;
import java.net.*;
import java.util.*;
import org.json.*;
import org.quartz.*;
import com.javacodegeeks.quartz.Shared.*;

public class BotExecutionJob implements Job {
	Properties prop = new Properties();
	String botExecutionID = "";
	Process process = null;

	public void execute(JobExecutionContext jobContext) throws JobExecutionException {
		JobDataMap jobData = jobContext.getMergedJobDataMap();
		prop = Utility.GetProperties();
		String botExecutionID = jobData.getString("botExecutionID");
		Utility.UpdateExecutionStatus(botExecutionID, 4);
		Process process = null;
		try {
			Runtime rt = Runtime.getRuntime();
			String executeBotCommand = prop.getProperty("executeBotCommand") + " " + botExecutionID;
			process = rt.exec(executeBotCommand);
			LogExecutionMachine(botExecutionID, 1);
			process.waitFor();
		} catch (InterruptedException e) {
			Utility.UpdateExecutionStatus(botExecutionID, 3);
		} catch (Exception e) {
			Utility.UpdateExecutionStatus(botExecutionID, 3);
		} finally {
			UpdateBatchExecutionStatus(botExecutionID, 3);
			if (process.isAlive())
				process.destroyForcibly();
		}
	}

	public void LogExecutionMachine(String botExecutionID, int processID) {
		try {
			String hostName = prop.getProperty("hostname");
			try {
				JSONObject obj = new JSONObject();
				obj.put("botexecutionid", botExecutionID);
				obj.put("servername", hostName);
				obj.put("processid", processID);
				URL url = new URL(prop.getProperty("serverBotExecutionUpdateUrl"));
				HttpURLConnection conn = (HttpURLConnection) url.openConnection();
				conn.setDoOutput(true);
				conn.setRequestMethod("POST");
				conn.setRequestProperty("Content-Type", "application/json");
				OutputStream os = conn.getOutputStream();
				os.write(obj.toString().getBytes());
				os.flush();
				if (conn.getResponseCode() != 200) {
					throw new RuntimeException("Failed : HTTP error code : " + conn.getResponseCode());
				}
				conn.disconnect();
			} catch (MalformedURLException e) {
				e.printStackTrace();
			} catch (IOException e) {
				e.printStackTrace();
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public String GetHostName() {
		String hostname = System.getenv("HOSTNAME");
		if (hostname == null || hostname.trim().isEmpty()) {
			try {
				Process proc = Runtime.getRuntime().exec("hostname");
				try (InputStream stream = proc.getInputStream()) {
					try (@SuppressWarnings("resource")
					Scanner s = new Scanner(stream).useDelimiter("\\A")) {
						hostname = s.next().replace("(\r\n|\n)", "");
					}
				}
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return hostname;
	}

	public void UpdateBatchExecutionStatus(String botScheduleId, int logtypeid) {
		String url = prop.getProperty("updateBatchExecution");
		try {
			url = String.format(url, botScheduleId);
			JSONObject jsonObj = new JSONObject();
			jsonObj.put("logtypeid", logtypeid);
			URL obj = new URL(url);
			HttpURLConnection con = (HttpURLConnection) obj.openConnection();
			con.setDoOutput(true);
			con.setRequestMethod("POST");
			con.setRequestProperty("Content-Type", "application/json");
			OutputStream os = con.getOutputStream();
			os.write(jsonObj.toString().getBytes());
			os.flush();
			if (con.getResponseCode() != 200) {
				throw new RuntimeException("Failed : HTTP error code : " + con.getResponseCode());
			}
			con.disconnect();
		} catch (IOException | JSONException e) {
			throw new RuntimeException(e.getMessage());
		} catch (Exception e) {
			throw new RuntimeException(e.getMessage());
		}
	}
}
