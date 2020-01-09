package com.javacodegeeks.quartz.Job;

import java.io.*;
import java.net.*;
import java.util.Properties;
import com.javacodegeeks.quartz.Shared.*;
import org.json.*;
import org.quartz.*;

public class ClientExecutionJob implements Job {
	Properties prop = new Properties();
	public void execute(JobExecutionContext jobContext) throws JobExecutionException {
		prop = Utility.GetProperties();
		JobDataMap jobData = jobContext.getMergedJobDataMap();
		String clientID = jobData.getString("clientID");
		String url = String.format(prop.getProperty("scheduleClientBotExecutionUrl"), clientID);
		try {
			JSONObject jsonObj = new JSONObject();
			jsonObj.put("userdetailid", "1");
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
			e.printStackTrace();
		}
	}
}
