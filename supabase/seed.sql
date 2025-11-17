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
	('00000000-0000-0000-0000-000000000000', 'e01e1574-8276-4747-9f7e-c44146231dc8', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"test@mars.com","user_id":"e1e806b1-c51b-46dd-97e5-d2f7913d1145","user_phone":""}}', '2025-11-14 07:37:26.138508+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'authenticated', 'authenticated', 'test@mars.com', '$2a$10$CejKbimUasB2Bll63fKw5.013WaWac3Kv0ytmXoXWn.P4we5uKrVC', '2025-11-14 07:37:26.144211+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-14 07:37:26.128106+00', '2025-11-14 07:37:26.146009+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '{"sub": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "email": "test@mars.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-14 07:37:26.134222+00', '2025-11-14 07:37:26.134288+00', '2025-11-14 07:37:26.134288+00', 'b0390ff8-8b35-414f-bfa7-fc6f1cfe94b1');


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

INSERT INTO "public"."audit_logs" ("audit_id", "table_name", "record_id", "operation", "old_values", "new_values", "fields_changed", "changed_by", "changed_at") VALUES
	(1, 'material_reviews', 1, 'INSERT', NULL, '{"status": "draft", "sme_name": null, "review_id": 1, "sme_email": null, "created_at": "2025-11-17T04:40:25.969292+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "decided_at": null, "decided_by": null, "updated_at": "2025-11-17T04:40:25.969292+00:00", "final_notes": null, "review_date": "2025-11-17", "initiated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "sme_analysis": null, "review_reason": "annual_review", "final_decision": null, "sme_department": null, "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "material_number": 10012460, "proposed_action": "1", "risk_assessment": null, "follow_up_reason": null, "next_review_date": null, "current_stock_qty": 1, "estimated_savings": null, "months_no_movement": 1, "previous_review_id": null, "requires_follow_up": null, "sme_contacted_date": null, "sme_recommendation": null, "sme_responded_date": null, "checklist_completed": false, "completed_checklist": false, "current_stock_value": 1, "implementation_date": null, "sme_feedback_method": null, "sme_recommended_qty": null, "final_qty_adjustment": null, "business_justification": "1", "review_frequency_weeks": null, "proposed_qty_adjustment": 1, "alternative_applications": null}', NULL, 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17 04:40:25.969292+00'),
	(2, 'material_reviews', 1, 'UPDATE', '{"status": "draft", "sme_name": null, "review_id": 1, "sme_email": null, "created_at": "2025-11-17T04:40:25.969292+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "decided_at": null, "decided_by": null, "updated_at": "2025-11-17T04:40:25.969292+00:00", "final_notes": null, "review_date": "2025-11-17", "initiated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "sme_analysis": null, "review_reason": "annual_review", "final_decision": null, "sme_department": null, "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "material_number": 10012460, "proposed_action": "1", "risk_assessment": null, "follow_up_reason": null, "next_review_date": null, "current_stock_qty": 1, "estimated_savings": null, "months_no_movement": 1, "previous_review_id": null, "requires_follow_up": null, "sme_contacted_date": null, "sme_recommendation": null, "sme_responded_date": null, "checklist_completed": false, "completed_checklist": false, "current_stock_value": 1, "implementation_date": null, "sme_feedback_method": null, "sme_recommended_qty": null, "final_qty_adjustment": null, "business_justification": "1", "review_frequency_weeks": null, "proposed_qty_adjustment": 1, "alternative_applications": null}', '{"status": "pending_sme", "sme_name": null, "review_id": 1, "sme_email": null, "created_at": "2025-11-17T04:40:25.969292+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "decided_at": null, "decided_by": null, "updated_at": "2025-11-17T04:40:31.761082+00:00", "final_notes": null, "review_date": "2025-11-17", "initiated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "sme_analysis": null, "review_reason": "annual_review", "final_decision": null, "sme_department": null, "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "material_number": 10012460, "proposed_action": "1", "risk_assessment": null, "follow_up_reason": null, "next_review_date": null, "current_stock_qty": 1, "estimated_savings": null, "months_no_movement": 1, "previous_review_id": null, "requires_follow_up": null, "sme_contacted_date": null, "sme_recommendation": null, "sme_responded_date": null, "checklist_completed": false, "completed_checklist": true, "current_stock_value": 1, "implementation_date": null, "sme_feedback_method": null, "sme_recommended_qty": null, "final_qty_adjustment": null, "business_justification": "1", "review_frequency_weeks": null, "proposed_qty_adjustment": 1, "alternative_applications": null}', '{status,updated_at,completed_checklist}', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17 04:40:31.741312+00'),
	(3, 'review_checklist', 1, 'INSERT', NULL, '{"review_id": 1, "created_at": "2025-11-17T04:40:31.741312+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "updated_at": "2025-11-17T04:40:31.741312+00:00", "checklist_id": 1, "has_open_orders": true, "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "forecast_next_12m": null, "open_order_numbers": null, "reviewed_bom_usage": true, "alternate_plant_qty": null, "has_forecast_demand": true, "checked_supersession": true, "procurement_feedback": null, "contacted_procurement": true, "checked_alternate_plants": true, "checked_historical_usage": true}', NULL, 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17 04:40:31.741312+00'),
	(4, 'material_reviews', 1, 'UPDATE', '{"status": "pending_sme", "sme_name": null, "review_id": 1, "sme_email": null, "created_at": "2025-11-17T04:40:25.969292+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "decided_at": null, "decided_by": null, "updated_at": "2025-11-17T04:40:31.761082+00:00", "final_notes": null, "review_date": "2025-11-17", "initiated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "sme_analysis": null, "review_reason": "annual_review", "final_decision": null, "sme_department": null, "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "material_number": 10012460, "proposed_action": "1", "risk_assessment": null, "follow_up_reason": null, "next_review_date": null, "current_stock_qty": 1, "estimated_savings": null, "months_no_movement": 1, "previous_review_id": null, "requires_follow_up": null, "sme_contacted_date": null, "sme_recommendation": null, "sme_responded_date": null, "checklist_completed": false, "completed_checklist": true, "current_stock_value": 1, "implementation_date": null, "sme_feedback_method": null, "sme_recommended_qty": null, "final_qty_adjustment": null, "business_justification": "1", "review_frequency_weeks": null, "proposed_qty_adjustment": 1, "alternative_applications": null}', '{"status": "pending_decision", "sme_name": "Test", "review_id": 1, "sme_email": "Test@mail.com", "created_at": "2025-11-17T04:40:25.969292+00:00", "created_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "decided_at": null, "decided_by": null, "updated_at": "2025-11-17T04:40:54.70744+00:00", "final_notes": null, "review_date": "2025-11-17", "initiated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "sme_analysis": "Test", "review_reason": "annual_review", "final_decision": null, "sme_department": "Test", "last_updated_by": "e1e806b1-c51b-46dd-97e5-d2f7913d1145", "material_number": 10012460, "proposed_action": "1", "risk_assessment": "Test", "follow_up_reason": null, "next_review_date": null, "current_stock_qty": 1, "estimated_savings": null, "months_no_movement": 1, "previous_review_id": null, "requires_follow_up": null, "sme_contacted_date": "2025-11-13T00:00:00+00:00", "sme_recommendation": "Test", "sme_responded_date": "2025-11-17T00:00:00+00:00", "checklist_completed": false, "completed_checklist": true, "current_stock_value": 1, "implementation_date": null, "sme_feedback_method": "meeting", "sme_recommended_qty": 1337, "final_qty_adjustment": null, "business_justification": "1", "review_frequency_weeks": null, "proposed_qty_adjustment": 1, "alternative_applications": "Test"}', '{status,sme_name,sme_email,updated_at,sme_analysis,sme_department,risk_assessment,sme_contacted_date,sme_recommendation,sme_responded_date,sme_feedback_method,sme_recommended_qty,alternative_applications}', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17 04:40:54.697687+00');


--
-- Data for Name: sap_material_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sap_material_data" ("material_number", "material_desc", "material_type", "mat_group", "mat_group_desc", "mrp_controller", "plant", "created_on", "total_quantity", "total_value", "unrestricted_quantity", "unrestricted_value", "safety_stock", "coverage_ratio", "max_cons_demand", "demand_fc_12m", "demand_fc_total", "cons_1y", "cons_2y", "cons_3y", "cons_4y", "cons_5y", "purchased_qty_2y", "last_reviewed", "next_review", "review_notes", "uploaded_at") VALUES
	(10041046, 'RAIL 60 25M DHH GR SP2', 'OPER', '1305', 'Rail', 'N02', NULL, '2015-06-03', 3849.5, 12081198.95, 3850, NULL, 0, 1.1, 3459.5, NULL, NULL, -3177, -5072, -1701, -2347, -5001, 14344.02, NULL, NULL, NULL, '2025-11-17 04:40:16.115625+00'),
	(10059244, 'SLEEPER CS CL1 CNT PAN 1067 32T GAL', 'FING', '1315', 'Sleepers', 'N04', NULL, '2019-09-16', 42798, 6369198.36, 42798, NULL, 10000, 1.2, 36882.2, 35380, 47676, -7036, -36552, -59008, -40689, -41126, NULL, '2021-11-29', '2023-11-29', 'REQUIRED', '2025-11-17 04:40:16.142514+00'),
	(10059061, 'RAIL 60 109.5M DHH GR SP2 -- NON ARTS', 'FING', '1305', 'Rail', 'N02', NULL, '2019-07-12', 206, 4219640.14, 206, NULL, 0, 0.6, 373.2, 140, 140, -428, -492, -65, -501, -380, NULL, NULL, NULL, NULL, '2025-11-17 04:40:16.160349+00'),
	(10059062, 'RAIL 60 112.5M DHH GR SP2 -- NON ARTS', 'FING', '1305', 'Rail', 'N02', NULL, '2019-07-12', 103, 2167623.67, 103, NULL, 0, 0.1, 945, 945, 1396, -433, -511, -102, -395, -617, NULL, NULL, NULL, NULL, '2025-11-17 04:40:16.177448+00'),
	(10060230, 'BALLAST A 1', 'RAWM', '1310', 'Ballast', 'N07', NULL, '2020-06-08', 91279.236, 1892111.68, 91279, NULL, 0, 0.2, 483795.6, 483795.6, 631234, -257536, -198383, -166068, -84423, -114328, NULL, NULL, NULL, NULL, '2025-11-17 04:40:16.192526+00'),
	(10059249, 'SLEEPER CS LP CNT PAN 1067 30T GAL', 'FING', '1315', 'Sleepers', 'N04', NULL, '2019-09-16', 10119, 1543552.26, 10119, NULL, 3000, 3.2, 3212, 176, 176, -965, -1595, -11999, -912, -589, NULL, '2021-11-29', '2023-11-29', 'REQUIRED', '2025-11-17 04:40:16.209582+00'),
	(10057618, 'CONTROLLER BASE STATION OUTDOORS TETRA', 'ROTG', '1335', 'Signalling Equipment', 'N03', NULL, '2018-06-25', 26, 1105543.08, 26, NULL, 8, 16.3, 1.6, NULL, NULL, -4, NULL, -4, NULL, NULL, 20, '2021-11-29', '2023-11-29', 'REQUIRED', '2025-11-17 04:40:16.236077+00'),
	(10065900, 'CARRIER DUAL BASE STATION BS422 TETRA', 'SPRS', '1335', 'Signalling Equipment', 'N03', NULL, '2023-11-06', 7, 1034690.59, 7, NULL, 0, 4.4, 1.6, NULL, NULL, -1, -7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-17 04:40:16.25864+00'),
	(10059465, 'SLEEPER CS LP FLT PAN 1067 30T GAL', 'FING', '1315', 'Sleepers', 'N04', NULL, '2019-11-21', 4443, 677735.22, 4443, NULL, 3000, 1, 4425.4, 41, 41, -5562, -2827, -8074, -3364, -2300, NULL, '2021-11-29', '2023-11-29', 'REQUIRED', '2025-11-17 04:40:16.274604+00'),
	(10012460, 'CLIP FASTENING PAN E2043 GALV', 'OPER', '1320', 'Sleepers-Fastenings', 'N06', NULL, '2008-05-22', 113972, 640134.58, 113972, NULL, 20505, 0.3, 330649.4, 151120, 253420, -227254, -289894, -558700, -290597, -286802, 456000, NULL, NULL, NULL, '2025-11-17 04:40:16.288779+00');


--
-- Data for Name: material_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_insights" ("insight_id", "material_number", "message", "insight_type", "created_at") VALUES
	(1, 10041046, 'Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.', 'warning', '2025-11-17 04:40:16.131067+00'),
	(2, 10059244, 'Material is understocked based on coverage ratio. Current: 42798, Ideal: 46365, Gap: 3567', 'info', '2025-11-17 04:40:16.151661+00'),
	(3, 10059061, 'Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.', 'warning', '2025-11-17 04:40:16.16878+00'),
	(4, 10059062, 'Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.', 'warning', '2025-11-17 04:40:16.185274+00'),
	(5, 10060230, 'Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.', 'warning', '2025-11-17 04:40:16.201453+00'),
	(6, 10059249, 'Material is overstocked. Current: 10119, Optimal: 4111, Potential reduction: 6008', 'warning', '2025-11-17 04:40:16.217353+00'),
	(7, 10059249, 'Potential savings (optimistic): $916,484.15 (Unit cost: $152.54)', 'info', '2025-11-17 04:40:16.224654+00'),
	(8, 10057618, 'Material is overstocked. Current: 26, Optimal: 8, Potential reduction: 18', 'warning', '2025-11-17 04:40:16.244778+00'),
	(9, 10057618, 'Potential savings (optimistic): $765,375.98 (Unit cost: $42520.89)', 'info', '2025-11-17 04:40:16.251451+00'),
	(10, 10065900, 'Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.', 'warning', '2025-11-17 04:40:16.267318+00'),
	(11, 10059465, 'Material is understocked based on coverage ratio. Current: 4443, Ideal: 5776, Gap: 1333', 'info', '2025-11-17 04:40:16.281614+00'),
	(12, 10012460, 'Material is understocked based on coverage ratio. Current: 113972, Ideal: 493879, Gap: 379907', 'info', '2025-11-17 04:40:16.295856+00');


--
-- Data for Name: material_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."material_reviews" ("review_id", "material_number", "created_by", "last_updated_by", "created_at", "updated_at", "initiated_by", "review_date", "review_reason", "current_stock_qty", "current_stock_value", "months_no_movement", "proposed_action", "proposed_qty_adjustment", "business_justification", "checklist_completed", "sme_name", "sme_email", "sme_department", "sme_feedback_method", "sme_contacted_date", "sme_responded_date", "sme_recommendation", "sme_recommended_qty", "sme_analysis", "alternative_applications", "risk_assessment", "final_decision", "final_qty_adjustment", "final_notes", "decided_by", "decided_at", "requires_follow_up", "next_review_date", "follow_up_reason", "review_frequency_weeks", "previous_review_id", "estimated_savings", "implementation_date", "status", "completed_checklist") VALUES
	(1, 10012460, 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17 04:40:25.969292+00', '2025-11-17 04:40:54.70744+00', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', '2025-11-17', 'annual_review', 1, 1, 1, '1', 1, '1', false, 'Test', 'Test@mail.com', 'Test', 'meeting', '2025-11-13 00:00:00+00', '2025-11-17 00:00:00+00', 'Test', 1337, 'Test', 'Test', 'Test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending_decision', true);


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "created_at", "updated_at", "is_admin") VALUES
	('e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'test', '2025-11-14 07:37:26.127566+00', '2025-11-14 07:37:26.127566+00', false);


--
-- Data for Name: review_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: review_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."review_checklist" ("checklist_id", "review_id", "has_open_orders", "has_forecast_demand", "checked_alternate_plants", "contacted_procurement", "reviewed_bom_usage", "checked_supersession", "checked_historical_usage", "open_order_numbers", "forecast_next_12m", "alternate_plant_qty", "procurement_feedback", "created_at", "updated_at", "created_by", "last_updated_by") VALUES
	(1, 1, true, true, true, true, true, true, true, NULL, NULL, NULL, NULL, '2025-11-17 04:40:31.741312+00', '2025-11-17 04:40:31.741312+00', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145', 'e1e806b1-c51b-46dd-97e5-d2f7913d1145');


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
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict WeY2qHvIzEhgHubYdvuNIlJZ0frOjuQf4JrgMeOqfPTqEWh71F5IhHI6pDHIS8c

RESET ALL;
