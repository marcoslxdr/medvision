#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

BASE = "https://medvision-ten.vercel.app"
EMAIL = "teste.medvision@example.com"
PASSWORD = "TesteMedVision2026!"
IMG = Path("/root/projetos/clientes/medvision/Imagens de teste/torax.png")


def main() -> int:
    data_url = "data:image/png;base64," + base64.b64encode(IMG.read_bytes()).decode()
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    def call(method: str, path: str, body: dict | None = None, timeout: int = 300):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            BASE + path,
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "RaniraE2E/1.0",
                "Origin": BASE,
                "Accept": "application/json",
            },
        )
        try:
            with opener.open(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    st, raw = call("POST", "/api/auth/sign-in/email", {"email": EMAIL, "password": PASSWORD}, 60)
    print("login", st)
    st, raw = call(
        "POST",
        "/api/vision/analyze",
        {
            "image": data_url,
            "specialty": "geral",
            "clinicalContext": "Adulto, dor toracica. E2E full Ranira.",
            "modality": "rx",
            "reportDepth": "completo",
        },
        300,
    )
    print("status", st, "len", len(raw))
    d = json.loads(raw.decode("utf-8", "replace"))
    if d.get("error"):
        print("ERROR", json.dumps(d.get("error"), ensure_ascii=False)[:500])
        return 1
    print("modelId", d.get("modelId"))
    print("keys", list(d.keys()))
    meta = d.get("meta") or {}
    print("meta", {k: meta.get(k) for k in list(meta)[:12]})
    dets = d.get("detections") or []
    print("detections", len(dets))
    for x in dets[:5]:
        if isinstance(x, dict):
            print(" -", x.get("label") or x.get("finding") or str(x)[:120])
        else:
            print(" -", str(x)[:100])
    rep = d.get("report") or {}
    if isinstance(rep, dict):
        for k in (
            "technicalAnalysis",
            "detailedFindings",
            "diagnosticHypothesis",
            "recommendations",
            "impression",
            "findings",
        ):
            if k in rep:
                print(f"REPORT.{k}:", str(rep[k])[:320].replace("\n", " | "))
    findings = d.get("findings")
    print(
        "findings_type",
        type(findings).__name__,
        "len",
        len(findings) if isinstance(findings, list) else None,
    )
    if isinstance(findings, list):
        for f in findings[:5]:
            print(" f", str(f)[:160])
    print("usage", d.get("usage"))
    print("precision", d.get("precision"))
    return 0 if st == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
