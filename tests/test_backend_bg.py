import requests, time, json, io, sys

BASE = "https://vendor-advisor.preview.emergentagent.com/api"

results = {"passed": [], "failed": []}

def add_pass(name, detail=""): results["passed"].append(f"{name} {detail}".strip()); print(f"PASS: {name} {detail}")
def add_fail(name, detail): results["failed"].append({"area": name, "issue": detail}); print(f"FAIL: {name} - {detail}")

# --- Test 1: License/SKU review analyze (background) ---
try:
    r = requests.post(f"{BASE}/reviews", json={"procurement_type": "software", "category": "license", "client_name": "TC", "project_name": "Lic Test"}, timeout=15)
    assert r.status_code == 200, f"create failed {r.status_code} {r.text}"
    rid1 = r.json()["id"]
    add_pass("create_review_license", f"id={rid1}")

    t0 = time.time()
    r = requests.post(f"{BASE}/reviews/{rid1}/analyze", timeout=15)
    dt = time.time() - t0
    assert r.status_code == 200, f"analyze failed {r.status_code} {r.text[:200]}"
    body = r.json()
    assert dt < 5, f"analyze took {dt:.1f}s (expected <5s)"
    assert body.get("status") == "analyzing", f"expected status=analyzing got {body.get('status')}"
    add_pass("analyze_returns_immediately", f"{dt:.2f}s status={body.get('status')}")

    # Poll
    final_status = None
    analysis = None
    poll_start = time.time()
    for i in range(23):  # up to ~92s
        time.sleep(4)
        r = requests.get(f"{BASE}/reviews/{rid1}", timeout=15)
        if r.status_code != 200:
            continue
        st = r.json().get("status")
        print(f"  poll {i+1} status={st} elapsed={time.time()-poll_start:.1f}s")
        if st in ("analyzed", "error"):
            final_status = st
            analysis = r.json().get("analysis")
            err = r.json().get("analysis_error")
            break
    if final_status == "analyzed" and analysis:
        add_pass("polling_reached_analyzed", f"in {time.time()-poll_start:.1f}s")
        required_keys = ["executive_summary","pricing_assessment","sla_review","contract_risk","cost_optimization","negotiation_strategy","overall_procurement_score","final_recommendation","resource_benchmark","generated_at"]
        missing = [k for k in required_keys if k not in analysis]
        if missing:
            add_fail("analysis_shape_license", f"missing keys: {missing}")
        else:
            add_pass("analysis_shape_license_all_keys_present")
    else:
        add_fail("polling_license", f"final_status={final_status} error={err if final_status=='error' else 'timeout'}")
except Exception as e:
    add_fail("license_flow", str(e))

# --- Test 2: Services review with SOW ---
try:
    r = requests.post(f"{BASE}/reviews", json={"procurement_type": "software", "category": "services", "client_name": "TC", "project_name": "SOW Test"}, timeout=15)
    assert r.status_code == 200, f"create failed {r.status_code}"
    rid2 = r.json()["id"]
    add_pass("create_review_services", f"id={rid2}")

    sow_text = "Vendor: TechCorp. 2 Senior SAP Consultants @ $12000/month. 12 month contract. SLA: 99.5% availability, 4hr response."
    files = {"files": ("sow.txt", io.BytesIO(sow_text.encode()), "text/plain")}
    r = requests.post(f"{BASE}/reviews/{rid2}/upload", files=files, timeout=90)
    assert r.status_code == 200, f"upload failed {r.status_code} {r.text[:200]}"
    add_pass("sow_upload", f"docs={len(r.json().get('documents', []))}")

    t0 = time.time()
    r = requests.post(f"{BASE}/reviews/{rid2}/analyze", timeout=15)
    dt = time.time() - t0
    assert r.status_code == 200 and dt < 5, f"analyze immediate expected <5s got {dt:.1f}s status={r.status_code}"
    assert r.json().get("status") == "analyzing"
    add_pass("services_analyze_immediate", f"{dt:.2f}s")

    final_status = None
    analysis = None
    err = None
    poll_start = time.time()
    for i in range(23):
        time.sleep(4)
        r = requests.get(f"{BASE}/reviews/{rid2}", timeout=15)
        if r.status_code != 200:
            continue
        st = r.json().get("status")
        print(f"  svc poll {i+1} status={st} elapsed={time.time()-poll_start:.1f}s")
        if st in ("analyzed", "error"):
            final_status = st
            analysis = r.json().get("analysis")
            err = r.json().get("analysis_error")
            break
    if final_status == "analyzed" and analysis:
        add_pass("services_polling_analyzed", f"in {time.time()-poll_start:.1f}s")
        rb = analysis.get("resource_benchmark", [])
        if rb and isinstance(rb, list) and len(rb) > 0:
            r0 = rb[0]
            add_pass("resource_benchmark_present", f"entries={len(rb)} first={json.dumps(r0)[:300]}")
            checks = {
                "role_has_sap": "sap" in str(r0.get("role","")).lower(),
                "market_cost_monthly": r0.get("market_cost_monthly") is not None,
                "expected_vendor_price": r0.get("expected_vendor_price") is not None,
                "vendor_quoted_monthly": r0.get("vendor_quoted_monthly") is not None,
                "margin_pct": r0.get("margin_pct") is not None,
                "competitiveness": r0.get("competitiveness") is not None,
            }
            fails = [k for k, v in checks.items() if not v]
            if fails:
                add_fail("resource_benchmark_fields", f"missing/null: {fails} data: {json.dumps(r0)[:400]}")
            else:
                add_pass("resource_benchmark_fields_populated")
                if r0.get("vendor_quoted_monthly") not in (12000, 12000.0, "12000"):
                    add_fail("vendor_quoted_monthly_value", f"expected 12000 got {r0.get('vendor_quoted_monthly')}")
                else:
                    add_pass("vendor_quoted_monthly=12000_verified")
        else:
            add_fail("resource_benchmark_missing", f"got: {rb}")
    else:
        add_fail("services_polling", f"final_status={final_status} error={err}")
except Exception as e:
    add_fail("services_flow", str(e))

# --- Test 3: Chat SSE ---
try:
    rid = rid1 if 'rid1' in dir() else None
    if rid:
        # POST chat streaming
        import urllib.request
        url = f"{BASE}/reviews/{rid}/chat"
        req = requests.post(url, json={"message": "What is the biggest risk?"}, stream=True, timeout=60)
        assert req.status_code == 200, f"chat POST {req.status_code}"
        got_delta = False
        got_done = False
        chunks = 0
        for line in req.iter_lines(decode_unicode=True):
            if not line: continue
            chunks += 1
            if line.startswith("data:"):
                data = line[5:].strip()
                try:
                    obj = json.loads(data)
                    if obj.get("done"):
                        got_done = True; break
                    if "delta" in obj or "content" in obj or "text" in obj:
                        got_delta = True
                except: pass
            if chunks > 500: break
        if got_delta and got_done:
            add_pass("chat_sse_stream", f"deltas + done received")
        elif got_done:
            add_pass("chat_sse_done_only", "done received but no explicit delta field (may use different key)")
        else:
            add_fail("chat_sse", f"delta={got_delta} done={got_done} chunks={chunks}")

        # GET history
        r = requests.get(f"{BASE}/reviews/{rid}/chat", timeout=15)
        assert r.status_code == 200
        hist = r.json().get("history", [])
        if len(hist) >= 2:
            add_pass("chat_history_persisted", f"count={len(hist)}")
        else:
            add_fail("chat_history", f"expected>=2 got {len(hist)}")
except Exception as e:
    add_fail("chat_flow", str(e))

print("\n=== SUMMARY ===")
print(f"Passed: {len(results['passed'])}")
print(f"Failed: {len(results['failed'])}")
for f in results['failed']:
    print(f"  - {f}")
