"""Integration checks against a running local server; creates and removes one test center."""
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
PHP = os.environ.get("PHP_BIN", "php")
checks = 0


def request(path, payload=None, method=None, raw=None, content_type="application/json"):
    body = json.dumps(payload).encode() if payload is not None else raw
    req = Request(BASE + "/" + path, data=body, method=method,
                  headers={"Content-Type": content_type} if body is not None else {})
    try:
        response = urlopen(req, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())


def check(condition, message):
    global checks
    assert condition, message
    checks += 1
    print("PASS:", message)


fixture = ROOT / "tests" / "fixture.php"
center_id = int(subprocess.check_output([PHP, str(fixture), "create"], cwd=ROOT, text=True))
fields = ["waiting_time", "professionalism", "politeness", "clarity", "cleanliness", "visit_time"]
try:
    code, centers = request("db_connection.php")
    check(code == 200 and any(int(c["id"]) == center_id for c in centers), "catalog returns test center")
    code, stats = request(f"get_statistics.php?id={center_id}")
    check(code == 200 and int(stats["total_reviews"]) == 0 and stats["overall_rating"] is None,
          "empty center has zero reviews and null rating")
    payload = {"id": center_id, **dict.fromkeys(fields, 5)}
    check(request("save_rating.php", payload)[0] == 201, "valid review is saved")
    payload2 = {"id": center_id, **dict.fromkeys(fields, 1)}
    check(request("save_rating.php", payload2)[0] == 201, "lower boundary is accepted")
    code, stats = request(f"get_statistics.php?id={center_id}")
    check(code == 200 and int(stats["total_reviews"]) == 2 and float(stats["overall_rating"]) == 3,
          "two reviews produce the correct count and overall average")
    check(all(float(stats[f]) == 3 for f in fields), "all six category averages are correct")
    for field in fields:
        for bad in [0, 6, 2.5, True, None, [], "1 OR 1=1"]:
            invalid = {**payload, field: bad}
            check(request("save_rating.php", invalid)[0] == 422, f"rejects invalid {field}: {bad!r}")
    incomplete = dict(payload)
    del incomplete["clarity"]
    check(request("save_rating.php", incomplete)[0] == 422, "missing field is rejected")
    check(request("save_rating.php", raw=b"{broken")[0] == 400, "malformed JSON is rejected")
    check(request("save_rating.php", raw=b"null")[0] == 422, "null JSON is rejected")
    check(request("save_rating.php", raw=b"[]")[0] == 422, "array JSON is rejected")
    check(request("save_rating.php", raw=b"{}", content_type="text/plain")[0] == 415, "wrong content type is rejected")
    check(request("save_rating.php", raw=b" " * 16385)[0] == 413, "oversized request is rejected")
    check(request("save_rating.php")[0] == 405, "GET cannot save a review")
    check(request("all_centers.php", {}, method="POST")[0] == 405, "POST cannot read the catalog")
    for bad_id in ["", "0", "-1", "abc", "1.5", "1%20OR%201=1", "1&id[]=2"]:
        check(request("get_statistics.php?id=" + bad_id)[0] == 422, "invalid center ID is rejected: " + bad_id)
    missing_id = 2147483647
    check(request(f"get_statistics.php?id={missing_id}")[0] == 404, "unknown center returns 404")
    check(request("save_rating.php", {**payload, "id": missing_id})[0] == 404, "cannot rate an unknown center")
    _, stats = request(f"get_statistics.php?id={center_id}")
    check(int(stats["total_reviews"]) == 2, "invalid requests did not insert reviews")
    code, rows = request("all_centers.php")
    row = next(r for r in rows if int(r["id"]) == center_id)
    check(code == 200 and float(row["overall_rating"]) == 3 and int(row["total_reviews"]) == 2,
          "list and detail statistics agree")
    ratings = [float(r["overall_rating"]) for r in rows if r["overall_rating"] is not None]
    check(ratings == sorted(ratings, reverse=True), "ranking is sorted descending")
    print(f"\n{checks} checks passed.")
finally:
    subprocess.run([PHP, str(fixture), "delete", str(center_id)], cwd=ROOT, check=True)
