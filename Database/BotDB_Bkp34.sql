--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

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
-- Name: getbotexecutionhistory(integer, integer, timestamp with time zone, timestamp with time zone, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getbotexecutionhistory(client_id integer, bot_id integer, _createdat timestamp with time zone, _updatedat timestamp with time zone, serve_name text, execution_status integer) RETURNS TABLE(executionid integer, starttime timestamp with time zone, endtime timestamp with time zone, statusid integer)
    LANGUAGE plpgsql
    AS $$
begin
return query
select
be.id,
be.created_at,
be.updated_at,
be.botexecutionstatusid
from botexecution be
join botconfiguration b
on b.id = be.botconfigid
join clientbotconfiguration cbc
on be.botconfigid = cbc.botconfigid
join botexecutionserverdetails esd
on esd.botexecutionid = be.id
where (cbc.clientid = client_Id or client_Id is null) and
(b.id = bot_Id or bot_Id is null) and
(be.created_at = _createdAt or _createdAt is null) and
(be.updated_at = _updatedAt or _updatedAt is null) and
(esd.servername = serve_Name or serve_Name is null)and
(be.botexecutionstatusid = execution_Status or execution_Status is null);
end;
$$;


ALTER FUNCTION public.getbotexecutionhistory(client_id integer, bot_id integer, _createdat timestamp with time zone, _updatedat timestamp with time zone, serve_name text, execution_status integer) OWNER TO postgres;

--
-- Name: getexecutionprogressstatus(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getexecutionprogressstatus() RETURNS TABLE(executionid integer, botid integer, botname text, clientname text, starttime timestamp with time zone, endtime timestamp with time zone, scrapestatus integer)
    LANGUAGE plpgsql
    AS $$
begin
return query
select be.Id , 
be.botconfigid,
bc.name,
c.name,
be.created_at , 
be.updated_at ,   
be.botexecutionstatusid
from botexecution be
join botconfiguration bc
on bc.id = be.botconfigid
join clientbotconfiguration cb
on cb.botconfigid = bc.id
join client c
on c.id = cb.clientid
where be.botexecutionstatusid in (2,4);
end;
$$;


ALTER FUNCTION public.getexecutionprogressstatus() OWNER TO postgres;

--
-- Name: getrecentexecutionstatus(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getrecentexecutionstatus() RETURNS TABLE(executionid integer, botid integer, botname text, clientname text, starttime timestamp with time zone, endtime timestamp with time zone, scrapestatus integer)
    LANGUAGE plpgsql
    AS $$
begin
return query
select be.Id , 
be.botconfigid,
bc.name,
c.name,
be.created_at , 
be.updated_at ,   
be.botexecutionstatusid
from botexecution be
join botconfiguration bc
on bc.id = be.botconfigid
join clientbotconfiguration cb
on cb.botconfigid = bc.id
join client c
on c.id = cb.clientid
where be.id in (select max(id) from botexecution where botexecutionstatusid in (1,3) group by botconfigid);
end;
$$;


ALTER FUNCTION public.getrecentexecutionstatus() OWNER TO postgres;

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

--
-- Name: getserverdetails(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getserverdetails() RETURNS TABLE(executionid integer, starttime timestamp with time zone, endtime timestamp with time zone, jobcount integer, servername text, botcount bigint)
    LANGUAGE plpgsql
    AS $$
begin
return query
select
be.id,
be.created_at,
be.updated_at,
be.jobcount,
bes.servername,
count(bes.botexecutionid) over (partition by bes.servername)
from botexecution be
join botexecutionserverdetails bes
on be.id = bes.botexecutionid;
end;
$$;


ALTER FUNCTION public.getserverdetails() OWNER TO postgres;

--
-- Name: getserverexecutionbot(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getserverexecutionbot() RETURNS TABLE(servername text, botcount bigint)
    LANGUAGE plpgsql
    AS $$
begin
return query
select 
sd.servername,
count(sd.botexecutionid)
from botexecutionserverdetails sd
where sd.active = true
group by sd.servername;
end;
$$;


ALTER FUNCTION public.getserverexecutionbot() OWNER TO postgres;

--
-- Name: getvariance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION getvariance() RETURNS TABLE(executionid integer, botid integer, starttime timestamp with time zone, endtime timestamp with time zone, jobvariance bigint)
    LANGUAGE plpgsql
    AS $$
begin
return query
select id,
botconfigid,
created_at,
updated_at,
((atsjobcount - jobcount)*100)/100 
from botexecution 
where id in(
select MAX(id)
from botexecution
where botexecutionstatusid= 1
group by botconfigid);
end;
$$;


ALTER FUNCTION public.getvariance() OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: batchserverdetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE batchserverdetails (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL
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
-- Name: botconfiguration; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: botexecution; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: botexecutionserverdetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE botexecutionserverdetails (
    id integer NOT NULL,
    servername text NOT NULL,
    botexecutionid integer NOT NULL,
    active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE botexecutionserverdetails OWNER TO postgres;

--
-- Name: botexecutionstatus; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: botexexcutionserverdetails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE botexexcutionserverdetails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE botexexcutionserverdetails_id_seq OWNER TO postgres;

--
-- Name: botexexcutionserverdetails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE botexexcutionserverdetails_id_seq OWNED BY botexecutionserverdetails.id;


--
-- Name: bothistory; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: client; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: clientbotconfiguration; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: executionlogs; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: logtype; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: packages; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_blob_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE qrtz_blob_triggers (
    trigger_name character varying(80) NOT NULL,
    trigger_group character varying(80) NOT NULL,
    blob_data text,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_blob_triggers OWNER TO postgres;

--
-- Name: qrtz_calendars; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE qrtz_calendars (
    calendar_name character varying(80) NOT NULL,
    calendar text NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_calendars OWNER TO postgres;

--
-- Name: qrtz_cron_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_fired_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_job_details; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_locks; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE qrtz_locks (
    lock_name character varying(40) NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_locks OWNER TO postgres;

--
-- Name: qrtz_paused_trigger_grps; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE qrtz_paused_trigger_grps (
    trigger_group character varying(80) NOT NULL,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_paused_trigger_grps OWNER TO postgres;

--
-- Name: qrtz_scheduler_state; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE qrtz_scheduler_state (
    instance_name character varying(200) NOT NULL,
    last_checkin_time bigint,
    checkin_interval bigint,
    sched_name character varying(120) DEFAULT 'TestScheduler'::character varying NOT NULL
);


ALTER TABLE qrtz_scheduler_state OWNER TO postgres;

--
-- Name: qrtz_simple_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_simprop_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: qrtz_triggers; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: scheduleexecution; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: snippet; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: snippethistory; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: userdetail; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
-- Name: variabletype; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
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
    updated_at timestamp with time zone NOT NULL,
    description text
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
-- Name: variabletypehistory; Type: TABLE; Schema: public; Owner: postgres; Tablespace: 
--

CREATE TABLE variabletypehistory (
    id integer NOT NULL,
    variabletypeid integer NOT NULL,
    active boolean NOT NULL,
    script text,
    filepath text NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    variabletypename text,
    description text
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
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY batchserverdetails ALTER COLUMN id SET DEFAULT nextval('batchserverdetails_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botconfiguration ALTER COLUMN id SET DEFAULT nextval('botconfig_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution ALTER COLUMN id SET DEFAULT nextval('botexecution_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionserverdetails ALTER COLUMN id SET DEFAULT nextval('botexexcutionserverdetails_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionstatus ALTER COLUMN id SET DEFAULT nextval('botexecutionstatus_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bothistory ALTER COLUMN id SET DEFAULT nextval('bothistory_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY client ALTER COLUMN id SET DEFAULT nextval('client_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration ALTER COLUMN id SET DEFAULT nextval('clientbotconfig_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs ALTER COLUMN id SET DEFAULT nextval('executionlogs_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY logtype ALTER COLUMN id SET DEFAULT nextval('logtype_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY packages ALTER COLUMN id SET DEFAULT nextval('packages_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution ALTER COLUMN id SET DEFAULT nextval('scheduleexecution_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippet ALTER COLUMN id SET DEFAULT nextval('snippet_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippethistory ALTER COLUMN id SET DEFAULT nextval('snippethistory_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userdetail ALTER COLUMN id SET DEFAULT nextval('userdetail_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletype ALTER COLUMN id SET DEFAULT nextval('variabletype_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletypehistory ALTER COLUMN id SET DEFAULT nextval('variabletypehistory_id_seq'::regclass);


--
-- Data for Name: batchserverdetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY batchserverdetails (id, name, created_at, updated_at, active) FROM stdin;
1	NYCLT8647	\N	\N	t
\.


--
-- Name: batchserverdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('batchserverdetails_id_seq', 1, true);


--
-- Name: botconfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botconfig_id_seq', 23, true);


--
-- Data for Name: botconfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botconfiguration (id, userdetailid, name, browsertype, outputpath, active, script, filepath, isdeleted, created_at, updated_at) FROM stdin;
21	3	AlignTechnology	Chrome	D:/Feeds/AlignTechnology	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\nvar he = require('he');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\njobMaker.setAlertCount(5);\r\nvar botScheduleID = "";\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        }\r\n    });\r\n}\r\n\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n    botScheduleID = configuration.scheduleid;\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var atsJobCount;\r\n    var categoryCount;\r\n\r\n    function GetCategoryCount(optionArray) {\r\n        categoryCount = new Array();\r\n        for (var i = 2; i <= optionArray.length; i++) {\r\n            categoryCount.push(i);\r\n        }\r\n    }\r\n\r\n    driver.get('http://jobs.jobvite.com/align-tech/jobs?nl=1');\r\n    driver.findElement(By.xpath('/html/body/div/div/div/article/div/form/div[4]/button[1]')).then(searchelement => {\r\n        searchelement.click().then(() => {\r\n            driver.findElement(By.xpath("/html/body/div/div/div/article/div/div/div")).then(recordsElement => {\r\n                recordsElement.getText().then(recordsCount => {\r\n                    var record = recordsCount.split("of");\r\n                    jobMaker.setatsJobCount(parseInt(record[1]));\r\n                    driver.navigate().back().then(() => {\r\n                        driver.findElement(By.xpath('//*[@id="jv-search-category"]')).then(jobCategoryElement => {\r\n                            jobCategoryElement.findElements(By.tagName('option')).then(optionArray => {\r\n                                if (optionArray.length > 1) {\r\n                                    GetCategoryCount(optionArray);\r\n                                    async.eachSeries(categoryCount, function (value, thecallback) {\r\n                                        driver.findElement(By.xpath('//Select[@id="jv-search-category"]/Option[' + value + ']')).then(option => {\r\n                                            option.getAttribute('text').then(category => {\r\n                                                option.click().then(() => {\r\n                                                    driver.findElement(By.xpath('/html/body/div/div/div/article/div/form/div[4]/button[1]')).then(searchelement => {\r\n\r\n                                                        searchelement.click().then(() => {\r\n                                                            driver.findElements(By.className('jv-job-list-name')).then(e => {\r\n                                                                return !!e.length;\r\n                                                            }).then(data => {\r\n                                                                if (data == true) {\r\n                                                                    forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                                                                }\r\n                                                                else {\r\n                                                                    driver.findElement(By.linkText('View All')).then(searchELement => {\r\n                                                                        searchELement.click().then(() => {\r\n                                                                            thecallback();\r\n                                                                        });\r\n                                                                    });\r\n                                                                }\r\n\r\n                                                            });\r\n                                                        });\r\n                                                    });\r\n                                                });\r\n                                            });\r\n                                        });\r\n                                    });\r\n                                }\r\n                            });\r\n                        });\r\n                    });\r\n                });\r\n            });\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n            onfailure(output);\r\n        });\r\n}\r\n\r\nfunction HtmlEscape(description) {\r\n    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });\r\n    description = description.replace(/&#x9;/g, '');\r\n    description = description.replace(/^\\s+|\\s+$/g, '');\r\n    description = description.replace(/\\r?\\n|\\r/g, '');\r\n    return description;\r\n}\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 1; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async, thecallback, category) => {\r\n    driver.findElements(By.className('jv-job-list-name')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver.findElement(By.xpath("//*[contains(@class,'jv-job-list jv-search-list')]/tbody/tr[" + prime + "]/td[1]/a")).then(titleElement => {\r\n                if (titleElement != null) {\r\n                    titleElement.getText().then(title => {\r\n                        driver.findElement(By.xpath("/html/body/div/div/div/article/div/table/tbody/tr[" + prime + "]/td[2]")).then(locationElement => {\r\n                            locationElement.getText().then(location => {\r\n                                driver.findElement(By.xpath("//*[contains(@class,'jv-job-list jv-search-list')]/tbody/tr[" + prime + "]/td[1]/a")).then(urlElement => {\r\n                                    urlElement.getAttribute("href").then(url => {\r\n                                        titleElement.click().then(() => {\r\n                                            driver.findElement(By.xpath("/html/body/div[1]/div/div/article/div/p")).then(categoryElement => {\r\n                                                categoryElement.getAttribute("innerHTML").then(categoryValue => {\r\n                                                    driver.findElement(By.xpath("/html/body/div[1]/div/div/article/div/div[2]")).then(descriptionElement => {\r\n                                                        descriptionElement.getAttribute("outerHTML").then(description => {\r\n                                                            driver.findElement(By.xpath("/html/body/div[1]/div/div/article/div/p")).then(jobidElement => {\r\n                                                                jobidElement.getText().then(jobid => {\r\n                                                                    driver.navigate().back().then(() => {\r\n                                                                        job.JOB_TITLE = title;\r\n                                                                        job.JOB_APPLY_URL = url + "/apply?nl=1";\r\n                                                                        var searchurl = url.split("/job/");\r\n                                                                        job.TRAVEL = searchurl[0] + "/search?nl=1";\r\n                                                                        job.SALARYTIME = url + "?nl=1";\r\n                                                                        if (jobid) {\r\n                                                                            var jobID = jobid.split("(");\r\n                                                                            if (jobID[1]) {\r\n                                                                                if (jobID[1] == ")") {\r\n                                                                                    var jobId = url.split("job/");\r\n                                                                                    job.JDTID_UNIQUE_NUMBER = jobId[1];\r\n                                                                                } else {\r\n                                                                                    job.JDTID_UNIQUE_NUMBER = jobID[1].replace(")", "");\r\n                                                                                }\r\n                                                                            }\r\n                                                                        }\r\n                                                                        job.TEXT = HtmlEscape(description);\r\n                                                                        if (categoryValue) {\r\n                                                                            var value = categoryValue.split("<");\r\n                                                                            job.JOB_CATEGORY = value[0].trim();\r\n                                                                        }\r\n\r\n                                                                        if (location) {\r\n                                                                            var loc = location.split(",");\r\n                                                                            job.JOB_LOCATION_CITY = loc[0];\r\n                                                                            job.JOB_LOCATION_STATE = loc[1].trim();\r\n                                                                        }\r\n                                                                        jobMaker.successful.add(job, botScheduleID);\r\n                                                                        callback(false);\r\n                                                                    }).catch(e => { });\r\n\r\n                                                                }).catch(e => { });\r\n                                                            }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                        }).catch(e => { });\r\n                                                    }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                }).catch(e => { });\r\n                                            }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                    }).catch(e => { });\r\n\r\n                }\r\n            }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n        }, function (err) {\r\n            if (err) { throw err; }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.className('jv-pagination-next')).then(e => {\r\n            if (e.length == 1) {\r\n                driver.findElement(By.className('jv-pagination-next')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                    });\r\n                });\r\n            }\r\n            else {\r\n                driver.navigate().back().then(() => {\r\n                    thecallback();\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\nvar snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {\r\n    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "Feed Generator").then(values => {\r\n        var snippet = package.resource.download.snippet("feedgenerator");\r\n        var input = snippet.createInput(configuration, jobs);\r\n        snippet\r\n            .execute(input)\r\n            .then(jobcount => {\r\n                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);\r\n                onsuccess(output);\r\n            })\r\n            .catch(err => {\r\n                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n                onfailure(output);\r\n            });\r\n    });\r\n}\r\n	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	f	2017-03-30 09:27:13.473-04	2017-03-30 09:32:02.087-04
22	3	TestBot	Chrome	D:/Feeds/Premise	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\nvar he = require('he');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\njobMaker.setAlertCount(5);\r\nvar botScheduleID = "";\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        }\r\n    });\r\n}\r\n\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n    botScheduleID = configuration.scheduleid;\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var categoryCount;\r\n\r\n    function GetCategoryCount(optionArray) {\r\n        categoryCount = new Array();\r\n        for (var i = 2; i <= optionArray.length; i++) {\r\n            categoryCount.push(i);\r\n        }\r\n    }\r\n\r\n    driver.get('https://re12.ultipro.com/chd1000/JobBoard/searchjobs.aspx');\r\n    driver.findElement(By.xpath('//input[@id="Submit"]')).then(searchElement => {\r\n        searchElement.click().then(() => {\r\n            driver.findElement(By.xpath('//*[@id="PXForm"]/table[1]/tbody/tr/td')).then(recordsElement => {\r\n                recordsElement.getText().then(recordsCount => {\r\n                    var record = recordsCount.split(":");\r\n                    jobMaker.setatsJobCount(parseInt(record[2]));\r\n                    driver.navigate().back().then(() => {\r\n                        driver.findElement(By.xpath('//select[@id="Req_JobFamilyFK"]')).then(jobCategoryElement => {\r\n                            jobCategoryElement.findElements(By.tagName('option')).then(optionArray => {\r\n                                if (optionArray.length > 1) {\r\n                                    GetCategoryCount(optionArray);\r\n                                    async.eachSeries(categoryCount, function (value, thecallback) {\r\n                                        driver.findElement(By.xpath('//Select[@id="RecordsPerPage"]/Option[4]')).then(resultCount => {\r\n                                            resultCount.getAttribute('text').then(count => {\r\n                                                resultCount.click().then(() => {\r\n                                                    driver.findElement(By.xpath('//Select[@id="Req_JobFamilyFK"]/Option[' + value + ']')).then(option => {\r\n                                                        option.getAttribute('text').then(category => {\r\n                                                            option.click().then(() => {\r\n                                                                driver.findElement(By.xpath('//input[@id="Submit"]')).then(searchelement => {\r\n                                                                    searchelement.click().then(() => {\r\n                                                                        driver.findElements(By.xpath('//*[@name="PXForm"]/table/tbody/tr')).then(e => {\r\n                                                                            return !!e.length;\r\n                                                                        }).then(data => {\r\n                                                                            if (data == true) {\r\n                                                                                new Promise((onsuccess, onfailure) => {\r\n                                                                                    try {\r\n                                                                                        forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                                                                                    } catch (e) {\r\n                                                                                        onfailure(e);\r\n                                                                                    }\r\n                                                                                })\r\n                                                                            }\r\n                                                                            else {\r\n                                                                                driver.findElement(navigate().back()).then(() => {\r\n                                                                                    thecallback();\r\n                                                                                });\r\n                                                                            }\r\n                                                                        });\r\n                                                                    });\r\n                                                                });\r\n                                                            });\r\n                                                        });\r\n                                                    });\r\n                                                });\r\n                                            });\r\n                                        });\r\n                                    });\r\n                                }\r\n                            });\r\n                        });\r\n                    });\r\n                });\r\n            });\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n            onfailure(output);\r\n        });\r\n}\r\n\r\nfunction HtmlEscape(description) {\r\n    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });\r\n    description = description.replace(/&#x9;/g, '');\r\n    description = description.replace(/^\\s+|\\s+$/g, '');\r\n    description = description.replace(/\\r?\\n|\\r/g, '');\r\n    return description;\r\n}\r\n\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 2; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async, thecallback, category) => {\r\n    driver.findElements(By.xpath('//*[@name="PXForm"]/table/tbody/tr')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[2]")).then(titleElement => {\r\n                if (titleElement != null) {\r\n                    titleElement.getText().then(title => {\r\n                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[1]")).then(jobidElement => {\r\n                            jobidElement.getText().then(jobid => {\r\n                                driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[3]")).then(statusElement => {\r\n                                    statusElement.getText().then(status => {\r\n                                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[4]")).then(cityElement => {\r\n                                            cityElement.getText().then(city => {\r\n                                                driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[5]")).then(stateElement => {\r\n                                                    stateElement.getText().then(state => {\r\n                                                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[2]/a")).then(titleIDElement => {\r\n                                                            titleIDElement.click().then(() => {\r\n                                                                driver.findElement(By.xpath("//*[@class='DetailsTable']/tbody/tr[@id='Row_Req_LocationFK']")).then(descriptionElement => {\r\n                                                                    descriptionElement.getAttribute("outerHTML").then(description => {\r\n                                                                        driver.findElement(By.xpath("//*[@class='DetailsTable']/tbody/tr[@id='Row_Req_Description']")).then(QualificationElement => {\r\n                                                                            QualificationElement.getAttribute("outerHTML").then(qualification => {\r\n                                                                                driver.findElement(By.xpath("//*[@name='PXForm']//a[@title='Apply On-line']")).then(urlElement => {\r\n                                                                                    urlElement.getAttribute("href").then(url => {\r\n                                                                                        var applyUrl = url.split('&');\r\n                                                                                        url = applyUrl[0];\r\n                                                                                        url = url.replace('CanLogin.aspx?__JobID', 'JobDetails.aspx?__ID');\r\n                                                                                        driver.navigate().back().then(() => {\r\n                                                                                            job.JOB_TITLE = title;\r\n                                                                                            job.JDTID_UNIQUE_NUMBER = jobid;\r\n                                                                                            job.TEXT = description + qualification;\r\n                                                                                            job.TEXT = HtmlEscape(job.TEXT);\r\n                                                                                            job.JOB_CATEGORY = category;\r\n                                                                                            job.JOB_APPLY_URL = url;\r\n                                                                                            job.JOB_LOCATION_CITY = city;\r\n                                                                                            job.JOB_LOCATION_STATE = state;\r\n                                                                                            job.JOB_STATUS = status;\r\n                                                                                            jobMaker.successful.add(job);\r\n                                                                                            callback(false, botScheduleID);\r\n                                                                                        }).catch(e => { });\r\n                                                                                    }).catch(e => { });\r\n                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                            }).catch(e => { });\r\n                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                    }).catch(e => { });\r\n                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                            }).catch(e => { });\r\n                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                    }).catch(e => { });\r\n                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                            }).catch(e => { });\r\n                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                    }).catch(e => { });\r\n                }\r\n            });\r\n        }, function (err) {\r\n            if (err) { throw err; }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.xpath('//*[@title="Alt+n"]')).then(e => {\r\n            if (e.length == 1) {\r\n                driver.findElement(By.xpath('//*[@title="Alt+n"]')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                    });\r\n                });\r\n            }\r\n            else {\r\n                driver.findElement(By.xpath('//*[@href="searchjobs.aspx"]')).then(searchELement => {\r\n                    searchELement.click().then(() => {\r\n                        var x = 1;\r\n                        thecallback();\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\nvar snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {\r\n    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "FeedGenerator").then(values => {\r\n        var snippet = package.resource.download.snippet("FeedGenerator");\r\n        var input = snippet.createInput(configuration, jobs);\r\n        snippet\r\n            .execute(input)\r\n            .then(jobcount => {\r\n                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);\r\n                onsuccess(output);\r\n            })\r\n            .catch(err => {\r\n                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n                onfailure(output);\r\n            });\r\n    });\r\n}\r\n	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	f	2017-03-30 14:26:24.808-04	2017-03-30 14:26:24.808-04
23	3	TestBot	Chrome	D:/Feeds/SunCoast	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\nvar he = require('he');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\njobMaker.setAlertCount(2);\r\nvar botScheduleID = "";\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        }\r\n    });\r\n}\r\n\r\nfunction HtmlEscape(description) {\r\n    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });\r\n    description = description.replace(/&#x9;/g, '');\r\n    description = description.replace(/^\\s+|\\s+$/g, '');\r\n    description = description.replace(/\\r?\\n|\\r/g, '');\r\n    return description;\r\n}\r\n\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n    botScheduleID = configuration.scheduleid;\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var atsJobCount;\r\n\r\n    driver.get('http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/search.do?functionName=getSearchCriteria');\r\n    driver.findElement(By.xpath('//*[@id="searchButton"]')).then(searchElement => {\r\n        searchElement.click().then(() => {\r\n            driver.findElement(By.xpath("//*[@id='searchResultsHeaderTable']/tbody/tr/td[1]/span")).then(recordsElement => {\r\n                recordsElement.getText().then(recordsCount => {\r\n                    var record = recordsCount.split("of");\r\n                    record = record[1].split("(");\r\n                    jobMaker.setatsJobCount(parseInt(record[0]));\r\n                    driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody')).then(e => {\r\n                        return !!e.length;\r\n                    }).then(data => {\r\n                        if (data == true) {\r\n                            new Promise((onsuccess, onfailure) => {\r\n                                try {\r\n                                    forEachTag(driver, By, until, jobs, async);\r\n                                } catch (e) {\r\n                                    onfailure(e);\r\n                                }\r\n                            })\r\n                        }\r\n                    });\r\n                });\r\n            });\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        });\r\n}\r\n\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 2; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async) => {\r\n    driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody/tr')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]')).then(titleElement => {\r\n                if (titleElement != null) {\r\n                    titleElement.getText().then(title => {\r\n                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[13]')).then(dateElement => {\r\n                            dateElement.getText().then(date => {\r\n                                driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[9]')).then(jobIDElement => {\r\n                                    jobIDElement.getText().then(id => {\r\n                                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[11]')).then(locationElement => {\r\n                                            locationElement.getText().then(location => {\r\n                                                driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]/a')).then(urlElement => {\r\n                                                    urlElement.getAttribute("href").then(url => {\r\n                                                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]/a')).then(clickElement => {\r\n                                                            clickElement.click().then(() => {\r\n                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(descriptionElement => {\r\n                                                                    descriptionElement.getAttribute("innerHTML").then(description => {\r\n                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span")).then(element => {\r\n                                                                            element.getText().then(category => {\r\n                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]")).then(element => {\r\n                                                                                    element.getText().then(contactcompany => {\r\n                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[4]/td[1]")).then(element => {\r\n                                                                                            element.getText().then(jobtype => {\r\n                                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]")).then(element => {\r\n                                                                                                    element.getText().then(status => {\r\n                                                                                                        driver.navigate().back().then(() => {\r\n                                                                                                            job.JOB_TITLE = title;\r\n                                                                                                            job.JDTID_UNIQUE_NUMBER = id;\r\n                                                                                                            job.ASSIGNMENT_START_DATE = date;\r\n                                                                                                            job.JOB_CATEGORY = category;\r\n                                                                                                            if (description) {\r\n                                                                                                                var value = description.split("<table");\r\n                                                                                                                job.TEXT = value[0].replace("CB*", "").replace("<li><br>", "<li>").replace("<br><p>", "<p>").replace("<p></p>", "").replace("</p><br><ul> <br><ul><br><ul><br><li>", "</p><ul> <ul><ul><li>").replace("<br><br><br><br><br><br>", "<br>").replace(">Position Requirements<", "><br>Position Requirements<");\r\n                                                                                                                job.TEXT = job.TEXT + '<td width="10"> </td> <td> </td>';\r\n                                                                                                                job.TEXT = HtmlEscape(job.TEXT);\r\n                                                                                                            }\r\n                                                                                                            if (contactcompany) {\r\n                                                                                                                var company = contactcompany.split(":");\r\n                                                                                                                job.JOB_CONTACT_COMPANY = company[1];\r\n                                                                                                            }\r\n                                                                                                            if (jobtype) {\r\n                                                                                                                var type = jobtype.split(":");\r\n                                                                                                                job.JOB_TYPE = type[1];\r\n                                                                                                            }\r\n                                                                                                            if (status) {\r\n                                                                                                                var jobstatus = status.split(":");\r\n                                                                                                                job.JOB_STATUS = jobstatus[1];\r\n                                                                                                            }\r\n                                                                                                            job.JOB_APPLY_URL = url;\r\n                                                                                                            if (url) {\r\n                                                                                                                var applyurl = url.split("jobPostId=");\r\n                                                                                                                var apply = applyurl[1].split("&locale");\r\n                                                                                                                job.JOB_APPLY_URL = "http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/gateway.do?functionName=viewFromLink&jobPostId=" + apply[0] + "&localeCode=en-us"\r\n                                                                                                            }\r\n                                                                                                            if (location) {\r\n                                                                                                                job.JOB_INDUSTRY = location;\r\n                                                                                                                var loc;\r\n                                                                                                                var value;\r\n                                                                                                                if (location.indexOf("-") > -1) {\r\n                                                                                                                    loc = location.split("-");\r\n                                                                                                                    value = loc[0].split(",");\r\n                                                                                                                    job.JOB_LOCATION_CITY = value[0];\r\n                                                                                                                    job.JOB_LOCATION_STATE = value[1];\r\n                                                                                                                }\r\n                                                                                                                else {\r\n                                                                                                                    loc = location.split(",");\r\n                                                                                                                    value = loc[1].split(" ");\r\n                                                                                                                    job.JOB_LOCATION_CITY = loc[0];\r\n                                                                                                                    job.JOB_LOCATION_STATE = value[1];\r\n                                                                                                                }\r\n                                                                                                            }\r\n                                                                                                            jobMaker.successful.add(job, botScheduleID);\r\n                                                                                                            callback(false);\r\n                                                                                                        }).catch(e => { });\r\n                                                                                                    }).catch(e => { });\r\n                                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                                            }).catch(e => { });\r\n                                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                                    }).catch(e => { });\r\n                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                            }).catch(e => { });\r\n                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                    }).catch(e => { });\r\n                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                            }).catch(e => { });\r\n                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                    }).catch(e => { });\r\n                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                            }).catch(e => { });\r\n                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                    }).catch(e => { });\r\n                }\r\n            }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n        }, function (err) {\r\n            if (err) {\r\n                throw err;\r\n            }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.xpath('//input[@value=">"]')).then(e => {\r\n            if (e.length == 2) {\r\n                driver.findElement(By.xpath('//input[@value=">"]')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async);\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\nvar snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {\r\n    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "FeedGenerator").then(values => {\r\n        var snippet = package.resource.download.snippet("FeedGenerator");\r\n        var input = snippet.createInput(configuration, jobs);\r\n        snippet\r\n            .execute(input)\r\n            .then(jobcount => {\r\n                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);\r\n                onsuccess(output);\r\n            })\r\n            .catch(err => {\r\n                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n                onfailure(output);\r\n            });\r\n    });\r\n}	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	f	2017-03-30 15:31:54.384-04	2017-03-30 15:31:54.384-04
\.


--
-- Data for Name: botexecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecution (id, userdetailid, botconfigid, botexecutionstatusid, scheduleexecutionid, jobcount, isretry, created_at, updated_at, atsjobcount, failedjobcount) FROM stdin;
53	3	21	1	76	233	f	2017-03-30 14:35:43.856-04	2017-03-30 14:38:28.905-04	233	0
50	3	21	1	73	233	f	2017-03-30 14:27:29.843-04	2017-03-30 14:30:41.253-04	233	0
52	3	22	1	75	364	f	2017-03-30 14:35:27.435-04	2017-03-30 14:39:59.29-04	367	0
51	1	22	1	74	364	f	2017-03-30 14:31:00.098-04	2017-03-30 14:35:51.922-04	367	0
57	3	22	1	80	364	f	2017-03-30 15:34:08.001-04	2017-03-30 15:39:17.258-04	367	0
49	3	21	1	72	233	f	2017-03-30 13:46:31.439-04	2017-03-30 13:49:42.181-04	233	0
59	3	21	1	82	240	f	2017-03-31 03:06:19.8-04	2017-03-31 03:09:01.144-04	240	0
58	1	23	1	81	91	f	2017-03-30 15:36:00.023-04	2017-03-30 15:42:33.257-04	91	0
55	1	21	1	78	233	f	2017-03-30 15:29:00.097-04	2017-03-30 15:31:55.66-04	233	0
56	1	22	1	79	365	f	2017-03-30 15:30:00.015-04	2017-03-30 15:34:55.65-04	368	0
62	3	22	1	86	364	f	2017-03-31 10:16:32.401-04	2017-03-31 10:21:36.06-04	367	0
63	3	22	1	87	364	f	2017-03-31 10:16:37.129-04	2017-03-31 10:21:43.809-04	367	0
64	3	22	1	88	364	f	2017-03-31 10:17:06.867-04	2017-03-31 10:22:01.773-04	367	0
60	3	21	3	83	135	f	2017-03-31 03:09:46.176-04	2017-03-31 03:11:23.5-04	240	0
54	3	21	1	77	233	f	2017-03-30 15:13:56.364-04	2017-03-30 15:16:35.541-04	233	0
61	3	23	1	85	91	f	2017-03-31 10:16:26.689-04	2017-03-31 10:22:51.827-04	91	0
\.


--
-- Name: botexecution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexecution_id_seq', 64, true);


--
-- Data for Name: botexecutionserverdetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecutionserverdetails (id, servername, botexecutionid, active, created_at, updated_at) FROM stdin;
42	NYCLT8647	49	\N	2017-03-30 13:46:56.027-04	2017-03-30 13:46:56.027-04
43	NYCLT8647	50	\N	2017-03-30 14:27:56.862-04	2017-03-30 14:27:56.862-04
44	NYCLT8647	51	\N	2017-03-30 14:31:02.247-04	2017-03-30 14:31:02.247-04
45	NYCLT8647	52	\N	2017-03-30 14:35:31.568-04	2017-03-30 14:35:31.568-04
46	NYCLT8647	53	\N	2017-03-30 14:36:00.08-04	2017-03-30 14:36:00.08-04
47	NYCLT8647	54	\N	2017-03-30 15:13:59.028-04	2017-03-30 15:13:59.028-04
48	NYCLT8647	55	\N	2017-03-30 15:29:19.618-04	2017-03-30 15:29:19.618-04
49	NYCLT8647	56	\N	2017-03-30 15:30:09.782-04	2017-03-30 15:30:09.782-04
50	NYCLT8647	57	\N	2017-03-30 15:34:17.53-04	2017-03-30 15:34:17.53-04
51	NYCLT8647	58	\N	2017-03-30 15:36:06.981-04	2017-03-30 15:36:06.981-04
52	NYCLT8647	59	\N	2017-03-31 03:06:27.849-04	2017-03-31 03:06:27.849-04
53	NYCLT8647	60	\N	2017-03-31 03:09:54.173-04	2017-03-31 03:09:54.173-04
54	NYCLT8647	61	\N	2017-03-31 10:16:49.963-04	2017-03-31 10:16:49.963-04
55	NYCLT8647	62	\N	2017-03-31 10:16:49.97-04	2017-03-31 10:16:49.97-04
56	NYCLT8647	63	\N	2017-03-31 10:16:49.979-04	2017-03-31 10:16:49.979-04
57	NYCLT8647	64	\N	2017-03-31 10:17:16.549-04	2017-03-31 10:17:16.549-04
\.


--
-- Data for Name: botexecutionstatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY botexecutionstatus (id, name, created_at, updated_at) FROM stdin;
1	completed	\N	\N
3	Failed	\N	\N
4	In Progress	\N	\N
2	Queued	\N	\N
\.


--
-- Name: botexecutionstatus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexecutionstatus_id_seq', 5, true);


--
-- Name: botexexcutionserverdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('botexexcutionserverdetails_id_seq', 57, true);


--
-- Data for Name: bothistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY bothistory (id, botconfigid, browsertype, outputpath, active, script, filepath, message, created_at, updated_at) FROM stdin;
24	22	Chrome	D:/Feeds/Premise	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\nvar he = require('he');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\njobMaker.setAlertCount(5);\r\nvar botScheduleID = "";\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        }\r\n    });\r\n}\r\n\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n    botScheduleID = configuration.scheduleid;\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var categoryCount;\r\n\r\n    function GetCategoryCount(optionArray) {\r\n        categoryCount = new Array();\r\n        for (var i = 2; i <= optionArray.length; i++) {\r\n            categoryCount.push(i);\r\n        }\r\n    }\r\n\r\n    driver.get('https://re12.ultipro.com/chd1000/JobBoard/searchjobs.aspx');\r\n    driver.findElement(By.xpath('//input[@id="Submit"]')).then(searchElement => {\r\n        searchElement.click().then(() => {\r\n            driver.findElement(By.xpath('//*[@id="PXForm"]/table[1]/tbody/tr/td')).then(recordsElement => {\r\n                recordsElement.getText().then(recordsCount => {\r\n                    var record = recordsCount.split(":");\r\n                    jobMaker.setatsJobCount(parseInt(record[2]));\r\n                    driver.navigate().back().then(() => {\r\n                        driver.findElement(By.xpath('//select[@id="Req_JobFamilyFK"]')).then(jobCategoryElement => {\r\n                            jobCategoryElement.findElements(By.tagName('option')).then(optionArray => {\r\n                                if (optionArray.length > 1) {\r\n                                    GetCategoryCount(optionArray);\r\n                                    async.eachSeries(categoryCount, function (value, thecallback) {\r\n                                        driver.findElement(By.xpath('//Select[@id="RecordsPerPage"]/Option[4]')).then(resultCount => {\r\n                                            resultCount.getAttribute('text').then(count => {\r\n                                                resultCount.click().then(() => {\r\n                                                    driver.findElement(By.xpath('//Select[@id="Req_JobFamilyFK"]/Option[' + value + ']')).then(option => {\r\n                                                        option.getAttribute('text').then(category => {\r\n                                                            option.click().then(() => {\r\n                                                                driver.findElement(By.xpath('//input[@id="Submit"]')).then(searchelement => {\r\n                                                                    searchelement.click().then(() => {\r\n                                                                        driver.findElements(By.xpath('//*[@name="PXForm"]/table/tbody/tr')).then(e => {\r\n                                                                            return !!e.length;\r\n                                                                        }).then(data => {\r\n                                                                            if (data == true) {\r\n                                                                                new Promise((onsuccess, onfailure) => {\r\n                                                                                    try {\r\n                                                                                        forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                                                                                    } catch (e) {\r\n                                                                                        onfailure(e);\r\n                                                                                    }\r\n                                                                                })\r\n                                                                            }\r\n                                                                            else {\r\n                                                                                driver.findElement(navigate().back()).then(() => {\r\n                                                                                    thecallback();\r\n                                                                                });\r\n                                                                            }\r\n                                                                        });\r\n                                                                    });\r\n                                                                });\r\n                                                            });\r\n                                                        });\r\n                                                    });\r\n                                                });\r\n                                            });\r\n                                        });\r\n                                    });\r\n                                }\r\n                            });\r\n                        });\r\n                    });\r\n                });\r\n            });\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n            onfailure(output);\r\n        });\r\n}\r\n\r\nfunction HtmlEscape(description) {\r\n    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });\r\n    description = description.replace(/&#x9;/g, '');\r\n    description = description.replace(/^\\s+|\\s+$/g, '');\r\n    description = description.replace(/\\r?\\n|\\r/g, '');\r\n    return description;\r\n}\r\n\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 2; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async, thecallback, category) => {\r\n    driver.findElements(By.xpath('//*[@name="PXForm"]/table/tbody/tr')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[2]")).then(titleElement => {\r\n                if (titleElement != null) {\r\n                    titleElement.getText().then(title => {\r\n                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[1]")).then(jobidElement => {\r\n                            jobidElement.getText().then(jobid => {\r\n                                driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[3]")).then(statusElement => {\r\n                                    statusElement.getText().then(status => {\r\n                                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[4]")).then(cityElement => {\r\n                                            cityElement.getText().then(city => {\r\n                                                driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[5]")).then(stateElement => {\r\n                                                    stateElement.getText().then(state => {\r\n                                                        driver.findElement(By.xpath("//*[@name='PXForm']/table/tbody/tr[" + prime + "]/td[2]/a")).then(titleIDElement => {\r\n                                                            titleIDElement.click().then(() => {\r\n                                                                driver.findElement(By.xpath("//*[@class='DetailsTable']/tbody/tr[@id='Row_Req_LocationFK']")).then(descriptionElement => {\r\n                                                                    descriptionElement.getAttribute("outerHTML").then(description => {\r\n                                                                        driver.findElement(By.xpath("//*[@class='DetailsTable']/tbody/tr[@id='Row_Req_Description']")).then(QualificationElement => {\r\n                                                                            QualificationElement.getAttribute("outerHTML").then(qualification => {\r\n                                                                                driver.findElement(By.xpath("//*[@name='PXForm']//a[@title='Apply On-line']")).then(urlElement => {\r\n                                                                                    urlElement.getAttribute("href").then(url => {\r\n                                                                                        var applyUrl = url.split('&');\r\n                                                                                        url = applyUrl[0];\r\n                                                                                        url = url.replace('CanLogin.aspx?__JobID', 'JobDetails.aspx?__ID');\r\n                                                                                        driver.navigate().back().then(() => {\r\n                                                                                            job.JOB_TITLE = title;\r\n                                                                                            job.JDTID_UNIQUE_NUMBER = jobid;\r\n                                                                                            job.TEXT = description + qualification;\r\n                                                                                            job.TEXT = HtmlEscape(job.TEXT);\r\n                                                                                            job.JOB_CATEGORY = category;\r\n                                                                                            job.JOB_APPLY_URL = url;\r\n                                                                                            job.JOB_LOCATION_CITY = city;\r\n                                                                                            job.JOB_LOCATION_STATE = state;\r\n                                                                                            job.JOB_STATUS = status;\r\n                                                                                            jobMaker.successful.add(job);\r\n                                                                                            callback(false, botScheduleID);\r\n                                                                                        }).catch(e => { });\r\n                                                                                    }).catch(e => { });\r\n                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                            }).catch(e => { });\r\n                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                    }).catch(e => { });\r\n                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                            }).catch(e => { });\r\n                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                    }).catch(e => { });\r\n                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                            }).catch(e => { });\r\n                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                    }).catch(e => { });\r\n                }\r\n            });\r\n        }, function (err) {\r\n            if (err) { throw err; }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.xpath('//*[@title="Alt+n"]')).then(e => {\r\n            if (e.length == 1) {\r\n                driver.findElement(By.xpath('//*[@title="Alt+n"]')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async, thecallback, category);\r\n                    });\r\n                });\r\n            }\r\n            else {\r\n                driver.findElement(By.xpath('//*[@href="searchjobs.aspx"]')).then(searchELement => {\r\n                    searchELement.click().then(() => {\r\n                        var x = 1;\r\n                        thecallback();\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\nvar snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {\r\n    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "FeedGenerator").then(values => {\r\n        var snippet = package.resource.download.snippet("FeedGenerator");\r\n        var input = snippet.createInput(configuration, jobs);\r\n        snippet\r\n            .execute(input)\r\n            .then(jobcount => {\r\n                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);\r\n                onsuccess(output);\r\n            })\r\n            .catch(err => {\r\n                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n                onfailure(output);\r\n            });\r\n    });\r\n}\r\n	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	\N	2017-03-30 14:26:24.866-04	2017-03-30 14:26:24.866-04
25	23	Chrome	D:/Feeds/SunCoast	t	var Promise = require('promise');\r\nvar package = global.createPackage();\r\nvar he = require('he');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\nvar selenium = package.scrape.selenium();\r\nvar jobMaker = package.resource.download.variable("job");\r\njobMaker.setAlertCount(2);\r\nvar botScheduleID = "";\r\n\r\nexports.execute = (configuration) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var result = core(configuration, onsuccess, onfailure);\r\n        } catch (e) {\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        }\r\n    });\r\n}\r\n\r\nfunction HtmlEscape(description) {\r\n    description = he.encode(description, { 'useNamedReferences': true, 'decimal': true, 'allowUnsafeSymbols': true });\r\n    description = description.replace(/&#x9;/g, '');\r\n    description = description.replace(/^\\s+|\\s+$/g, '');\r\n    description = description.replace(/\\r?\\n|\\r/g, '');\r\n    return description;\r\n}\r\n\r\nvar core = (configuration, onsuccess, onfailure) => {\r\n    botScheduleID = configuration.scheduleid;\r\n    var By = selenium.By;\r\n    var until = selenium.until;\r\n    var async = require("async");\r\n    var driver = selenium.createDriver(configuration.configuration.execBotConfig.browsertype.toLowerCase());\r\n\r\n    var jobs = new Array();\r\n    var jobCount;\r\n    var atsJobCount;\r\n\r\n    driver.get('http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/search.do?functionName=getSearchCriteria');\r\n    driver.findElement(By.xpath('//*[@id="searchButton"]')).then(searchElement => {\r\n        searchElement.click().then(() => {\r\n            driver.findElement(By.xpath("//*[@id='searchResultsHeaderTable']/tbody/tr/td[1]/span")).then(recordsElement => {\r\n                recordsElement.getText().then(recordsCount => {\r\n                    var record = recordsCount.split("of");\r\n                    record = record[1].split("(");\r\n                    jobMaker.setatsJobCount(parseInt(record[0]));\r\n                    driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody')).then(e => {\r\n                        return !!e.length;\r\n                    }).then(data => {\r\n                        if (data == true) {\r\n                            new Promise((onsuccess, onfailure) => {\r\n                                try {\r\n                                    forEachTag(driver, By, until, jobs, async);\r\n                                } catch (e) {\r\n                                    onfailure(e);\r\n                                }\r\n                            })\r\n                        }\r\n                    });\r\n                });\r\n            });\r\n        });\r\n    })\r\n        .then(() => {\r\n            driver.quit();\r\n            snippet(configuration, jobMaker.atsJobCount, jobMaker.failedJobs.length, jobMaker, onsuccess, onfailure);\r\n        }, err => {\r\n            driver.quit();\r\n            var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, e);\r\n            onfailure(output);\r\n        });\r\n}\r\n\r\nfunction GetCount(jobList) {\r\n    jobCount = new Array();\r\n    for (var i = 2; i <= jobList.length; i++) {\r\n        jobCount.push(i);\r\n    }\r\n}\r\n\r\nvar forEachTag = (driver, By, until, jobs, async) => {\r\n    driver.findElements(By.xpath('//*[@id="searchResultsTable"]/tbody/tr')).then(jobList => {\r\n        GetCount(jobList);\r\n        async.eachSeries(jobCount, function (prime, callback) {\r\n            var job = jobMaker.create();\r\n            driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]')).then(titleElement => {\r\n                if (titleElement != null) {\r\n                    titleElement.getText().then(title => {\r\n                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[13]')).then(dateElement => {\r\n                            dateElement.getText().then(date => {\r\n                                driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[9]')).then(jobIDElement => {\r\n                                    jobIDElement.getText().then(id => {\r\n                                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[11]')).then(locationElement => {\r\n                                            locationElement.getText().then(location => {\r\n                                                driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]/a')).then(urlElement => {\r\n                                                    urlElement.getAttribute("href").then(url => {\r\n                                                        driver.findElement(By.xpath('//*[@id="searchResultsTable"]/tbody/tr[' + prime + ']/td[7]/a')).then(clickElement => {\r\n                                                            clickElement.click().then(() => {\r\n                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[3]/tbody/tr/td")).then(descriptionElement => {\r\n                                                                    descriptionElement.getAttribute("innerHTML").then(description => {\r\n                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[2]/td[1]/font/span")).then(element => {\r\n                                                                            element.getText().then(category => {\r\n                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[1]")).then(element => {\r\n                                                                                    element.getText().then(contactcompany => {\r\n                                                                                        driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[4]/td[1]")).then(element => {\r\n                                                                                            element.getText().then(jobtype => {\r\n                                                                                                driver.findElement(By.xpath("//*[@id='pc-rtg-main']/form/table[1]/tbody/tr[3]/td[2]")).then(element => {\r\n                                                                                                    element.getText().then(status => {\r\n                                                                                                        driver.navigate().back().then(() => {\r\n                                                                                                            job.JOB_TITLE = title;\r\n                                                                                                            job.JDTID_UNIQUE_NUMBER = id;\r\n                                                                                                            job.ASSIGNMENT_START_DATE = date;\r\n                                                                                                            job.JOB_CATEGORY = category;\r\n                                                                                                            if (description) {\r\n                                                                                                                var value = description.split("<table");\r\n                                                                                                                job.TEXT = value[0].replace("CB*", "").replace("<li><br>", "<li>").replace("<br><p>", "<p>").replace("<p></p>", "").replace("</p><br><ul> <br><ul><br><ul><br><li>", "</p><ul> <ul><ul><li>").replace("<br><br><br><br><br><br>", "<br>").replace(">Position Requirements<", "><br>Position Requirements<");\r\n                                                                                                                job.TEXT = job.TEXT + '<td width="10"> </td> <td> </td>';\r\n                                                                                                                job.TEXT = HtmlEscape(job.TEXT);\r\n                                                                                                            }\r\n                                                                                                            if (contactcompany) {\r\n                                                                                                                var company = contactcompany.split(":");\r\n                                                                                                                job.JOB_CONTACT_COMPANY = company[1];\r\n                                                                                                            }\r\n                                                                                                            if (jobtype) {\r\n                                                                                                                var type = jobtype.split(":");\r\n                                                                                                                job.JOB_TYPE = type[1];\r\n                                                                                                            }\r\n                                                                                                            if (status) {\r\n                                                                                                                var jobstatus = status.split(":");\r\n                                                                                                                job.JOB_STATUS = jobstatus[1];\r\n                                                                                                            }\r\n                                                                                                            job.JOB_APPLY_URL = url;\r\n                                                                                                            if (url) {\r\n                                                                                                                var applyurl = url.split("jobPostId=");\r\n                                                                                                                var apply = applyurl[1].split("&locale");\r\n                                                                                                                job.JOB_APPLY_URL = "http://careers.peopleclick.com/careerscp/client_hospice_fl_suncoast/external/gateway.do?functionName=viewFromLink&jobPostId=" + apply[0] + "&localeCode=en-us"\r\n                                                                                                            }\r\n                                                                                                            if (location) {\r\n                                                                                                                job.JOB_INDUSTRY = location;\r\n                                                                                                                var loc;\r\n                                                                                                                var value;\r\n                                                                                                                if (location.indexOf("-") > -1) {\r\n                                                                                                                    loc = location.split("-");\r\n                                                                                                                    value = loc[0].split(",");\r\n                                                                                                                    job.JOB_LOCATION_CITY = value[0];\r\n                                                                                                                    job.JOB_LOCATION_STATE = value[1];\r\n                                                                                                                }\r\n                                                                                                                else {\r\n                                                                                                                    loc = location.split(",");\r\n                                                                                                                    value = loc[1].split(" ");\r\n                                                                                                                    job.JOB_LOCATION_CITY = loc[0];\r\n                                                                                                                    job.JOB_LOCATION_STATE = value[1];\r\n                                                                                                                }\r\n                                                                                                            }\r\n                                                                                                            jobMaker.successful.add(job, botScheduleID);\r\n                                                                                                            callback(false);\r\n                                                                                                        }).catch(e => { });\r\n                                                                                                    }).catch(e => { });\r\n                                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                                            }).catch(e => { });\r\n                                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                                    }).catch(e => { });\r\n                                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                            }).catch(e => { });\r\n                                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                                    }).catch(e => { });\r\n                                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                            }).catch(e => { });\r\n                                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                                    }).catch(e => { });\r\n                                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                            }).catch(e => { });\r\n                                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                                    }).catch(e => { });\r\n                                }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                            }).catch(e => { });\r\n                        }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n                    }).catch(e => { });\r\n                }\r\n            }).catch(e => { failedJobCount = failedJobCount + 1 });\r\n        }, function (err) {\r\n            if (err) {\r\n                throw err;\r\n            }\r\n        });\r\n    }).then(() => {\r\n        driver.findElements(By.xpath('//input[@value=">"]')).then(e => {\r\n            if (e.length == 2) {\r\n                driver.findElement(By.xpath('//input[@value=">"]')).then(nextElement => {\r\n                    nextElement.click().then(() => {\r\n                        forEachTag(driver, By, until, jobs, async);\r\n                    });\r\n                });\r\n            }\r\n        });\r\n    });\r\n}\r\n\r\nvar snippet = (configuration, atsJobCount, failedJobCount, jobs, onsuccess, onfailure) => {\r\n    service.bot.setProgress(botScheduleID, log.logType.activity, log.activity.snippet.download + "FeedGenerator").then(values => {\r\n        var snippet = package.resource.download.snippet("FeedGenerator");\r\n        var input = snippet.createInput(configuration, jobs);\r\n        snippet\r\n            .execute(input)\r\n            .then(jobcount => {\r\n                var output = package.service.bot.createBotOutput(configuration.scheduleid, jobcount, jobMaker.atsJobCount, jobMaker.failedJobs.length);\r\n                onsuccess(output);\r\n            })\r\n            .catch(err => {\r\n                var output = package.service.bot.createBotErrorOutput(configuration.scheduleid, jobMaker.jobs.length, jobMaker.atsJobCount, jobMaker.failedJobs.length, err);\r\n                onfailure(output);\r\n            });\r\n    });\r\n}	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	\N	2017-03-30 15:31:54.393-04	2017-03-30 15:31:54.393-04
\.


--
-- Name: bothistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('bothistory_id_seq', 25, true);


--
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY client (id, name, active, retry, intreval, isconcurrent, created_at, updated_at) FROM stdin;
12	AlignTechnology	t	1	1	t	2017-03-30 09:10:54.935-04	2017-03-30 09:10:54.935-04
13	Premise	t	1	10	t	2017-03-30 14:20:05.302-04	2017-03-30 14:20:05.302-04
14	SunCoast	t	1	1	t	2017-03-30 15:31:32.128-04	2017-03-30 15:31:32.128-04
15	Wakemed	t	1	1	t	2017-03-31 11:29:15.718-04	2017-03-31 11:29:15.718-04
\.


--
-- Name: client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('client_id_seq', 15, true);


--
-- Name: clientbotconfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('clientbotconfig_id_seq', 19, true);


--
-- Data for Name: clientbotconfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY clientbotconfiguration (id, botconfigid, clientid, created_at, updated_at) FROM stdin;
17	21	12	2017-03-30 09:27:13.505-04	2017-03-30 09:27:13.505-04
18	22	13	2017-03-30 14:26:24.866-04	2017-03-30 14:26:24.866-04
19	23	14	2017-03-30 15:31:54.393-04	2017-03-30 15:31:54.393-04
\.


--
-- Data for Name: executionlogs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY executionlogs (id, botexecutionid, logtypeid, message, created_at, updated_at) FROM stdin;
1315	49	3	Scrape Initiated	2017-03-30 13:46:31.453-04	2017-03-30 13:46:31.453-04
1316	49	3	Loading Bot data from API	2017-03-30 13:46:56.618-04	2017-03-30 13:46:56.618-04
1317	49	3	Bot download started	2017-03-30 13:46:56.64-04	2017-03-30 13:46:56.64-04
1318	49	3	Scraping Started	2017-03-30 13:46:56.839-04	2017-03-30 13:46:56.839-04
1319	49	3	Loading snippet - Feed Generator	2017-03-30 13:49:42.029-04	2017-03-30 13:49:42.029-04
1320	49	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-30 13:49:42.044-04	2017-03-30 13:49:42.044-04
1321	49	3	Feed Generated Successfully	2017-03-30 13:49:42.164-04	2017-03-30 13:49:42.164-04
1322	49	3	Scraping Completed	2017-03-30 13:49:42.175-04	2017-03-30 13:49:42.175-04
1323	50	3	Scrape Initiated	2017-03-30 14:27:29.857-04	2017-03-30 14:27:29.857-04
1324	50	3	Loading Bot data from API	2017-03-30 14:27:57.488-04	2017-03-30 14:27:57.488-04
1325	50	3	Bot download started	2017-03-30 14:27:57.507-04	2017-03-30 14:27:57.507-04
1326	50	3	Scraping Started	2017-03-30 14:27:57.709-04	2017-03-30 14:27:57.709-04
1327	50	3	Loading snippet - Feed Generator	2017-03-30 14:30:41.097-04	2017-03-30 14:30:41.097-04
1328	50	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-30 14:30:41.117-04	2017-03-30 14:30:41.117-04
1329	50	3	Feed Generated Successfully	2017-03-30 14:30:41.236-04	2017-03-30 14:30:41.236-04
1330	50	3	Scraping Completed	2017-03-30 14:30:41.245-04	2017-03-30 14:30:41.245-04
1331	51	3	Scrape Initiated	2017-03-30 14:31:00.105-04	2017-03-30 14:31:00.105-04
1332	51	3	Loading Bot data from API	2017-03-30 14:31:02.819-04	2017-03-30 14:31:02.819-04
1333	51	3	Bot download started	2017-03-30 14:31:02.835-04	2017-03-30 14:31:02.835-04
1334	51	3	Scraping Started	2017-03-30 14:31:03.029-04	2017-03-30 14:31:03.029-04
1335	52	3	Scrape Initiated	2017-03-30 14:35:27.443-04	2017-03-30 14:35:27.443-04
1336	52	3	Loading Bot data from API	2017-03-30 14:35:32.151-04	2017-03-30 14:35:32.151-04
1337	52	3	Bot download started	2017-03-30 14:35:32.174-04	2017-03-30 14:35:32.174-04
1338	52	3	Scraping Started	2017-03-30 14:35:32.394-04	2017-03-30 14:35:32.394-04
1339	53	3	Scrape Initiated	2017-03-30 14:35:43.86-04	2017-03-30 14:35:43.86-04
1340	51	3	Loading snippet - FeedGenerator	2017-03-30 14:35:51.679-04	2017-03-30 14:35:51.679-04
1341	51	3	Writing Feed at : d:/feeds/Premise	2017-03-30 14:35:51.715-04	2017-03-30 14:35:51.715-04
1342	51	3	Feed Generated Successfully	2017-03-30 14:35:51.907-04	2017-03-30 14:35:51.907-04
1343	51	3	Scraping Completed	2017-03-30 14:35:51.916-04	2017-03-30 14:35:51.916-04
1344	53	3	Loading Bot data from API	2017-03-30 14:36:00.619-04	2017-03-30 14:36:00.619-04
1345	53	3	Bot download started	2017-03-30 14:36:00.638-04	2017-03-30 14:36:00.638-04
1346	53	3	Scraping Started	2017-03-30 14:36:00.859-04	2017-03-30 14:36:00.859-04
1347	53	3	Loading snippet - Feed Generator	2017-03-30 14:38:28.739-04	2017-03-30 14:38:28.739-04
1348	53	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-30 14:38:28.767-04	2017-03-30 14:38:28.767-04
1349	53	3	Feed Generated Successfully	2017-03-30 14:38:28.891-04	2017-03-30 14:38:28.891-04
1350	53	3	Scraping Completed	2017-03-30 14:38:28.899-04	2017-03-30 14:38:28.899-04
1351	52	3	Loading snippet - FeedGenerator	2017-03-30 14:39:59.079-04	2017-03-30 14:39:59.079-04
1352	52	3	Writing Feed at : d:/feeds/Premise	2017-03-30 14:39:59.105-04	2017-03-30 14:39:59.105-04
1353	52	3	Feed Generated Successfully	2017-03-30 14:39:59.275-04	2017-03-30 14:39:59.275-04
1354	52	3	Scraping Completed	2017-03-30 14:39:59.285-04	2017-03-30 14:39:59.285-04
1355	54	3	Scrape Initiated	2017-03-30 15:13:56.375-04	2017-03-30 15:13:56.375-04
1356	54	3	Loading Bot data from API	2017-03-30 15:13:59.58-04	2017-03-30 15:13:59.58-04
1357	54	3	Bot download started	2017-03-30 15:13:59.601-04	2017-03-30 15:13:59.601-04
1358	54	3	Scraping Started	2017-03-30 15:13:59.811-04	2017-03-30 15:13:59.811-04
1359	54	3	Loading snippet - Feed Generator	2017-03-30 15:16:35.392-04	2017-03-30 15:16:35.392-04
1360	54	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-30 15:16:35.416-04	2017-03-30 15:16:35.416-04
1361	54	3	Feed Generated Successfully	2017-03-30 15:16:35.523-04	2017-03-30 15:16:35.523-04
1362	54	3	Scraping Completed	2017-03-30 15:16:35.531-04	2017-03-30 15:16:35.531-04
1363	55	3	Scrape Initiated	2017-03-30 15:29:00.104-04	2017-03-30 15:29:00.104-04
1364	55	3	Loading Bot data from API	2017-03-30 15:29:20.185-04	2017-03-30 15:29:20.185-04
1365	55	3	Bot download started	2017-03-30 15:29:20.202-04	2017-03-30 15:29:20.202-04
1366	55	3	Scraping Started	2017-03-30 15:29:20.395-04	2017-03-30 15:29:20.395-04
1367	56	3	Scrape Initiated	2017-03-30 15:30:00.019-04	2017-03-30 15:30:00.019-04
1368	56	3	Loading Bot data from API	2017-03-30 15:30:10.381-04	2017-03-30 15:30:10.381-04
1369	56	3	Bot download started	2017-03-30 15:30:10.403-04	2017-03-30 15:30:10.403-04
1370	56	3	Scraping Started	2017-03-30 15:30:10.616-04	2017-03-30 15:30:10.616-04
1371	55	3	Loading snippet - Feed Generator	2017-03-30 15:31:55.512-04	2017-03-30 15:31:55.512-04
1372	55	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-30 15:31:55.526-04	2017-03-30 15:31:55.526-04
1373	55	3	Feed Generated Successfully	2017-03-30 15:31:55.642-04	2017-03-30 15:31:55.642-04
1374	55	3	Scraping Completed	2017-03-30 15:31:55.65-04	2017-03-30 15:31:55.65-04
1375	57	3	Scrape Initiated	2017-03-30 15:34:08.019-04	2017-03-30 15:34:08.019-04
1376	57	3	Loading Bot data from API	2017-03-30 15:34:18.065-04	2017-03-30 15:34:18.065-04
1377	57	3	Bot download started	2017-03-30 15:34:18.085-04	2017-03-30 15:34:18.085-04
1378	57	3	Scraping Started	2017-03-30 15:34:18.289-04	2017-03-30 15:34:18.289-04
1379	56	3	Loading snippet - FeedGenerator	2017-03-30 15:34:55.433-04	2017-03-30 15:34:55.433-04
1380	56	3	Writing Feed at : d:/feeds/Premise	2017-03-30 15:34:55.457-04	2017-03-30 15:34:55.457-04
1381	56	3	Feed Generated Successfully	2017-03-30 15:34:55.632-04	2017-03-30 15:34:55.632-04
1382	56	3	Scraping Completed	2017-03-30 15:34:55.643-04	2017-03-30 15:34:55.643-04
1383	58	3	Scrape Initiated	2017-03-30 15:36:00.026-04	2017-03-30 15:36:00.026-04
1384	58	3	Loading Bot data from API	2017-03-30 15:36:07.56-04	2017-03-30 15:36:07.56-04
1385	58	3	Bot download started	2017-03-30 15:36:07.575-04	2017-03-30 15:36:07.575-04
1386	58	3	Scraping Started	2017-03-30 15:36:07.771-04	2017-03-30 15:36:07.771-04
1387	57	3	Loading snippet - FeedGenerator	2017-03-30 15:39:17-04	2017-03-30 15:39:17-04
1388	57	3	Writing Feed at : d:/feeds/Premise	2017-03-30 15:39:17.025-04	2017-03-30 15:39:17.025-04
1389	57	3	Feed Generated Successfully	2017-03-30 15:39:17.24-04	2017-03-30 15:39:17.24-04
1390	57	3	Scraping Completed	2017-03-30 15:39:17.25-04	2017-03-30 15:39:17.25-04
1391	58	3	Loading snippet - FeedGenerator	2017-03-30 15:42:33.158-04	2017-03-30 15:42:33.158-04
1392	58	3	Writing Feed at : d:/feeds/SunCoast	2017-03-30 15:42:33.173-04	2017-03-30 15:42:33.173-04
1393	58	3	Feed Generated Successfully	2017-03-30 15:42:33.242-04	2017-03-30 15:42:33.242-04
1394	58	3	Scraping Completed	2017-03-30 15:42:33.25-04	2017-03-30 15:42:33.25-04
1395	59	3	Scrape Initiated	2017-03-31 03:06:19.833-04	2017-03-31 03:06:19.833-04
1396	59	3	Loading Bot data from API	2017-03-31 03:06:29.789-04	2017-03-31 03:06:29.789-04
1397	59	3	Bot download started	2017-03-31 03:06:29.804-04	2017-03-31 03:06:29.804-04
1398	59	3	Scraping Started	2017-03-31 03:06:31.084-04	2017-03-31 03:06:31.084-04
1399	59	3	Loading snippet - Feed Generator	2017-03-31 03:09:00.983-04	2017-03-31 03:09:00.983-04
1400	59	3	Writing Feed at : d:/feeds/AlignTechnology	2017-03-31 03:09:01.025-04	2017-03-31 03:09:01.025-04
1401	59	3	Feed Generated Successfully	2017-03-31 03:09:01.127-04	2017-03-31 03:09:01.127-04
1402	59	3	Scraping Completed	2017-03-31 03:09:01.137-04	2017-03-31 03:09:01.137-04
1403	60	3	Scrape Initiated	2017-03-31 03:09:46.181-04	2017-03-31 03:09:46.181-04
1404	60	3	Loading Bot data from API	2017-03-31 03:09:54.719-04	2017-03-31 03:09:54.719-04
1405	60	3	Bot download started	2017-03-31 03:09:54.736-04	2017-03-31 03:09:54.736-04
1406	60	3	Scraping Started	2017-03-31 03:09:54.925-04	2017-03-31 03:09:54.925-04
1407	60	1	Scraping Failed	2017-03-31 03:11:23.478-04	2017-03-31 03:11:23.478-04
1408	60	1	no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=57.0.2987.133)\n  (Driver info: chromedriver=2.27.440174 (e97a722caafc2d3a8b807ee115bfb307f7d2cfd9),platform=Windows NT 6.1.7601 SP1 x86_64) (WARNING: The server did not provide any stacktrace information)\nCommand duration or timeout: 1 milliseconds\nBuild info: version: '3.0.1', revision: '1969d75', time: '2016-10-18 09:48:19 -0700'\nSystem info: host: 'NYCLT8647', ip: '10.129.0.227', os.name: 'Windows 7', os.arch: 'amd64', os.version: '6.1', java.version: '1.8.0_121'\nDriver info: org.openqa.selenium.chrome.ChromeDriver\nCapabilities [{applicationCacheEnabled=false, rotatable=false, mobileEmulationEnabled=false, networkConnectionEnabled=false, chrome={chromedriverVersion=2.27.440174 (e97a722caafc2d3a8b807ee115bfb307f7d2cfd9), userDataDir=C:\\Users\\vsreeniv\\AppData\\Local\\Temp\\scoped_dir15464_23571}, takesHeapSnapshot=true, pageLoadStrategy=normal, databaseEnabled=false, handlesAlerts=true, hasTouchScreen=false, version=57.0.2987.133, platform=XP, browserConnectionEnabled=false, nativeEvents=true, acceptSslCerts=true, locationContextEnabled=true, webStorageEnabled=true, browserName=chrome, takesScreenshot=true, javascriptEnabled=true, cssSelectorsEnabled=true, unexpectedAlertBehaviour=}]\nSession ID: 546c13d51bb1d0ebb364c75cd36658b8\n*** Element info: {Using=css selector, value=.jv-pagination-next}	2017-03-31 03:11:23.494-04	2017-03-31 03:11:23.494-04
1409	61	3	Scrape Initiated	2017-03-31 10:16:26.705-04	2017-03-31 10:16:26.705-04
1410	62	3	Scrape Initiated	2017-03-31 10:16:32.409-04	2017-03-31 10:16:32.409-04
1411	63	3	Scrape Initiated	2017-03-31 10:16:37.135-04	2017-03-31 10:16:37.135-04
1412	61	3	Loading Bot data from API	2017-03-31 10:16:50.72-04	2017-03-31 10:16:50.72-04
1413	61	3	Bot download started	2017-03-31 10:16:50.737-04	2017-03-31 10:16:50.737-04
1414	62	3	Loading Bot data from API	2017-03-31 10:16:50.822-04	2017-03-31 10:16:50.822-04
1415	63	3	Loading Bot data from API	2017-03-31 10:16:50.824-04	2017-03-31 10:16:50.824-04
1416	62	3	Bot download started	2017-03-31 10:16:50.84-04	2017-03-31 10:16:50.84-04
1417	63	3	Bot download started	2017-03-31 10:16:50.842-04	2017-03-31 10:16:50.842-04
1418	61	3	Scraping Started	2017-03-31 10:16:51.069-04	2017-03-31 10:16:51.069-04
1419	63	3	Scraping Started	2017-03-31 10:16:51.071-04	2017-03-31 10:16:51.071-04
1420	62	3	Scraping Started	2017-03-31 10:16:51.073-04	2017-03-31 10:16:51.073-04
1421	64	3	Scrape Initiated	2017-03-31 10:17:06.88-04	2017-03-31 10:17:06.88-04
1422	64	3	Loading Bot data from API	2017-03-31 10:17:17.201-04	2017-03-31 10:17:17.201-04
1423	64	3	Bot download started	2017-03-31 10:17:17.218-04	2017-03-31 10:17:17.218-04
1424	64	3	Scraping Started	2017-03-31 10:17:17.513-04	2017-03-31 10:17:17.513-04
1425	62	3	Loading snippet - FeedGenerator	2017-03-31 10:21:35.777-04	2017-03-31 10:21:35.777-04
1426	62	3	Writing Feed at : d:/feeds/Premise	2017-03-31 10:21:35.815-04	2017-03-31 10:21:35.815-04
1427	62	3	Feed Generated Successfully	2017-03-31 10:21:36.044-04	2017-03-31 10:21:36.044-04
1428	62	3	Scraping Completed	2017-03-31 10:21:36.055-04	2017-03-31 10:21:36.055-04
1429	63	3	Loading snippet - FeedGenerator	2017-03-31 10:21:43.585-04	2017-03-31 10:21:43.585-04
1430	63	3	Writing Feed at : d:/feeds/Premise	2017-03-31 10:21:43.6-04	2017-03-31 10:21:43.6-04
1431	63	3	Feed Generated Successfully	2017-03-31 10:21:43.787-04	2017-03-31 10:21:43.787-04
1432	63	3	Scraping Completed	2017-03-31 10:21:43.796-04	2017-03-31 10:21:43.796-04
1433	64	3	Loading snippet - FeedGenerator	2017-03-31 10:22:01.551-04	2017-03-31 10:22:01.551-04
1434	64	3	Writing Feed at : d:/feeds/Premise	2017-03-31 10:22:01.578-04	2017-03-31 10:22:01.578-04
1435	64	3	Feed Generated Successfully	2017-03-31 10:22:01.755-04	2017-03-31 10:22:01.755-04
1436	64	3	Scraping Completed	2017-03-31 10:22:01.764-04	2017-03-31 10:22:01.764-04
1437	61	3	Loading snippet - FeedGenerator	2017-03-31 10:22:51.729-04	2017-03-31 10:22:51.729-04
1438	61	3	Writing Feed at : d:/feeds/SunCoast	2017-03-31 10:22:51.756-04	2017-03-31 10:22:51.756-04
1439	61	3	Feed Generated Successfully	2017-03-31 10:22:51.812-04	2017-03-31 10:22:51.812-04
1440	61	3	Scraping Completed	2017-03-31 10:22:51.819-04	2017-03-31 10:22:51.819-04
\.


--
-- Name: executionlogs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('executionlogs_id_seq', 1440, true);


--
-- Data for Name: logtype; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY logtype (id, name) FROM stdin;
1	Error
2	Warn
3	Info
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
Client 11 Trigger_1	Client Bot Execution	0 55 03 1/1 * ? *	America/New_York	ClientExecutionScheduler
Client 6 Trigger_1	Client Bot Execution	0 00 12 1/1 * ? *	America/New_York	ClientExecutionScheduler
Client 1 Trigger_1	Client Bot Execution	0 0 22 1/1 * ? *	Asia/Calcutta	ClientExecutionScheduler
Client 2 Trigger_1	Client Bot Execution	0 0 22 1/1 * ? *	Asia/Calcutta	ClientExecutionScheduler
Client 12 Trigger_1	Client Bot Execution	0 29 15 1/1 * ? *	America/New_York	ClientExecutionScheduler
Client 13 Trigger_1	Client Bot Execution	0 30 15 1/1 * ? *	America/New_York	ClientExecutionScheduler
Client 14 Trigger_1	Client Bot Execution	0 36 15 1/1 * ? *	America/New_York	ClientExecutionScheduler
Client 1 Trigger_2	Client Bot Execution	0 30 2 1/1 * ? *	Asia/Calcutta	ClientExecutionScheduler
Client 2 Trigger_2	Client Bot Execution	0 30 2 1/1 * ? *	Asia/Calcutta	ClientExecutionScheduler
\.


--
-- Data for Name: qrtz_fired_triggers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_fired_triggers (entry_id, trigger_name, trigger_group, instance_name, fired_time, priority, state, job_name, job_group, is_nonconcurrent, is_update_data, sched_name, sched_time, requests_recovery) FROM stdin;
\.


--
-- Data for Name: qrtz_job_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY qrtz_job_details (job_name, job_group, description, job_class_name, is_durable, is_nonconcurrent, is_update_data, sched_name, requests_recovery, job_data) FROM stdin;
Bot 1	FileWriterExecution	FileWriter For Bot 1	com.javacodegeeks.quartz.FileWriterService	t	f	f	FileWriterScheduler	f	\\xaced0005737200156f72672e71756172747a2e4a6f62446174614d61709fb083e8bfa9b0cb020000787200266f72672e71756172747a2e7574696c732e537472696e674b65794469727479466c61674d61708208e8c3fbc55d280200015a0013616c6c6f77735472616e7369656e74446174617872001d6f72672e71756172747a2e7574696c732e4469727479466c61674d617013e62ead28760ace0200025a000564697274794c00036d617074000f4c6a6176612f7574696c2f4d61703b787001737200116a6176612e7574696c2e486173684d61700507dac1c31660d103000246000a6c6f6164466163746f724900097468726573686f6c6478703f4000000000000c7708000000100000000274000866696c6554797065740003426f7474000666696c654944740001317800
Bot 16	FileWriterExecution	FileWriter For Bot 16	com.javacodegeeks.quartz.FileWriterService	t	f	f	FileWriterScheduler	f	\\xaced0005737200156f72672e71756172747a2e4a6f62446174614d61709fb083e8bfa9b0cb020000787200266f72672e71756172747a2e7574696c732e537472696e674b65794469727479466c61674d61708208e8c3fbc55d280200015a0013616c6c6f77735472616e7369656e74446174617872001d6f72672e71756172747a2e7574696c732e4469727479466c61674d617013e62ead28760ace0200025a000564697274794c00036d617074000f4c6a6176612f7574696c2f4d61703b787001737200116a6176612e7574696c2e486173684d61700507dac1c31660d103000246000a6c6f6164466163746f724900097468726573686f6c6478703f4000000000000c7708000000100000000274000866696c6554797065740003426f7474000666696c65494474000231367800
Client 1	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\xaced0005737200156f72672e71756172747a2e4a6f62446174614d61709fb083e8bfa9b0cb020000787200266f72672e71756172747a2e7574696c732e537472696e674b65794469727479466c61674d61708208e8c3fbc55d280200015a0013616c6c6f77735472616e7369656e74446174617872001d6f72672e71756172747a2e7574696c732e4469727479466c61674d617013e62ead28760ace0200025a000564697274794c00036d617074000f4c6a6176612f7574696c2f4d61703b787001737200116a6176612e7574696c2e486173684d61700507dac1c31660d103000246000a6c6f6164466163746f724900097468726573686f6c6478703f4000000000000c77080000001000000001740008636c69656e744944740001317800
Client 2	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\xaced0005737200156f72672e71756172747a2e4a6f62446174614d61709fb083e8bfa9b0cb020000787200266f72672e71756172747a2e7574696c732e537472696e674b65794469727479466c61674d61708208e8c3fbc55d280200015a0013616c6c6f77735472616e7369656e74446174617872001d6f72672e71756172747a2e7574696c732e4469727479466c61674d617013e62ead28760ace0200025a000564697274794c00036d617074000f4c6a6176612f7574696c2f4d61703b787001737200116a6176612e7574696c2e486173684d61700507dac1c31660d103000246000a6c6f6164466163746f724900097468726573686f6c6478703f4000000000000c77080000001000000001740008636c69656e744944740001327800
Bot 12	FileWriterExecution	FileWriter For Bot 12	com.javacodegeeks.quartz.FileWriterService	t	f	f	FileWriterScheduler	f	\\xaced0005737200156f72672e71756172747a2e4a6f62446174614d61709fb083e8bfa9b0cb020000787200266f72672e71756172747a2e7574696c732e537472696e674b65794469727479466c61674d61708208e8c3fbc55d280200015a0013616c6c6f77735472616e7369656e74446174617872001d6f72672e71756172747a2e7574696c732e4469727479466c61674d617013e62ead28760ace0200025a000564697274794c00036d617074000f4c6a6176612f7574696c2f4d61703b787001737200116a6176612e7574696c2e486173684d61700507dac1c31660d103000246000a6c6f6164466163746f724900097468726573686f6c6478703f4000000000000c7708000000100000000274000866696c6554797065740003426f7474000666696c65494474000231327800
Client 6	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23547565204d61722032382030383a30383a33362045445420323031370d0a636c69656e7449443d360d0a
FileWriter	FileWriterExecution	FileWriter	com.javacodegeeks.quartz.Job.FileWriterJob	t	f	f	NYCLT8647_FileWriterScheduler	f	\\x230d0a23576564204d61722032392030333a33303a31382045445420323031370d0a
BotExecution	BotExecution	Bot Execution	com.javacodegeeks.quartz.Job.BotExecutionJob	t	f	f	BotExecutionScheduler	f	\\x230d0a23576564204d61722032392030353a32323a32342045445420323031370d0a
Client 11	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23546875204d61722033302030333a35343a30362045445420323031370d0a636c69656e7449443d31310d0a
Client 12	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23546875204d61722033302031353a32373a34302045445420323031370d0a636c69656e7449443d31320d0a
Client 13	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23546875204d61722033302031353a32373a35332045445420323031370d0a636c69656e7449443d31330d0a
Client 14	ClientBotExecution	BotExecution For Client	com.javacodegeeks.quartz.Job.ClientExecutionJob	t	f	f	ClientExecutionScheduler	f	\\x230d0a23546875204d61722033302031353a33323a35322045445420323031370d0a636c69656e7449443d31340d0a
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
STATE_ACCESS	BotExecutionScheduler
STATE_ACCESS	ClientExecutionScheduler
STATE_ACCESS	NYCLT8647_FileWriterScheduler
TRIGGER_ACCESS	NYCLT8647_FileWriterScheduler
TRIGGER_ACCESS	BotExecutionScheduler
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
NYCLT86471490982339923	1490994040707	20000	BotExecutionScheduler
NYCLT86471490982340233	1490994040758	20000	ClientExecutionScheduler
NYCLT86471490982340322	1490994040906	20000	NYCLT8647_FileWriterScheduler
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
Client 14 Trigger_1	Client Bot Execution	Client 14	ClientBotExecution	\N	1491075360000	1490988960000	5	WAITING	CRON	1490902371000	0	\N	0	\\x	ClientExecutionScheduler
Client 1 Trigger_2	Client Bot Execution	Client 1	ClientBotExecution	\N	1491080400000	1490994000000	5	WAITING	CRON	1488362155000	0	\N	0	\\x	ClientExecutionScheduler
Client 11 Trigger_1	Client Bot Execution	Client 11	ClientBotExecution	\N	1491033300000	1490946900000	5	WAITING	CRON	1490860446000	0	\N	0	\\x	ClientExecutionScheduler
Client 2 Trigger_2	Client Bot Execution	Client 2	ClientBotExecution	\N	1491080400000	1490994000000	5	WAITING	CRON	1488362176000	0	\N	0	\\x	ClientExecutionScheduler
Client 6 Trigger_1	Client Bot Execution	Client 6	ClientBotExecution	\N	1491062400000	1490976000000	5	WAITING	CRON	1490702916000	0	\N	0	\\x	ClientExecutionScheduler
Client 1 Trigger_1	Client Bot Execution	Client 1	ClientBotExecution	\N	1491064200000	1490982340334	5	WAITING	CRON	1488362155000	0	\N	0	\\x	ClientExecutionScheduler
Client 2 Trigger_1	Client Bot Execution	Client 2	ClientBotExecution	\N	1491064200000	1490982340354	5	WAITING	CRON	1488362176000	0	\N	0	\\x	ClientExecutionScheduler
Client 12 Trigger_1	Client Bot Execution	Client 12	ClientBotExecution	\N	1491074940000	1490988540000	5	WAITING	CRON	1490902060000	0	\N	0	\\x	ClientExecutionScheduler
Client 13 Trigger_1	Client Bot Execution	Client 13	ClientBotExecution	\N	1491075000000	1490988600000	5	WAITING	CRON	1490902073000	0	\N	0	\\x	ClientExecutionScheduler
\.


--
-- Data for Name: scheduleexecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY scheduleexecution (id, userdetailid, clientid, created_at, updated_at) FROM stdin;
57	3	12	2017-03-30 09:28:17.579-04	2017-03-30 09:28:17.579-04
58	3	12	2017-03-30 09:32:48.485-04	2017-03-30 09:32:48.485-04
59	3	12	2017-03-30 09:56:44.595-04	2017-03-30 09:56:44.595-04
60	1	12	2017-03-30 10:05:00.021-04	2017-03-30 10:05:00.021-04
61	3	12	2017-03-30 10:13:11.163-04	2017-03-30 10:13:11.163-04
62	3	12	2017-03-30 10:18:33.743-04	2017-03-30 10:18:33.743-04
63	1	12	2017-03-30 10:30:00.029-04	2017-03-30 10:30:00.029-04
64	3	12	2017-03-30 11:34:43.669-04	2017-03-30 11:34:43.669-04
66	3	12	2017-03-30 12:41:44.357-04	2017-03-30 12:41:44.357-04
67	3	12	2017-03-30 13:17:53.807-04	2017-03-30 13:17:53.807-04
68	3	12	2017-03-30 13:18:53.839-04	2017-03-30 13:18:53.839-04
69	3	12	2017-03-30 13:21:34.383-04	2017-03-30 13:21:34.383-04
70	1	12	2017-03-30 13:27:00.025-04	2017-03-30 13:27:00.025-04
71	3	12	2017-03-30 13:36:06.476-04	2017-03-30 13:36:06.476-04
72	3	12	2017-03-30 13:46:31.419-04	2017-03-30 13:46:31.419-04
73	3	12	2017-03-30 14:27:29.817-04	2017-03-30 14:27:29.817-04
74	1	13	2017-03-30 14:31:00.024-04	2017-03-30 14:31:00.024-04
75	3	13	2017-03-30 14:35:27.416-04	2017-03-30 14:35:27.416-04
76	3	12	2017-03-30 14:35:43.852-04	2017-03-30 14:35:43.852-04
77	3	12	2017-03-30 15:13:56.332-04	2017-03-30 15:13:56.332-04
78	1	12	2017-03-30 15:29:00.018-04	2017-03-30 15:29:00.018-04
79	1	13	2017-03-30 15:30:00.008-04	2017-03-30 15:30:00.008-04
80	3	13	2017-03-30 15:34:07.972-04	2017-03-30 15:34:07.972-04
81	1	14	2017-03-30 15:36:00.018-04	2017-03-30 15:36:00.018-04
82	3	12	2017-03-31 03:06:19.683-04	2017-03-31 03:06:19.683-04
83	3	12	2017-03-31 03:09:46.085-04	2017-03-31 03:09:46.085-04
85	3	14	2017-03-31 10:16:26.662-04	2017-03-31 10:16:26.662-04
86	3	13	2017-03-31 10:16:32.383-04	2017-03-31 10:16:32.383-04
87	3	13	2017-03-31 10:16:37.102-04	2017-03-31 10:16:37.102-04
88	3	13	2017-03-31 10:17:06.856-04	2017-03-31 10:17:06.856-04
\.


--
-- Name: scheduleexecution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('scheduleexecution_id_seq', 88, true);


--
-- Data for Name: snippet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY snippet (id, userdetailid, name, active, script, filepath, created_at, updated_at, description) FROM stdin;
6	3	FeedGenerator	t	﻿var package = global.createPackage();\r\nvar async = require("async");\r\nvar fs = require('fs');\r\nvar jsonxml = require('jsontoxml');\r\nvar he = require('he');\r\nvar path = require('path');\r\nvar service = package.service;\r\nvar resource = package.resource;\r\nvar log = resource.constants.log;\r\n\r\nexports.createInput = (configuration, jobs) => {\r\n    return new snippetInput(configuration, jobs);\r\n}\r\n\r\nfunction snippetInput(configuration, jobs) {\r\n\r\n    var input = {\r\n        jobs: jobs.jobs,\r\n        path: package.config.outputRoot + configuration.configuration.execBotConfig.botClientConfig.clientDetails.name,\r\n        filename: configuration.configuration.execBotConfig.name + ".xml",\r\n        botScheduleId: configuration.scheduleid\r\n    };\r\n\r\n    return input;\r\n\r\n}\r\n\r\nexports.execute = (input) => {\r\n    return new Promise((onsuccess, onfailure) => {\r\n        try {\r\n            var normalizedPath = path.normalize(input.path + "/");\r\n            package.util.createDirectory(normalizedPath)\r\n                .then(() => {\r\n                    service.bot.setProgress(input.botScheduleId, log.logType.activity, log.activity.snippet.started + input.path).then(values => {\r\n                        var jobs = { "Objects": input.jobs };\r\n                        var data = jsonxml(jobs, { escape: true, xmlHeader: true });\r\n                        data = he.encode(data, {\r\n                            'useNamedReferences': true,\r\n                            'allowUnsafeSymbols': true\r\n                        });\r\n                        fs.writeFile(normalizedPath + input.filename, data, function (err) {\r\n                            if (err) {\r\n                                onfailure(err);\r\n                            }\r\n                            service.bot.setProgress(input.botScheduleId, log.logType.activity, log.activity.snippet.completed).then(values => {\r\n                                onsuccess(input.jobs.length);\r\n                            });\r\n                        });\r\n                    });\r\n                })\r\n                .catch((err) => {\r\n                    onfailure(err);\r\n                });\r\n\r\n        } catch (e) {\r\n            console.log(e);\r\n        }\r\n    });\r\n}	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	2017-03-30 09:13:50.422-04	2017-03-30 09:13:50.422-04	FeedGenerator
\.


--
-- Name: snippet_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('snippet_id_seq', 6, true);


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
3	rsiva	t	2017-02-07 01:54:07.757-05	2017-02-07 01:54:07.757-05
1	admin	t	1991-02-02 00:00:00-05	1991-02-02 00:00:00-05
\.


--
-- Name: userdetail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('userdetail_id_seq', 3, true);


--
-- Data for Name: variabletype; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY variabletype (id, userdetailid, name, active, script, filepath, isdeleted, created_at, updated_at, description) FROM stdin;
3	3	job	t	﻿exports.create = () => {\r\n    return new jobviper();\r\n}\r\nvar service = require(global.file.service);\r\nvar resource = require(global.file.resource);\r\nvar jobs = new Array();\r\nvar failedJobs = new Array();\r\nvar atsJobCount = 0;\r\nvar alertCount = 40;\r\n\r\nfunction jobviper() {\r\n    this.JDTID_UNIQUE_NUMBER = "";\r\n    this.ASSIGNMENT_START_DATE = "";\r\n    this.OTHER_LOCATIONS = "";\r\n    this.OTHER_CATEGORIEs = "";\r\n    this.COMPANY_URL = "";\r\n    this.EDUCATION = "";\r\n    this.EMAIL_FOR_RESUMES = "";\r\n    this.JOB_APPLY_URL = "";\r\n    this.JOB_APPLY_URL_LIST = "";\r\n    this.JOB_APPLY_URL_NAMES = "";\r\n    this.JOB_CATEGORY = "";\r\n    this.JOB_CONTACT_COMPANY = "";\r\n    this.JOB_CONTACT_CITY = "";\r\n    this.JOB_CONTACT_COUNTRY = "";\r\n    this.JOB_CONTACT_FAMILYNAME = "";\r\n    this.JOB_CONTACT_FAX = "";\r\n    this.JOB_CONTACT_GIVENNAME = "";\r\n    this.JOB_CONTACT_NAME = "";\r\n    this.JOB_CONTACT_PHONE = "";\r\n    this.JOB_CONTACT_STATE = "";\r\n    this.JOB_CONTACT_ZIP = "";\r\n    this.JOB_INDUSTRY = "";\r\n    this.JOB_LOCATION_COUNTRY = "";\r\n    this.JOB_LOCATION_CITY = "";\r\n    this.JOB_LOCATION_STATE = "";\r\n    this.JOB_LOCATION_ZIP = "";\r\n    this.JOB_CONTACT_ADDRESS = "";\r\n    this.JOB_SALARY = "";\r\n    this.JOB_SALARY_FROM = "";\r\n    this.JOB_SALARY_TO = "";\r\n    this.JOB_SHOW_CONTACT = "";\r\n    this.JOB_STATUS = "";\r\n    this.JOB_TITLE = "";\r\n    this.JOB_TYPE = "";\r\n    this.NOTES_FOR_INVOICE = "";\r\n    this.NUMBER_TO_FILL = "";\r\n    this.PO_NUMBER = "";\r\n    this.QUALIFICATIONS = "";\r\n    this.RELOCATION = "";\r\n    this.SALARYTIME = "";\r\n    this.TEXT = "";\r\n    this.TRAVEL = "";\r\n}\r\n\r\nexports.failed = {\r\n    add: (jobid, err) => {\r\n        this.failedJobs.push({\r\n            jobid: jobid,\r\n            error: err\r\n        });\r\n    }\r\n}\r\n\r\nexports.successful = {\r\n    add: (job, botScheduleID) => {\r\n        var data = { "VIPER_JOB": job };\r\n        this.jobs.push(data);\r\n\r\n        if (this.jobs.length % this.alertCount == 0 && this.jobs.length < this.atsJobCount)\r\n            service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.inprogress, this.jobs.length, this.atsJobCount, this.failedJobs.length)\r\n                .then((data) => {\r\n                });\r\n    }\r\n}\r\n\r\nexports.setAlertCount = function (value) {\r\n    this.alertCount = value;\r\n}\r\n\r\nexports.setatsJobCount = function (value) {\r\n    this.atsJobCount = value;\r\n}\r\n\r\nexports.jobs = jobs;\r\nexports.failedJobs = failedJobs;\r\nexports.atsJobCount = atsJobCount;	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	f	2017-03-30 09:15:01.208-04	2017-03-30 09:15:01.208-04	job model
\.


--
-- Name: variabletype_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('variabletype_id_seq', 3, true);


--
-- Data for Name: variabletypehistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY variabletypehistory (id, variabletypeid, active, script, filepath, message, created_at, updated_at, variabletypename, description) FROM stdin;
2	3	t	﻿exports.create = () => {\r\n    return new jobviper();\r\n}\r\nvar service = require(global.file.service);\r\nvar resource = require(global.file.resource);\r\nvar jobs = new Array();\r\nvar failedJobs = new Array();\r\nvar atsJobCount = 0;\r\nvar alertCount = 40;\r\n\r\nfunction jobviper() {\r\n    this.JDTID_UNIQUE_NUMBER = "";\r\n    this.ASSIGNMENT_START_DATE = "";\r\n    this.OTHER_LOCATIONS = "";\r\n    this.OTHER_CATEGORIEs = "";\r\n    this.COMPANY_URL = "";\r\n    this.EDUCATION = "";\r\n    this.EMAIL_FOR_RESUMES = "";\r\n    this.JOB_APPLY_URL = "";\r\n    this.JOB_APPLY_URL_LIST = "";\r\n    this.JOB_APPLY_URL_NAMES = "";\r\n    this.JOB_CATEGORY = "";\r\n    this.JOB_CONTACT_COMPANY = "";\r\n    this.JOB_CONTACT_CITY = "";\r\n    this.JOB_CONTACT_COUNTRY = "";\r\n    this.JOB_CONTACT_FAMILYNAME = "";\r\n    this.JOB_CONTACT_FAX = "";\r\n    this.JOB_CONTACT_GIVENNAME = "";\r\n    this.JOB_CONTACT_NAME = "";\r\n    this.JOB_CONTACT_PHONE = "";\r\n    this.JOB_CONTACT_STATE = "";\r\n    this.JOB_CONTACT_ZIP = "";\r\n    this.JOB_INDUSTRY = "";\r\n    this.JOB_LOCATION_COUNTRY = "";\r\n    this.JOB_LOCATION_CITY = "";\r\n    this.JOB_LOCATION_STATE = "";\r\n    this.JOB_LOCATION_ZIP = "";\r\n    this.JOB_CONTACT_ADDRESS = "";\r\n    this.JOB_SALARY = "";\r\n    this.JOB_SALARY_FROM = "";\r\n    this.JOB_SALARY_TO = "";\r\n    this.JOB_SHOW_CONTACT = "";\r\n    this.JOB_STATUS = "";\r\n    this.JOB_TITLE = "";\r\n    this.JOB_TYPE = "";\r\n    this.NOTES_FOR_INVOICE = "";\r\n    this.NUMBER_TO_FILL = "";\r\n    this.PO_NUMBER = "";\r\n    this.QUALIFICATIONS = "";\r\n    this.RELOCATION = "";\r\n    this.SALARYTIME = "";\r\n    this.TEXT = "";\r\n    this.TRAVEL = "";\r\n}\r\n\r\nexports.failed = {\r\n    add: (jobid, err) => {\r\n        this.failedJobs.push({\r\n            jobid: jobid,\r\n            error: err\r\n        });\r\n    }\r\n}\r\n\r\nexports.successful = {\r\n    add: (job, botScheduleID) => {\r\n        var data = { "VIPER_JOB": job };\r\n        this.jobs.push(data);\r\n\r\n        if (this.jobs.length % this.alertCount == 0 && this.jobs.length < this.atsJobCount)\r\n            service.bot.updatedScheduleStatus(botScheduleID, resource.constants.log.activity.scrapeType.inprogress, this.jobs.length, this.atsJobCount, this.failedJobs.length)\r\n                .then((data) => {\r\n                });\r\n    }\r\n}\r\n\r\nexports.setAlertCount = function (value) {\r\n    this.alertCount = value;\r\n}\r\n\r\nexports.setatsJobCount = function (value) {\r\n    this.atsJobCount = value;\r\n}\r\n\r\nexports.jobs = jobs;\r\nexports.failedJobs = failedJobs;\r\nexports.atsJobCount = atsJobCount;	D:/SeleniumScraper/SS_BackUp/Source/Application/SS.Framework	\N	2017-03-30 09:15:01.237-04	2017-03-30 09:15:01.237-04	job	job model
\.


--
-- Name: variabletypehistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('variabletypehistory_id_seq', 2, true);


--
-- Name: batchserverdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY batchserverdetails
    ADD CONSTRAINT batchserverdetails_pkey PRIMARY KEY (id);


--
-- Name: botconfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY botconfiguration
    ADD CONSTRAINT botconfig_pkey PRIMARY KEY (id);


--
-- Name: botexecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_pkey PRIMARY KEY (id);


--
-- Name: botexecutionstatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY botexecutionstatus
    ADD CONSTRAINT botexecutionstatus_pkey PRIMARY KEY (id);


--
-- Name: botexexcutionserverdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY botexecutionserverdetails
    ADD CONSTRAINT botexexcutionserverdetails_pkey PRIMARY KEY (id);


--
-- Name: bothistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY bothistory
    ADD CONSTRAINT bothistory_pkey PRIMARY KEY (id);


--
-- Name: client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: clientbotconfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_pkey PRIMARY KEY (id);


--
-- Name: executionlogs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_pkey PRIMARY KEY (id);


--
-- Name: logtype_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY logtype
    ADD CONSTRAINT logtype_pkey PRIMARY KEY (id);


--
-- Name: packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: qrtz_blob_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_blob_triggers
    ADD CONSTRAINT qrtz_blob_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_calendars
    ADD CONSTRAINT qrtz_calendars_pkey PRIMARY KEY (sched_name, calendar_name);


--
-- Name: qrtz_cron_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_cron_triggers
    ADD CONSTRAINT qrtz_cron_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_fired_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_fired_triggers
    ADD CONSTRAINT qrtz_fired_triggers_pkey PRIMARY KEY (sched_name, entry_id);


--
-- Name: qrtz_job_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_job_details
    ADD CONSTRAINT qrtz_job_details_pkey PRIMARY KEY (sched_name, job_name, job_group);


--
-- Name: qrtz_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_locks
    ADD CONSTRAINT qrtz_locks_pkey PRIMARY KEY (sched_name, lock_name);


--
-- Name: qrtz_paused_trigger_grps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_paused_trigger_grps
    ADD CONSTRAINT qrtz_paused_trigger_grps_pkey PRIMARY KEY (sched_name, trigger_group);


--
-- Name: qrtz_scheduler_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_scheduler_state
    ADD CONSTRAINT qrtz_scheduler_state_pkey PRIMARY KEY (sched_name, instance_name);


--
-- Name: qrtz_simple_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_simple_triggers
    ADD CONSTRAINT qrtz_simple_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simprop_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_simprop_triggers
    ADD CONSTRAINT qrtz_simprop_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY qrtz_triggers
    ADD CONSTRAINT qrtz_triggers_pkey PRIMARY KEY (sched_name, trigger_name, trigger_group);


--
-- Name: scheduleexecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_pkey PRIMARY KEY (id);


--
-- Name: snippet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY snippet
    ADD CONSTRAINT snippet_pkey PRIMARY KEY (id);


--
-- Name: snippethistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY snippethistory
    ADD CONSTRAINT snippethistory_pkey PRIMARY KEY (id);


--
-- Name: userdetail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY userdetail
    ADD CONSTRAINT userdetail_pkey PRIMARY KEY (id);


--
-- Name: variabletype_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY variabletype
    ADD CONSTRAINT variabletype_pkey PRIMARY KEY (id);


--
-- Name: variabletypehistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace: 
--

ALTER TABLE ONLY variabletypehistory
    ADD CONSTRAINT variabletypehistory_pkey PRIMARY KEY (id);


--
-- Name: fki_qrtz_simple_triggers_job_details_name_group; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX fki_qrtz_simple_triggers_job_details_name_group ON qrtz_triggers USING btree (job_name, job_group);


--
-- Name: fki_qrtz_simple_triggers_qrtz_triggers; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX fki_qrtz_simple_triggers_qrtz_triggers ON qrtz_simple_triggers USING btree (trigger_name, trigger_group);


--
-- Name: idx_qrtz_ft_j_g; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_ft_j_g ON qrtz_fired_triggers USING btree (sched_name, job_name, job_group);


--
-- Name: idx_qrtz_ft_jg; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_ft_jg ON qrtz_fired_triggers USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_ft_t_g; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_ft_t_g ON qrtz_fired_triggers USING btree (sched_name, trigger_name, trigger_group);


--
-- Name: idx_qrtz_ft_tg; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_ft_tg ON qrtz_fired_triggers USING btree (sched_name, trigger_group);


--
-- Name: idx_qrtz_ft_trig_inst_name; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_ft_trig_inst_name ON qrtz_fired_triggers USING btree (sched_name, instance_name);


--
-- Name: idx_qrtz_j_grp; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_j_grp ON qrtz_job_details USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_t_c; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_c ON qrtz_triggers USING btree (sched_name, calendar_name);


--
-- Name: idx_qrtz_t_g; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_g ON qrtz_triggers USING btree (sched_name, trigger_group);


--
-- Name: idx_qrtz_t_j; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_j ON qrtz_triggers USING btree (sched_name, job_name, job_group);


--
-- Name: idx_qrtz_t_jg; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_jg ON qrtz_triggers USING btree (sched_name, job_group);


--
-- Name: idx_qrtz_t_n_g_state; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_n_g_state ON qrtz_triggers USING btree (sched_name, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_n_state; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_n_state ON qrtz_triggers USING btree (sched_name, trigger_name, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_next_fire_time; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_next_fire_time ON qrtz_triggers USING btree (sched_name, next_fire_time);


--
-- Name: idx_qrtz_t_nft_misfire; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_nft_misfire ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time);


--
-- Name: idx_qrtz_t_nft_st; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_nft_st ON qrtz_triggers USING btree (sched_name, trigger_state, next_fire_time);


--
-- Name: idx_qrtz_t_nft_st_misfire; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_nft_st_misfire ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time, trigger_state);


--
-- Name: idx_qrtz_t_nft_st_misfire_grp; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_nft_st_misfire_grp ON qrtz_triggers USING btree (sched_name, misfire_instr, next_fire_time, trigger_group, trigger_state);


--
-- Name: idx_qrtz_t_state; Type: INDEX; Schema: public; Owner: postgres; Tablespace: 
--

CREATE INDEX idx_qrtz_t_state ON qrtz_triggers USING btree (sched_name, trigger_state);


--
-- Name: botconfig_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botconfiguration
    ADD CONSTRAINT botconfig_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: botexecution_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: botexecution_botexecutionstatusid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_botexecutionstatusid_fkey FOREIGN KEY (botexecutionstatusid) REFERENCES botexecutionstatus(id);


--
-- Name: botexecution_scheduleexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_scheduleexecutionid_fkey FOREIGN KEY (scheduleexecutionid) REFERENCES scheduleexecution(id);


--
-- Name: botexecution_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecution
    ADD CONSTRAINT botexecution_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: botexexcutionserverdetails_botexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY botexecutionserverdetails
    ADD CONSTRAINT botexexcutionserverdetails_botexecutionid_fkey FOREIGN KEY (botexecutionid) REFERENCES botexecution(id);


--
-- Name: bothistory_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY bothistory
    ADD CONSTRAINT bothistory_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: clientbotconfig_botconfigid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_botconfigid_fkey FOREIGN KEY (botconfigid) REFERENCES botconfiguration(id);


--
-- Name: clientbotconfig_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY clientbotconfiguration
    ADD CONSTRAINT clientbotconfig_clientid_fkey FOREIGN KEY (clientid) REFERENCES client(id);


--
-- Name: executionlogs_botexecutionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_botexecutionid_fkey FOREIGN KEY (botexecutionid) REFERENCES botexecution(id);


--
-- Name: executionlogs_logtypeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY executionlogs
    ADD CONSTRAINT executionlogs_logtypeid_fkey FOREIGN KEY (logtypeid) REFERENCES logtype(id);


--
-- Name: qrtz_blob_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_blob_triggers
    ADD CONSTRAINT qrtz_blob_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_cron_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_cron_triggers
    ADD CONSTRAINT qrtz_cron_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simple_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simple_triggers
    ADD CONSTRAINT qrtz_simple_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_simprop_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_simprop_triggers
    ADD CONSTRAINT qrtz_simprop_triggers_sched_name_fkey FOREIGN KEY (sched_name, trigger_name, trigger_group) REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group);


--
-- Name: qrtz_triggers_sched_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY qrtz_triggers
    ADD CONSTRAINT qrtz_triggers_sched_name_fkey FOREIGN KEY (sched_name, job_name, job_group) REFERENCES qrtz_job_details(sched_name, job_name, job_group);


--
-- Name: scheduleexecution_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_clientid_fkey FOREIGN KEY (clientid) REFERENCES client(id);


--
-- Name: scheduleexecution_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY scheduleexecution
    ADD CONSTRAINT scheduleexecution_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: snippet_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippet
    ADD CONSTRAINT snippet_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: snippethistory_snippetid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY snippethistory
    ADD CONSTRAINT snippethistory_snippetid_fkey FOREIGN KEY (snippetid) REFERENCES snippet(id);


--
-- Name: variabletype_userdetailid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletype
    ADD CONSTRAINT variabletype_userdetailid_fkey FOREIGN KEY (userdetailid) REFERENCES userdetail(id);


--
-- Name: variabletypehistory_variabletypeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY variabletypehistory
    ADD CONSTRAINT variabletypehistory_variabletypeid_fkey FOREIGN KEY (variabletypeid) REFERENCES variabletype(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

