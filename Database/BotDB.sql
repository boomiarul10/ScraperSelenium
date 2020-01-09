--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.2
-- Dumped by pg_dump version 9.6.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: getschedule(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getschedule(client_id text) RETURNS TABLE(crontriggers character varying)
    LANGUAGE plpgsql
    AS $$

Begin
return query
select 
cron_expression from qrtz_cron_triggers
where 
trigger_name like client_Id;
end;

$$;


ALTER FUNCTION public.getschedule(client_id text) OWNER TO postgres;

--
-- Name: getschedulehistory(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getschedulehistory(max_result integer, schedule_id integer) RETURNS TABLE(botexecutionid integer, statusname text, userid integer, botid integer, botname text, jobcount bigint, failedjobcount integer, createddate timestamp with time zone, updateddate timestamp with time zone)
    LANGUAGE plpgsql
    AS $$

Begin
return query
select be.id,
es.name,
sce.userdetailid,
be.botconfigid,
bc.name,
be.jobcount,
be.failedjobcount,
sce.updated_at,
be.updated_at
from scheduleexecution sce
join botexecution be on sce.id = be.scheduleexecutionid
join botexecutionstatus es on be.botexecutionstatusid = es.id
join botconfiguration bc on be.botconfigid = bc.id
where sce.id = schedule_id
order by sce.updated_at desc
limit max_result;
end;

$$;


ALTER FUNCTION public.getschedulehistory(max_result integer, schedule_id integer) OWNER TO postgres;

--
-- Name: getschedulestatus(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getschedulestatus(client_id integer) RETURNS TABLE(id integer, startdate timestamp with time zone, enddate timestamp with time zone, jobcount bigint, scrapestatus integer, scheduled integer)
    LANGUAGE plpgsql
    AS $$
begin
return query
select se.Id , 
MIN(be.created_at) , 
MAX(be.updated_at) , 
CAST (SUM(be.jobcount) as bigint) ,  
max(be.botexecutionstatusid) ,
min(be.userdetailid)
from scheduleexecution se
join botexecution be 
on se.Id = be.scheduleexecutionid
where se.clientId = client_id
group by se.Id;
end;
$$;


ALTER FUNCTION public.getschedulestatus(client_id integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: batchserverdetails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE batchserverdetails (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE batchserverdetails OWNER TO postgres;

--
-- Name: batchserverdetails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE batchserverdetails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE batchserverdetails_id_seq OWNER TO postgres;

--
-- Name: batchserverdetails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE batchserverdetails_id_seq OWNED BY batchserverdetails.id;


--
-- Name: botconfiguration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE botconfiguration (
    id integer NOT NULL,
    userdetailid integer NOT NULL,
    name text NOT NULL,
    browsertype text NOT NULL,
    outputpath text NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    isdeleted boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE botconfiguration OWNER TO postgres;

--
-- Name: botconfig_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE botconfig_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE botconfig_id_seq OWNER TO postgres;

--
-- Name: botconfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE botconfig_id_seq OWNED BY botconfiguration.id;


--
-- Name: botexecution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE botexecution (
    id integer NOT NULL,
    userdetailid integer NOT NULL,
    botconfigid integer NOT NULL,
    botexecutionstatusid integer NOT NULL,
    scheduleexecutionid integer NOT NULL,
    jobcount bigint,
    isretry boolean,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    atsjobcount integer,
    failedjobcount integer
);


ALTER TABLE botexecution OWNER TO postgres;

--
-- Name: botexecution_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE botexecution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE botexecution_id_seq OWNER TO postgres;

--
-- Name: botexecution_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE botexecution_id_seq OWNED BY botexecution.id;


--
-- Name: botexecutionserverdetails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE botexecutionserverdetails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE botexecutionserverdetails_id_seq OWNER TO postgres;

--
-- Name: botexecutionserverdetails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE botexecutionserverdetails (
    id integer DEFAULT nextval('botexecutionserverdetails_id_seq'::regclass) NOT NULL,
    botexecutionid integer,
    servername text,
    updated_at timestamp with time zone,
    created_at timestamp with time zone
);


ALTER TABLE botexecutionserverdetails OWNER TO postgres;

--
-- Name: botexecutionstatus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE botexecutionstatus (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE botexecutionstatus OWNER TO postgres;

--
-- Name: botexecutionstatus_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE botexecutionstatus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE botexecutionstatus_id_seq OWNER TO postgres;

--
-- Name: botexecutionstatus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE botexecutionstatus_id_seq OWNED BY botexecutionstatus.id;


--
-- Name: bothistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE bothistory (
    id integer NOT NULL,
    botconfigid integer NOT NULL,
    browsertype text NOT NULL,
    outputpath text NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE bothistory OWNER TO postgres;

--
-- Name: bothistory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE bothistory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE bothistory_id_seq OWNER TO postgres;

--
-- Name: bothistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE bothistory_id_seq OWNED BY bothistory.id;


--
-- Name: client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE client (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    retry integer,
    intreval integer,
    isconcurrent boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE client OWNER TO postgres;

--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE client_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE client_id_seq OWNER TO postgres;

--
-- Name: client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE client_id_seq OWNED BY client.id;


--
-- Name: clientbotconfiguration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE clientbotconfiguration (
    id integer NOT NULL,
    botconfigid integer NOT NULL,
    clientid integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE clientbotconfiguration OWNER TO postgres;

--
-- Name: clientbotconfig_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE clientbotconfig_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE clientbotconfig_id_seq OWNER TO postgres;

--
-- Name: clientbotconfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE clientbotconfig_id_seq OWNED BY clientbotconfiguration.id;


--
-- Name: executionlogs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE executionlogs (
    id integer NOT NULL,
    botexecutionid integer NOT NULL,
    logtypeid integer NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE executionlogs OWNER TO postgres;

--
-- Name: executionlogs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE executionlogs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE executionlogs_id_seq OWNER TO postgres;

--
-- Name: executionlogs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE executionlogs_id_seq OWNED BY executionlogs.id;


--
-- Name: logtype; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE logtype (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE logtype OWNER TO postgres;

--
-- Name: logtype_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE logtype_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE logtype_id_seq OWNER TO postgres;

--
-- Name: logtype_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE logtype_id_seq OWNED BY logtype.id;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE packages (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    filepath text NOT NULL
);


ALTER TABLE packages OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE packages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE packages_id_seq OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE packages_id_seq OWNED BY packages.id;


--
-- Name: qrtz_blob_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_blob_triggers (
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    blob_data text,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_blob_triggers OWNER TO postgres;

--
-- Name: qrtz_calendars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_calendars (
    calendar_name character varying(80) NOT NULL,
    calendar text NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_calendars OWNER TO postgres;

--
-- Name: qrtz_cron_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_cron_triggers (
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    cron_expression character varying(80) NOT NULL,
    time_zone_id character varying(80),
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_cron_triggers OWNER TO postgres;

--
-- Name: qrtz_fired_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_fired_triggers (
    entry_id character varying(95) NOT NULL,
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    instance_name character varying(80) NOT NULL,
    fired_time bigint NOT NULL,
    priority integer NOT NULL,
    state character varying(16) NOT NULL,
    job_name character varying(80),
    job_group character varying(80),
    is_nonconcurrent boolean,
    is_update_data boolean,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL,
    sched_time bigint NOT NULL,
    requests_recovery boolean
);


ALTER TABLE qrtz_fired_triggers OWNER TO postgres;

--
-- Name: qrtz_job_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_job_details (
    job_name character varying(128) NOT NULL,
    job_group character varying(80) NOT NULL,
    description character varying(120),
    job_class_name character varying(200) NOT NULL,
    is_durable boolean,
    is_nonconcurrent boolean,
    is_update_data boolean,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL,
    requests_recovery boolean,
    job_data bytea
);


ALTER TABLE qrtz_job_details OWNER TO postgres;

--
-- Name: qrtz_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_locks (
    lock_name character varying(40) NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_locks OWNER TO postgres;

--
-- Name: qrtz_paused_trigger_grps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_paused_trigger_grps (
    trigger_group character varying(80) NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_paused_trigger_grps OWNER TO postgres;

--
-- Name: qrtz_scheduler_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_scheduler_state (
    instance_name character varying(200) NOT NULL,
    last_checkin_time bigint,
    checkin_interval bigint,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_scheduler_state OWNER TO postgres;

--
-- Name: qrtz_simple_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_simple_triggers (
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    repeat_count bigint NOT NULL,
    repeat_interval bigint NOT NULL,
    times_triggered bigint NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_simple_triggers OWNER TO postgres;

--
-- Name: qrtz_simprop_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_simprop_triggers (
    sched_name character varying(120) NOT NULL,
    trigger_name character varying(200) NOT NULL,
    trigger_group character varying(200) NOT NULL,
    str_prop_1 character varying(512),
    str_prop_2 character varying(512),
    str_prop_3 character varying(512),
    int_prop_1 integer,
    int_prop_2 integer,
    long_prop_1 bigint,
    long_prop_2 bigint,
    dec_prop_1 numeric(13,4),
    dec_prop_2 numeric(13,4),
    bool_prop_1 boolean,
    bool_prop_2 boolean
);


ALTER TABLE qrtz_simprop_triggers OWNER TO postgres;

--
-- Name: qrtz_triggers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE qrtz_triggers (
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    job_name character varying(80) NOT NULL,
    job_group character varying(80) NOT NULL,
    description character varying(120),
    next_fire_time bigint,
    prev_fire_time bigint,
    priority integer,
    trigger_state character varying(16) NOT NULL,
    trigger_type character varying(8) NOT NULL,
    start_time bigint NOT NULL,
    end_time bigint,
    calendar_name character varying(80),
    misfire_instr smallint,
    job_data bytea,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_triggers OWNER TO postgres;

--
-- Name: scheduleexecution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE scheduleexecution (
    id integer NOT NULL,
    userdetailid integer NOT NULL,
    clientid integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE scheduleexecution OWNER TO postgres;

--
-- Name: scheduleexecution_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE scheduleexecution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE scheduleexecution_id_seq OWNER TO postgres;

--
-- Name: scheduleexecution_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE scheduleexecution_id_seq OWNED BY scheduleexecution.id;


--
-- Name: snippet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE snippet (
    id integer NOT NULL,
    userdetailid integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    description text
);


ALTER TABLE snippet OWNER TO postgres;

--
-- Name: snippet_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE snippet_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE snippet_id_seq OWNER TO postgres;

--
-- Name: snippet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE snippet_id_seq OWNED BY snippet.id;


--
-- Name: snippethistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE snippethistory (
    id integer NOT NULL,
    snippetid integer NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE snippethistory OWNER TO postgres;

--
-- Name: snippethistory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE snippethistory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE snippethistory_id_seq OWNER TO postgres;

--
-- Name: snippethistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE snippethistory_id_seq OWNED BY snippethistory.id;


--
-- Name: userdetail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE userdetail (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE userdetail OWNER TO postgres;

--
-- Name: userdetail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE userdetail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE userdetail_id_seq OWNER TO postgres;

--
-- Name: userdetail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE userdetail_id_seq OWNED BY userdetail.id;


--
-- Name: variabletype; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE variabletype (
    id integer NOT NULL,
    userdetailid integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    isdeleted boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE variabletype OWNER TO postgres;

--
-- Name: variabletype_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE variabletype_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variabletype_id_seq OWNER TO postgres;

--
-- Name: variabletype_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE variabletype_id_seq OWNED BY variabletype.id;


--
-- Name: variabletypehistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE variabletypehistory (
    id integer NOT NULL,
    variabletypeid integer NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE variabletypehistory OWNER TO postgres;

--
-- Name: variabletypehistory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE variabletypehistory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE variabletypehistory_id_seq OWNER TO postgres;

--
-- Name: variabletypehistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE variabletypehistory_id_seq OWNED BY variabletypehistory.id;


--
-- Name: batchserverdetails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY batchserverdetails ALTER COLUMN id SET DEFAULT nextval('batchserverdetails_id_seq'::regclass);


--
-- Name: botconfiguration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botconfiguration ALTER COLUMN id SET DEFAULT nextval('botconfig_id_seq'::regclass);


--
-- Name: botexecution id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution ALTER COLUMN id SET DEFAULT nextval('botexecution_id_seq'::regclass);


--
-- Name: botexecutionstatus id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionstatus ALTER COLUMN id SET DEFAULT nextval('botexecutionstatus_id_seq'::regclass);


--
-- Name: bothistory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bothistory ALTER COLUMN id SET DEFAULT nextval('bothistory_id_seq'::regclass);


--
-- Name: client id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY client ALTER COLUMN id SET DEFAULT nextval('client_id_seq'::regclass);


--
-- Name: clientbotconfiguration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration ALTER COLUMN id SET DEFAULT nextval('clientbotconfig_id_seq'::regclass);


--
-- Name: executionlogs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs ALTER COLUMN id SET DEFAULT nextval('executionlogs_id_seq'::regclass);


--
-- Name: logtype id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY logtype ALTER COLUMN id SET DEFAULT nextval('logtype_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY packages ALTER COLUMN id SET DEFAULT nextval('packages_id_seq'::regclass);


--
-- Name: scheduleexecution id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution ALTER COLUMN id SET DEFAULT nextval('scheduleexecution_id_seq'::regclass);


--
-- Name: snippet id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippet ALTER COLUMN id SET DEFAULT nextval('snippet_id_seq'::regclass);


--
-- Name: snippethistory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippethistory ALTER COLUMN id SET DEFAULT nextval('snippethistory_id_seq'::regclass);


--
-- Name: userdetail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userdetail ALTER COLUMN id SET DEFAULT nextval('userdetail_id_seq'::regclass);


--
-- Name: variabletype id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletype ALTER COLUMN id SET DEFAULT nextval('variabletype_id_seq'::regclass);


--
-- Name: variabletypehistory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletypehistory ALTER COLUMN id SET DEFAULT nextval('variabletypehistory_id_seq'::regclass);


--
-- Data for Name: batchserverdetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY batchserverdetails (id, name, active, created_at, updated_at) FROM stdin;
1	B2ML17376	t	\N	\N
2	B2ML18272	f	\N	\N
\.


--
-- Name: batchserverdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('batchserverdetails_id_seq', 1, false);


--
-- Name: botconfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botconfig_id_seq', 18, true);


--
-- Data for Name: botconfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botconfiguration (id, userdetailid, name, browsertype, outputpath, active, script, filepath, isdeleted, created_at, updated_at) FROM stdin;
1	1	sample	Firefox	D:/	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\n\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            onfailure(e);\r\n        }\r\n    });\r\n}\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver("chrome");\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var locationCount;\r\n\r\n    function GetLocationCount(optionArray) {\r\n        locationCount = new Array();\r\n        for (var i = 2; i <= optionArray.length; i++) {\r\n            locationCount.push(i);\r\n        }\r\n    }\r\n\r\n    driver.get('http://careers.peopleclick.com/careerscp/client_wakemed/external/search.do?functionName=getSearchCriteria');\r\n    driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]')).then(locationElement => {\r\n        locationElement.findElements(By.tagName('option')).then(optionArray => {\r\n            if (optionArray.length > 1) {\r\n                GetLocationCount(optionArray);\r\n                async.eachSeries(locationCount, function (value, thecallback) {\r\n                    driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + value + ']')).then(option => {\r\n                        option.getAttribute('text').then(optionValue => {\r\n                            var locationValue = optionValue;\r\n                            option.click().then(() => {\r\n                                var removeOption = value - 1;\r\n                                driver.findElement(By.xpath('//*[@id="com.peopleclick.cp.formdata.JPM_LOCATION"]/Option[' + removeOption + ']')).then(optionAll => {\r\n                                    optionAll.click().then(() => {\r\n                                        driver.findElement(By.xpath('//input[@id="searchButton"]')).then(searchelement => {\r\n                                            searchelement.click().then(() => {\r\n                                                driver.findElements(By.xpath('//table[@id="searchResultsTable"]/tbody')).then(e => {\r\n                                                    return !!e.length;\r\n                                                }).then(data => {\r\n                                                    if (data == true) {\r\n                                                        new Promise((onsuccess, onfailure) => {\r\n                                                            try {\r\n                                                                forEachTag(driver, By, until, jobs, async, thecallback, locationValue);\r\n                                                            } catch (e) {\r\n                                                                onfailure(e);\r\n                                                            }\r\n                                                        }).then(() => {\r\n                                                            thecallback();\r\n                                                        });\r\n                                                    }\r\n                                                    else {\r\n                                                        driver.findElement(By.xpath('//span/a[@id="searchCriteriaLink"]')).then(searchELement => {\r\n                                                            searchELement.click().then(() => {\r\n                                                                thecallback();\r\n                                                            });\r\n                                                        });\r\n                                                    }\r\n                                                });\r\n                                            });\r\n                                        });\r\n                                    });\r\n                                });\r\n                            });\r\n                        });\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            onfailure(err);\r\n        });\r\n}\r\n\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 2; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async, thecallback, locationValue) => {\r\n    driver.findElements(By.xpath('//table[@id="searchResultsTable"]/tbody/tr')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver\r\n                .findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td/a'))\r\n                .then(titleElement => {\r\n                    if (titleElement != null) {\r\n                        titleElement.getText().then(title => {\r\n                            driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[@class="pc-rtg-tableItem"][2]')).then(jobIDElement => {\r\n                                jobIDElement.getText().then(id => {\r\n                                    driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[@class="pc-rtg-tableItem"][4]')).then(dateElement => {\r\n                                        dateElement.getText().then(date => {\r\n                                            driver.findElement(By.xpath('//table[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td/a')).then(urlElement => {\r\n                                                urlElement.getAttribute("href").then(url => {\r\n                                                    titleElement.click().then(() => {\r\n                                                        driver.findElements(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(elements => {\r\n                                                            if (elements.length > 0) {\r\n                                                                driver.findElement(By.xpath("//div[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(descriptionElement => {\r\n                                                                    descriptionElement.getAttribute("innerHTML").then(description => {\r\n                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span")).then(categoryElement => {\r\n                                                                            categoryElement.getText().then(category => {\r\n                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[1]/td[2]/font/span")).then(element => {\r\n                                                                                    element.getText().then(contactcompany => {\r\n                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]/font/span")).then(element => {\r\n                                                                                            element.getText().then(salary => {\r\n                                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]/font/span")).then(element => {\r\n                                                                                                    element.getText().then(status => {\r\n                                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[2]/font/span")).then(element => {\r\n                                                                                                            element.getText().then(industry => {\r\n                                                                                                                driver.findElement(By.xpath('//*[@id="searchResultLink"]')).then(element => {\r\n                                                                                                                    element.click().then(() => {\r\n                                                                                                                        job.title = title;\r\n                                                                                                                        job.id = id;\r\n                                                                                                                        job.description = description;\r\n                                                                                                                        job.posteddate = date;\r\n                                                                                                                        job.category = category;\r\n                                                                                                                        job.contactcompany = contactcompany;\r\n                                                                                                                        job.salary = salary;\r\n                                                                                                                        job.status = status;\r\n                                                                                                                        job.industry = industry;\r\n                                                                                                                        job.applyurl = url;\r\n                                                                                                                        if (locationValue) {\r\n                                                                                                                            var loc = locationValue.split(",");\r\n                                                                                                                            job.city = loc[0];\r\n                                                                                                                            var state = loc[1].split("(");\r\n                                                                                                                            job.state = state[0].trim();\r\n                                                                                                                        }\r\n                                                                                                                        jobMaker.successful.add(job);\r\n                                                                                                                        callback(false);\r\n                                                                                                                    }).catch(e => { });\r\n                                                                                                                }).catch(e => { });\r\n                                                                                                            }).catch(e => { });\r\n                                                                                                        }).catch(e => { });\r\n                                                                                                    }).catch(e => { });\r\n                                                                                                }).catch(e => { });\r\n                                                                                            }).catch(e => { });\r\n                                                                                        }).catch(e => { });\r\n                                                                                    }).catch(e => { });\r\n                                                                                });\r\n                                                                            }).catch(e => { });\r\n                                                                        }).catch(e => { });\r\n                                                                    }).catch(e => { });\r\n                                                                }).catch(e => { });\r\n                                                            }\r\n                                                            else {\r\n                                                                driver.findElement(By.xpath('//*[@id="searchResultLink"]')).then(element => {\r\n                                                                    element.click().then(() => {\r\n                                                                        callback();\r\n                                                                    });\r\n                                                                });\r\n                                                            }\r\n                                                        }).catch(e => { });\r\n                                                    }).catch(e => { });\r\n                                                }).catch(e => { });\r\n                                            }).catch(e => { });\r\n                                        }).catch(e => { });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { });\r\n                    }\r\n                });\r\n        }, function (err) {\r\n            if (err) { throw err; }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.xpath('//input[@value=">"]')).then(e => {\r\n            if (e.length == 2) {\r\n                driver.findElement(By.xpath('//input[@value=">"]')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async, thecallback);\r\n                    });\r\n                });\r\n            }\r\n            else {\r\n                driver.findElement(By.xpath('//span/a[@id="searchCriteriaLink"]')).then(searchELement => {\r\n                    searchELement.click().then(() => {\r\n                        var x = 1;\r\n                        thecallback();\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\n\r\n\r\nvar snippet = (configuration, jobs, onsuccess, onfailure) => {\r\n\r\n    var snippet = package.resource.download.snippet("writeObjectToFile");\r\n    var input = snippet.createInput(configuration, jobs);\r\n    snippet\r\n        .execute(input)\r\n        .then(jobcount => {\r\n            var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount);\r\n            onsuccess(output);\r\n        })\r\n        .catch(err => {\r\n            onfailure(err);\r\n        });\r\n}\r\n\r\n\r\n	D:\\ProjectSolution\\TmpStash\\selenium-scraper\\Source\\Application\\SS.Framework\\bot	f	2017-03-09 21:30:24.579+05:30	2017-03-10 20:35:40.632+05:30
\.


--
-- Data for Name: botexecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecution (id, userdetailid, botconfigid, botexecutionstatusid, scheduleexecutionid, jobcount, isretry, created_at, updated_at, atsjobcount, failedjobcount) FROM stdin;
1	1	1	1	1	0	f	2017-03-10 20:33:08.471+05:30	2017-03-15 14:30:07.495+05:30	\N	\N
\.


--
-- Name: botexecution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexecution_id_seq', 42, true);


--
-- Data for Name: botexecutionserverdetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecutionserverdetails (id, botexecutionid, servername, updated_at, created_at) FROM stdin;
\.


--
-- Name: botexecutionserverdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexecutionserverdetails_id_seq', 15, true);


--
-- Data for Name: botexecutionstatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecutionstatus (id, name, created_at, updated_at) FROM stdin;
3	Failed	\N	\N
4	In Progress	\N	\N
2	Not Started	\N	\N
1	Completed	\N	\N
\.


--
-- Name: botexecutionstatus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexecutionstatus_id_seq', 5, true);


--
-- Data for Name: bothistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY bothistory (id, botconfigid, browsertype, outputpath, active, script, filepath, message, created_at, updated_at) FROM stdin;
\.


--
-- Name: bothistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('bothistory_id_seq', 14, true);


--
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY client (id, name, active, retry, intreval, isconcurrent, created_at, updated_at) FROM stdin;
6	TMP	t	\N	\N	t	2017-02-10 12:21:29.448+05:30	2017-02-10 12:21:29.448+05:30
\.


--
-- Name: client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('client_id_seq', 10, true);


--
-- Name: clientbotconfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('clientbotconfig_id_seq', 14, true);


--
-- Data for Name: clientbotconfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY clientbotconfiguration (id, botconfigid, clientid, created_at, updated_at) FROM stdin;
10	1	6	2017-02-10 12:27:44.762+05:30	2017-02-10 12:27:44.762+05:30
\.


--
-- Data for Name: executionlogs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY executionlogs (id, botexecutionid, logtypeid, message, created_at, updated_at) FROM stdin;
\.


--
-- Name: executionlogs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('executionlogs_id_seq', 243, true);


--
-- Data for Name: logtype; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY logtype (id, name) FROM stdin;
1	Error
2	Warn
3	Info
4	Silly
5	Debug
\.


--
-- Name: logtype_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('logtype_id_seq', 2, true);


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY packages (id, name, active, filepath) FROM stdin;
\.


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('packages_id_seq', 1, false);


--
-- Data for Name: qrtz_blob_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_blob_triggers (trigger_name, trigger_group, blob_data, sched_name) FROM stdin;
\.


--
-- Data for Name: qrtz_calendars; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_calendars (calendar_name, calendar, sched_name) FROM stdin;
\.


--
-- Data for Name: qrtz_cron_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_cron_triggers (trigger_name, trigger_group, cron_expression, time_zone_id, sched_name) FROM stdin;
\.


--
-- Data for Name: qrtz_fired_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_fired_triggers (entry_id, trigger_name, trigger_group, instance_name, fired_time, priority, state, job_name, job_group, is_nonconcurrent, is_update_data, sched_name, sched_time, requests_recovery) FROM stdin;
B2ML1737614891584476271489158446845	botExecution 39	BotExecution	B2ML173761489158447627	1489158457886	5	EXECUTING	BotExecution	BotExecution	f	\N	BotExecutionScheduler	1489158448647	f
B2ML1737614891584476271489158446847	botExecution 40	BotExecution	B2ML173761489158447627	1489158467135	5	EXECUTING	BotExecution	BotExecution	f	\N	BotExecutionScheduler	1489158448695	f
B2ML1737614891584476271489158446848	botExecution 41	BotExecution	B2ML173761489158447627	1489158493847	5	EXECUTING	BotExecution	BotExecution	f	\N	BotExecutionScheduler	1489158448718	f
\.


--
-- Data for Name: qrtz_job_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_job_details (job_name, job_group, description, job_class_name, is_durable, is_nonconcurrent, is_update_data, sched_name, requests_recovery, job_data) FROM stdin;
FileWriter	FileWriterExecution	FileWriter	com.javacodegeeks.quartz.Job.FileWriterJob	t	f	f	FileWriterScheduler	f	\\x230d0a23467269204d61722031302031313a30393a35342049535420323031370d0a
BotExecution	BotExecution	Bot Execution	com.javacodegeeks.quartz.Job.BotExecutionJob	t	f	f	BotExecutionScheduler	f	\\x230d0a23467269204d61722031302031333a30343a34302049535420323031370d0a
Client 6	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23467269204d61722031302032303a33313a34312049535420323031370d0a636c69656e7449443d360d0a
Client 7	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23467269204d61722031302032303a33323a30342049535420323031370d0a636c69656e7449443d370d0a
FileWriter	FileWriterExecution	FileWriter	com.javacodegeeks.quartz.Job.FileWriterJob	t	f	f	B2ML17376_FileWriterScheduler	f	\\x230d0a234d6f6e204d61722031332031343a35333a30392049535420323031370d0a
\.


--
-- Data for Name: qrtz_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_locks (lock_name, sched_name) FROM stdin;
trigger_access	TestScheduler
job_access	TestScheduler
calendar_access	TestScheduler
state_access	TestScheduler
misfire_access	TestScheduler
TRIGGER_ACCESS	FileWriterScheduler
TRIGGER_ACCESS	ClientExecutionScheduler
TRIGGER_ACCESS	BotExecutionScheduler
STATE_ACCESS	BotExecutionScheduler
STATE_ACCESS	ClientExecutionScheduler
STATE_ACCESS	FileWriterScheduler
TRIGGER_ACCESS	B2ML17376_FileWriterScheduler
\.


--
-- Data for Name: qrtz_paused_trigger_grps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_paused_trigger_grps (trigger_group, sched_name) FROM stdin;
\.


--
-- Data for Name: qrtz_scheduler_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_scheduler_state (instance_name, last_checkin_time, checkin_interval, sched_name) FROM stdin;
B2ML173761489158447627	1489158748386	20000	BotExecutionScheduler
B2ML173761489158448444	1489158749063	20000	ClientExecutionScheduler
B2ML173761489158448925	1489158749688	20000	FileWriterScheduler
\.


--
-- Data for Name: qrtz_simple_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_simple_triggers (trigger_name, trigger_group, repeat_count, repeat_interval, times_triggered, sched_name) FROM stdin;
\.


--
-- Data for Name: qrtz_simprop_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_simprop_triggers (sched_name, trigger_name, trigger_group, str_prop_1, str_prop_2, str_prop_3, int_prop_1, int_prop_2, long_prop_1, long_prop_2, dec_prop_1, dec_prop_2, bool_prop_1, bool_prop_2) FROM stdin;
\.


--
-- Data for Name: qrtz_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_triggers (trigger_name, trigger_group, job_name, job_group, description, next_fire_time, prev_fire_time, priority, trigger_state, trigger_type, start_time, end_time, calendar_name, misfire_instr, job_data, sched_name) FROM stdin;
\.


--
-- Data for Name: scheduleexecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY scheduleexecution (id, userdetailid, clientid, created_at, updated_at) FROM stdin;
1	1	6	2017-03-01 14:33:58.989373+05:30	2017-03-01 14:33:58.989373+05:30
\.


--
-- Name: scheduleexecution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('scheduleexecution_id_seq', 20, true);


--
-- Data for Name: snippet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY snippet (id, userdetailid, name, active, script, filepath, created_at, updated_at, description) FROM stdin;
1	1	writeObjectToFile	t	var package = global.createPackage();\r\nvar async = require("async");\r\nvar fs = require('fs');\r\nvar jsonxml = require('jsontoxml');\r\n\r\nvar path = require('path');\r\n\r\nexports.createInput = (configuration, jobs) => {\r\n    return new snippetInput(configuration, jobs);\r\n}\r\n\r\nfunction snippetInput(configuration, jobs) {\r\n\r\n    var input = {\r\n        jobs: jobs.jobs,\r\n        path: package.config.outputRoot + configuration.configuration.filepath,\r\n        filename: configuration.configuration.name + ".xml"\r\n    };\r\n\r\n    return input;\r\n\r\n}\r\n\r\nexports.execute = (input) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var normalizedPath = path.normalize(input.path + "/");\r\n            package.util.createDirectory(normalizedPath)\r\n                .then(() => {\r\n                    var jobs = { "Objects": input.jobs }\r\n                    var data = jsonxml(jobs);\r\n                    fs.writeFile(normalizedPath + input.filename, data, function (err) {\r\n                        if (err) {\r\n                            onfailure(err);\r\n                        }\r\n                        onsuccess(input.jobs.length);\r\n                    });\r\n                })\r\n                .catch((err) => {\r\n                    onfailure(err);\r\n                });\r\n\r\n        } catch (e) {\r\n            console.log(e);\r\n        }\r\n    });\r\n}	D:\\ProjectSolution\\TmpStash\\selenium-scraper\\Source\\Application\\SS.Framework\\snippet	2017-03-09 16:05:20.582+05:30	2017-03-09 16:05:20.582+05:30	\N
\.


--
-- Name: snippet_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('snippet_id_seq', 4, true);


--
-- Data for Name: snippethistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY snippethistory (id, snippetid, active, script, filepath, message, created_at, updated_at) FROM stdin;
\.


--
-- Name: snippethistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('snippethistory_id_seq', 1, true);


--
-- Data for Name: userdetail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY userdetail (id, name, active, created_at, updated_at) FROM stdin;
3	rsiva	t	2017-02-07 12:24:07.757+05:30	2017-02-07 12:24:07.757+05:30
1	SS Admin	t	2017-03-03 00:00:00+05:30	2017-03-03 00:00:00+05:30
\.


--
-- Name: userdetail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('userdetail_id_seq', 3, true);


--
-- Data for Name: variabletype; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY variabletype (id, userdetailid, name, active, script, filepath, isdeleted, created_at, updated_at) FROM stdin;
\.


--
-- Name: variabletype_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('variabletype_id_seq', 1, false);


--
-- Data for Name: variabletypehistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY variabletypehistory (id, variabletypeid, active, script, filepath, message, created_at, updated_at) FROM stdin;
\.


--
-- Name: variabletypehistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('variabletypehistory_id_seq', 1, false);


--
-- Name: batchserverdetails batchserverdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY batchserverdetails
    ADD CONSTRAINT batchserverdetails_pkey PRIMARY KEY (id);


--
-- Name: botconfiguration botconfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botconfiguration
    ADD CONSTRAINT botconfig_pkey PRIMARY KEY (id);


--
-- Name: botexecution botexecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_pkey PRIMARY KEY (id);


--
-- Name: botexecutionserverdetails botexecutionserverdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionserverdetails
    ADD CONSTRAINT botexecutionserverdetails_pkey PRIMARY KEY (id);


--
-- Name: botexecutionstatus botexecutionstatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionstatus
    ADD CONSTRAINT botexecutionstatus_pkey PRIMARY KEY (id);


--
-- Name: bothistory bothistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bothistory
    ADD CONSTRAINT bothistory_pkey PRIMARY KEY (id);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: clientbotconfiguration clientbotconfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_pkey PRIMARY KEY (id);


--
-- Name: executionlogs executionlogs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_pkey PRIMARY KEY (id);


--
-- Name: logtype logtype_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY logtype
    ADD CONSTRAINT logtype_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: qrtz_blob_triggers qrtz_blob_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_blob_triggers
    ADD CONSTRAINT qrtz_blob_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_calendars qrtz_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_calendars
    ADD CONSTRAINT qrtz_calendars_pkey PRIMARY KEY (sched_name, calendar_name);


--
-- Name: qrtz_cron_triggers qrtz_cron_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_cron_triggers
    ADD CONSTRAINT qrtz_cron_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_fired_triggers qrtz_fired_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_fired_triggers
    ADD CONSTRAINT qrtz_fired_triggers_pkey PRIMARY KEY (sched_name, entry_id);


--
-- Name: qrtz_job_details qrtz_job_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_job_details
    ADD CONSTRAINT qrtz_job_details_pkey PRIMARY KEY (sched_name, job_name, job_group);


--
-- Name: qrtz_locks qrtz_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_locks
    ADD CONSTRAINT qrtz_locks_pkey PRIMARY KEY (sched_name, lock_name);


--
-- Name: qrtz_paused_trigger_grps qrtz_paused_trigger_grps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_paused_trigger_grps
    ADD CONSTRAINT qrtz_paused_trigger_grps_pkey PRIMARY KEY (sched_name, trigger_group);


--
-- Name: qrtz_scheduler_state qrtz_scheduler_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_scheduler_state
    ADD CONSTRAINT qrtz_scheduler_state_pkey PRIMARY KEY (sched_name, instance_name);


--
-- Name: qrtz_simple_triggers qrtz_simple_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simple_triggers
    ADD CONSTRAINT qrtz_simple_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simprop_triggers qrtz_simprop_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simprop_triggers
    ADD CONSTRAINT qrtz_simprop_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_triggers qrtz_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_triggers
    ADD CONSTRAINT qrtz_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: scheduleexecution scheduleexecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_pkey PRIMARY KEY (id);


--
-- Name: snippet snippet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippet
    ADD CONSTRAINT snippet_pkey PRIMARY KEY (id);


--
-- Name: snippethistory snippethistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippethistory
    ADD CONSTRAINT snippethistory_pkey PRIMARY KEY (id);


--
-- Name: userdetail userdetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userdetail
    ADD CONSTRAINT userdetail_pkey PRIMARY KEY (id);


--
-- Name: variabletype variabletype_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletype
    ADD CONSTRAINT variabletype_pkey PRIMARY KEY (id);


--
-- Name: variabletypehistory variabletypehistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletypehistory
    ADD CONSTRAINT variabletypehistory_pkey PRIMARY KEY (id);


--
-- Name: fki_qrtz_simple_triggers_job_details_name_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_qrtz_simple_triggers_job_details_name_group ON qrtz_triggers USING btree (job_name, job_group);


--
-- Name: fki_qrtz_simple_triggers_qrtz_triggers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_qrtz_simple_triggers_qrtz_triggers ON qrtz_simple_triggers USING btree (trigger_name, trigger_group);


--
-- Name: idx_qrtz_ft_j_g; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_ft_j_g ON qrtz_fired_triggers USING btree (sched_name, job_name, job_group);


--
-- Name: idx_qrtz_ft_jg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_ft_jg ON qrtz_fired_triggers USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_ft_t_g; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_ft_t_g ON qrtz_fired_triggers USING btree (sched_name, trigger_name, trigger_group);


--
-- Name: idx_qrtz_ft_tg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_ft_tg ON qrtz_fired_triggers USING btree (sched_name, trigger_group);


--
-- Name: idx_qrtz_ft_trig_inst_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_ft_trig_inst_name ON qrtz_fired_triggers USING btree (sched_name, instance_name);


--
-- Name: idx_qrtz_j_grp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_j_grp ON qrtz_job_details USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_t_c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_c ON qrtz_triggers USING btree (sched_name, calendar_name);


--
-- Name: idx_qrtz_t_g; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_g ON qrtz_triggers USING btree (sched_name, trigger_group);


--
-- Name: idx_qrtz_t_j; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_j ON qrtz_triggers USING btree (sched_name, job_name, job_group);


--
-- Name: idx_qrtz_t_jg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_jg ON qrtz_triggers USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_t_n_g_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_n_g_state ON qrtz_triggers USING btree (sched_name, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_n_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_n_state ON qrtz_triggers USING btree (sched_name, trigger_name, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_next_fire_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_next_fire_time ON qrtz_triggers USING btree (sched_name, next_fire_time);


--
-- Name: idx_qrtz_t_nft_misfire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_nft_misfire ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time);


--
-- Name: idx_qrtz_t_nft_st; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_nft_st ON qrtz_triggers USING btree (sched_name, trigger_state, next_fire_time);


--
-- Name: idx_qrtz_t_nft_st_misfire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_nft_st_misfire ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time, trigger_state);


--
-- Name: idx_qrtz_t_nft_st_misfire_grp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_nft_st_misfire_grp ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qrtz_t_state ON qrtz_triggers USING btree (sched_name, trigger_state);


--
-- Name: botconfiguration botconfig_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botconfiguration
    ADD CONSTRAINT botconfig_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: botexecution botexecution_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: botexecution botexecution_botexecutionstatusid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_botexecutionstatusid_fkey FOREIGN KEY (botexecutionstatusid) REFERENCES botexecutionstatus(id);


--
-- Name: botexecution botexecution_scheduleexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_scheduleexecutionid_fkey FOREIGN KEY (scheduleexecutionid) REFERENCES scheduleexecution(id);


--
-- Name: botexecution botexecution_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: botexecutionserverdetails botexecutionserverdetails_botexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionserverdetails
    ADD CONSTRAINT botexecutionserverdetails_botexecutionid_fkey FOREIGN KEY (botexecutionid) REFERENCES botexecution(id);


--
-- Name: bothistory bothistory_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bothistory
    ADD CONSTRAINT bothistory_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: clientbotconfiguration clientbotconfig_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: clientbotconfiguration clientbotconfig_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_clientid_fkey FOREIGN KEY (clientid) REFERENCES client(id);


--
-- Name: executionlogs executionlogs_botexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_botexecutionid_fkey FOREIGN KEY (botexecutionid) REFERENCES botexecution(id);


--
-- Name: executionlogs executionlogs_logtypeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_logtypeid_fkey FOREIGN KEY (logtypeid) REFERENCES logtype(id);


--
-- Name: qrtz_blob_triggers qrtz_blob_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_blob_triggers
    ADD CONSTRAINT qrtz_blob_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_cron_triggers qrtz_cron_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_cron_triggers
    ADD CONSTRAINT qrtz_cron_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simple_triggers qrtz_simple_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simple_triggers
    ADD CONSTRAINT qrtz_simple_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simprop_triggers qrtz_simprop_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simprop_triggers
    ADD CONSTRAINT qrtz_simprop_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_triggers qrtz_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_triggers
    ADD CONSTRAINT qrtz_triggers_sched_name_fkey FOREIGN KEY (sched_name, job_name, job_group) REFERENCES qrtz_job_details(sched_name, job_name, job_group);


--
-- Name: scheduleexecution scheduleexecution_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_clientid_fkey FOREIGN KEY (clientid) REFERENCES client(id);


--
-- Name: scheduleexecution scheduleexecution_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: snippet snippet_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippet
    ADD CONSTRAINT snippet_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: snippethistory snippethistory_snippetid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippethistory
    ADD CONSTRAINT snippethistory_snippetid_fkey FOREIGN KEY (snippetid) REFERENCES snippet(id);


--
-- Name: variabletype variabletype_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletype
    ADD CONSTRAINT variabletype_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: variabletypehistory variabletypehistory_variabletypeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletypehistory
    ADD CONSTRAINT variabletypehistory_variabletypeid_fkey FOREIGN KEY (variabletypeid) REFERENCES variabletype(id);


--
-- PostgreSQL database dump complete
--

