package com.javacodegeeks.quartz.Job;

import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.text.SimpleDateFormat;
import java.util.*;
import org.json.*;
import org.quartz.*;
import com.javacodegeeks.quartz.Shared.*;

public class FileWriterJob implements Job {
	Properties prop = new Properties();

	public void execute(JobExecutionContext jobContext) throws JobExecutionException {
		JobDataMap jobData = jobContext.getMergedJobDataMap();
		prop = Utility.GetProperties();
		String fileType = jobData.getString("fileType");
		if (fileType != "Migration") {
			String fileID = jobData.getString("fileID");
			String url = GetURL(fileType, fileID);
			try {
				JSONObject jsonObj = new JSONObject(GetResponse(url));
				String filePath = jsonObj.getString("filepath");
				String fileName = jsonObj.getString("name");
				String content = jsonObj.getString("script");
				filePath = filePath + "/" + fileType.toLowerCase();
				if (fileType.equalsIgnoreCase("Bot")) {
					fileName = jsonObj.getJSONObject("botConfig").getJSONObject("clientDetails").getString("name") + "_" + fileName;
				}
				WriteFile(content, fileName, filePath, fileType);
			} catch (JSONException e) {
				e.printStackTrace();
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	}

	public String GetResponse(String url) {
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

	public String GetURL(String fileType, String fileID) {
		String url = "";
		if (fileType.toString().equalsIgnoreCase("Bot")) {
			String botUrl = prop.getProperty("botUrl");
			url = String.format(botUrl, fileID);
		} else if (fileType.toString().equalsIgnoreCase("Snippet")) {
			String snippetUrl = prop.getProperty("snippetUrl");
			url = String.format(snippetUrl, fileID);
		} else if (fileType.toString().equalsIgnoreCase("Variable")) {
			String varibaleUrl = prop.getProperty("varibaleUrl");
			url = String.format(varibaleUrl, fileID);
		}
		return url;
	}

	public void CreateBackUp(String fileName, String filePath, String fileType) {
		Path source = Paths.get(filePath + "/" + fileName + ".js");
		Date now = new Date();
		SimpleDateFormat dateFormat = new SimpleDateFormat("dd_MM_YYYY_hh_mm_ss");
		String time = dateFormat.format(now);
		File directory = new File(String.valueOf(filePath + "/" + fileType + "_backup/"));
		if (!directory.exists()) {
			directory.mkdirs();
		}
		Path target = Paths.get(filePath + "/" + fileType + "_backup/" + fileName + "_" +time + ".js");
		try {
			Files.copy(source, target);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public void WriteFile(String content, String fileName, String filePath, String fileType) {
		BufferedWriter bw = null;
		FileWriter fw = null;
		try {
			File directory = new File(String.valueOf(filePath));
			if (!directory.exists()) {
				directory.mkdirs();
			}
			File file = new File(filePath + "/" + fileName.toLowerCase() + ".js");
			if (file.exists() && !file.isDirectory()) {
				CreateBackUp(fileName.toLowerCase(), filePath, fileType);
			}
			fw = new FileWriter(file.getAbsoluteFile());
			bw = new BufferedWriter(fw);
			bw.write(content);
			bw.close();
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (bw != null)
					bw.close();
				if (fw != null)
					fw.close();
			} catch (IOException e) {
				e.printStackTrace();
				System.exit(-1);
			}
		}
	}
}