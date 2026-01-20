SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict WeY2qHvIzEhgHubYdvuNIlJZ0frOjuQf4JrgMeOqfPTqEWh71F5IhHI6pDHIS8c

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000001', 'e01e1574-8276-4747-9f7e-c44146231dc8', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test@mars.teampps.com","user_id":"e1e806b1-c51b-46dd-97e5-d2f7913d1145","user_phone":""}}', '2025-11-14 07:37:26.138508+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e01e1574-8276-4747-9f7e-c44146231dc9', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"system@mars.teampps.com","user_id":"e1e806b1-c51b-46dd-97e5-d2f7913d1145","user_phone":""}}', '2025-11-14 07:37:26.138508+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000001', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'authenticated', 'authenticated', 'test@mars.teampps.com', '$2a$10$CejKbimUasB2Bll63fKw5.013WaWac3Kv0ytmXoXWn.P4we5uKrVC', '2025-11-14 07:37:26.144211+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-14 07:37:26.128106+00', '2025-11-14 07:37:26.146009+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'system@mars.teampps.com', '$2a$10$CejKbimUasB2Bll63fKw5.013WaWac3Kv0ytmXoXWn.P4we5uKrVC', '2025-11-14 07:37:26.144211+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-14 07:37:26.128106+00', '2025-11-14 07:37:26.146009+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '{"sub": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "email": "test@mars.teampps.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-14 07:37:26.134222+00', '2025-11-14 07:37:26.134288+00', '2025-11-14 07:37:26.134288+00', 'b0390ff8-8b35-414f-bfa7-fc6f1cfe94b1'),
	('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{"sub": "00000000-0000-0000-0000-000000000000", "email": "system@mars.teampps.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-14 07:37:26.134222+00', '2025-11-14 07:37:26.134288+00', '2025-11-14 07:37:26.134288+00', 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: sap_material_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: material_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: material_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "email", "created_at", "updated_at") VALUES
	('e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'test', 'test@mars.teampps.com', '2025-11-14 07:37:26.127566+00', '2025-11-14 07:37:26.127566+00'),
	('00000000-0000-0000-0000-000000000000', 'system', 'system@mars.teampps.com', '2025-11-14 07:37:26.127566+00', '2025-11-14 07:37:26.127566+00');


--
-- Data for Name: review_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: review_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: review_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: review_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: audit_logs_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."audit_logs_audit_id_seq"', 4, true);


--
-- Name: material_insights_insight_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."material_insights_insight_id_seq"', 12, true);


--
-- Name: material_reviews_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."material_reviews_review_id_seq"', 1, true);


--
-- Name: review_attachments_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."review_attachments_attachment_id_seq"', 1, false);


--
-- Name: review_checklist_checklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."review_checklist_checklist_id_seq"', 1, true);


--
-- Name: review_comments_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."review_comments_comment_id_seq"', 1, false);


--
-- Name: review_schedules_schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."review_schedules_schedule_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
-- (Skipped - supabase_functions schema only exists in local Supabase)
--


--
-- PostgreSQL database dump complete
--

-- \unrestrict WeY2qHvIzEhgHubYdvuNIlJZ0frOjuQf4JrgMeOqfPTqEWh71F5IhHI6pDHIS8c


-- Seed system user with admin role
INSERT INTO "public"."user_roles" ("user_role_id", "user_id", "role_id", "valid_from", "valid_to", "assigned_by", "assigned_at", "revoked_by", "revoked_at", "is_active") 
VALUES
('1', '00000000-0000-0000-0000-000000000000', '14', '2025-12-15', null, '00000000-0000-0000-0000-000000000000', '2025-12-14 22:02:59.237365+00', null, null, 'true');

-- Reset the sequence for user_roles
SELECT setval(pg_get_serial_sequence('"public"."user_roles"', 'user_role_id'), (SELECT MAX("user_role_id") FROM "public"."user_roles"));

-- Log the assignment in user_role_history
INSERT INTO "public"."user_role_history" ("history_id", "user_role_id", "action", "old_values", "new_values", "performed_by", "performed_at")
VALUES
('1', '1', 'assigned', 'null', '{"role_id": 14, "valid_to": null, "role_code": "system_admin", "valid_from": "2025-12-15"}', '00000000-0000-0000-0000-000000000000', '2025-12-14 22:02:59.254483+00');

-- Reset the sequence for user_role_history
SELECT setval(pg_get_serial_sequence('"public"."user_role_history"', 'history_id'), (SELECT MAX("history_id") FROM "public"."user_role_history"));


RESET ALL;
