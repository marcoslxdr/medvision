#!/usr/bin/env python3
"""E2E vision against canonical MedVision production."""
from __future__ import annotations

import base64
import json
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://medvision-ten.vercel.app"
EMAIL = "teste.medvision@example.com"
PASSWORD = "TesteMedVision2026!"
IMG = Path("/root/projetos/clientes/medvision/Imagens de teste/torax-1.png")


def main() -> int:
    data_url = "data:image/png;base64," + base64.b64encode(IMG.read_bytes()).decode()
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    def call(method: str, path: str, body: dict | None = None, timeout: int = 240):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            BASE + path,
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "RaniraE2E/1.0",
                "Accept": "application/json",
                "Origin": BASE,
            },
        )
        try:
            with opener.open(req, timeout=timeout) as resp:
                return resp.status, resp.read(), resp.headers
        except urllib.error.HTTPError as e:
            return e.code, e.read(), e.headers

    print("BASE", BASE)

    status, raw, _ = call("GET", "/api/auth/get-session", timeout=30)
    print("SESSION_BEFORE", status, raw[:120].decode("utf-8", "replace"))

    # Better Auth / Neon typically uses sign-in/email
    for path in ("/api/auth/sign-in/email", "/api/auth/sign-in/email-password"):
        status, raw, hdrs = call(
            "POST",
            path,
            {"email": EMAIL, "password": PASSWORD},
            timeout=60,
        )
        print("AUTH", path, status, raw[:200].decode("utf-8", "replace").replace("\n", " "))
        set_cookie = hdrs.get_all("Set-Cookie") if hasattr(hdrs, "get_all") else None
        print("SET_COOKIE_COUNT", 0 if not set_cookie else len(set_cookie))
        if status == 200:
            break

    print("JAR", len(list(jar)))
    status, raw, _ = call("GET", "/api/auth/get-session", timeout=30)
    print("SESSION_AFTER", status, raw[:250].decode("utf-8", "replace"))

    body = {
        "image": data_url,
        "specialty": "geral",
        "clinicalContext": "Teste E2E Ranira producao envio+analise",
        "mode": "quick",
    }
    status, raw, _ = call("POST", "/api/vision/analyze", body, timeout=300)
    text = raw.decode("utf-8", "replace")
    print("VISION_STATUS", status)
    print("VISION_LEN", len(text))
    try:
        data = json.loads(text)
    except Exception:
        print("VISION_RAW", text[:400])
        return 1

    if isinstance(data, dict) and data.get("error"):
        err = data["error"]
        print("VISION_ERROR", json.dumps(err, ensure_ascii=False)[:600])
        return 1

    summary = {
        "keys": list(data.keys())[:20] if isinstance(data, dict) else None,
        "modelId": data.get("modelId") if isinstance(data, dict) else None,
    }
    if isinstance(data, dict):
        dets = data.get("detections") or data.get("quickDetections") or []
        if isinstance(dets, list):
            summary["detections"] = len(dets)
            labels = []
            for d in dets[:4]:
                if isinstance(d, dict):
                    labels.append(d.get("label") or d.get("finding") or d.get("description") or str(d)[:60])
                else:
                    labels.append(str(d)[:60])
            summary["sample"] = labels
        meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
        summary["quality"] = meta.get("quality")
        report = data.get("report")
        if isinstance(report, str):
            summary["report_preview"] = report[:180]
        elif isinstance(report, dict):
            summary["report_keys"] = list(report.keys())[:8]
    print("VISION_OK", json.dumps(summary, ensure_ascii=False)[:1500])
    return 0 if status == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
