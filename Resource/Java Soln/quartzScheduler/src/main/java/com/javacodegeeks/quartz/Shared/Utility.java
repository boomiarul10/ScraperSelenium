package com.javacodegeeks.quartz.Shared;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Properties;
import java.util.logging.FileHandler;
import java.util.logging.Logger;
import java.util.logging.SimpleFormatter;

import org.json.JSONException;
import org.json.JSONObject;

public class Utility {
	public static Properties GetProperties() {
		String path = "/opt/selenium/resource/config.properties";
		//String path = "D:/Softwares/java/config.properties";
		Properties props = new Properties();
		try {
			FileInputStream file = new FileInputStream(path);
			try {
				props.load(file);
				file.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		}
		return props;
	}

	public static Properties GetQuartzProperties() {
		///opt/selenium/resource/quartz.properties
		//String path = "D:/Softwares/java/quartz.properties";
		String path = "/opt/selenium/resource/quartz.properties";
		Properties prop = new Properties();
		try {
			FileInputStream file = new FileInputStream(path);
			try {
				prop.load(file);
				file.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		}
		return prop;
	}

	public static void fileLogging(String message) {
		Logger logger = Logger.getLogger("MyLog");
		FileHandler filehandler = null;
		try {
			Properties prop = Utility.GetProperties();
			filehandler = new FileHandler(prop.getProperty("fileLogPath"), true);
			logger.addHandler(filehandler);
			SimpleFormatter formatter = new SimpleFormatter();
			filehandler.setFormatter(formatter);
			logger.info(message);
		} catch (SecurityException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			filehandler.flush();
			filehandler.close();
		}
	}
	
	public static void UpdateExecutionStatus(String botScheduleId, int logtypeid) {
		Properties prop = Utility.GetProperties();
		String url = prop.getProperty("updateBotExecution");
		try {
			url = String.format(url, botScheduleId);
			JSONObject jsonObj = new JSONObject();
			jsonObj.put("logtypeid", logtypeid);
			jsonObj.put("jobcount", 0);
			jsonObj.put("atsjobcount", 0);
			jsonObj.put("failedjobcount", 0);
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
		}
		catch (Exception e) {
			throw new RuntimeException(e.getMessage());
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
			e.printStackTrace();
		}
		return "";
	}
}