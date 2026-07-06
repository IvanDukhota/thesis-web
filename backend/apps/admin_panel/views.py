import math
import time
import urllib.parse
import urllib.request
import json as json_module
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.contrib.auth import get_user_model
from django.db import connection
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminUser

User = get_user_model()

LOKI_URL = "http://loki:3100"
PROMETHEUS_URL = "http://prometheus:9090"


def _check_http(name, url, timeout=3):
    start = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            r.read()
        ms = round((time.monotonic() - start) * 1000)
        return {"name": name, "status": "online", "response_ms": ms}
    except Exception as e:
        ms = round((time.monotonic() - start) * 1000)
        return {"name": name, "status": "offline", "response_ms": ms, "error": str(e)}


def _check_db(name):
    start = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        ms = round((time.monotonic() - start) * 1000)
        return {"name": name, "status": "online", "response_ms": ms}
    except Exception as e:
        ms = round((time.monotonic() - start) * 1000)
        return {"name": name, "status": "offline", "response_ms": ms, "error": str(e)}


def _check_redis(name):
    start = time.monotonic()
    try:
        cache.set("_admin_ping", "1", timeout=5)
        val = cache.get("_admin_ping")
        ms = round((time.monotonic() - start) * 1000)
        if val == "1":
            return {"name": name, "status": "online", "response_ms": ms}
        return {"name": name, "status": "offline", "response_ms": ms, "error": "ping failed"}
    except Exception as e:
        ms = round((time.monotonic() - start) * 1000)
        return {"name": name, "status": "offline", "response_ms": ms, "error": str(e)}


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "users": {
                "total": User.objects.count(),
                "staff": User.objects.filter(is_staff=True).count(),
                "active": User.objects.filter(is_active=True).count(),
            },
        })


def _prom_query(query):
    params = urllib.parse.urlencode({"query": query})
    url = f"{PROMETHEUS_URL}/api/v1/query?{params}"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json_module.loads(resp.read())
        results = data.get("data", {}).get("result", [])
        if results:
            val = float(results[0]["value"][1])
            return None if (math.isnan(val) or math.isinf(val)) else val
        return None
    except Exception:
        return None


def _prom_query_all(query):
    params = urllib.parse.urlencode({"query": query})
    url = f"{PROMETHEUS_URL}/api/v1/query?{params}"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json_module.loads(resp.read())
        return data.get("data", {}).get("result", [])
    except Exception:
        return []


class AdminMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        with ThreadPoolExecutor(max_workers=8) as ex:
            f_rps          = ex.submit(_prom_query, 'sum(rate(django_http_requests_total_by_method_total[2m]))')
            f_latency      = ex.submit(_prom_query, 'histogram_quantile(0.95, sum(rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])) by (le))')
            f_5xx          = ex.submit(_prom_query, 'sum(rate(django_http_responses_total_by_status_total{status=~"5.."}[5m])) or vector(0)')
            f_4xx          = ex.submit(_prom_query, 'sum(rate(django_http_responses_total_by_status_total{status=~"4.."}[5m])) or vector(0)')
            f_db           = ex.submit(_prom_query, 'sum(rate(django_db_execute_total[2m])) or vector(0)')
            f_cpu          = ex.submit(_prom_query, 'rate(process_cpu_seconds_total{job="django"}[2m]) * 100')
            f_ram          = ex.submit(_prom_query, 'process_resident_memory_bytes{job="django"}')
            f_uptime       = ex.submit(_prom_query, 'time() - process_start_time_seconds{job="django"}')
            f_top_latency  = ex.submit(_prom_query_all, 'topk(7, histogram_quantile(0.95, sum(rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])) by (le, view)))')
            f_top_traffic  = ex.submit(_prom_query_all, 'topk(7, sum(rate(django_http_requests_total_by_view_transport_method_total[5m])) by (view))')

        def fmt_uptime(seconds):
            if seconds is None:
                return None
            seconds = int(seconds)
            h, m = divmod(seconds // 60, 60)
            d, h = divmod(h, 24)
            if d:
                return f"{d}d {h}h {m}m"
            if h:
                return f"{h}h {m}m"
            return f"{m}m"

        top_latency = [
            {"view": r["metric"].get("view", "?"), "latency_ms": round(float(r["value"][1]) * 1000, 1)}
            for r in f_top_latency.result()
            if float(r["value"][1]) > 0
        ]
        top_traffic = [
            {"view": r["metric"].get("view", "?"), "rps": round(float(r["value"][1]), 4)}
            for r in f_top_traffic.result()
            if float(r["value"][1]) > 0
        ]

        ram = f_ram.result()

        return Response({
            "requests": {
                "rps": round(f_rps.result(), 3) if f_rps.result() is not None else None,
                "latency_p95_ms": round(f_latency.result() * 1000, 1) if f_latency.result() is not None else None,
                "errors_5xx": round(f_5xx.result(), 4) if f_5xx.result() is not None else None,
                "errors_4xx": round(f_4xx.result(), 4) if f_4xx.result() is not None else None,
                "db_qps": round(f_db.result(), 2) if f_db.result() is not None else None,
            },
            "process": {
                "cpu_percent": round(f_cpu.result(), 2) if f_cpu.result() is not None else None,
                "ram_mb": round(ram / 1024 / 1024, 1) if ram is not None else None,
                "uptime": fmt_uptime(f_uptime.result()),
            },
            "top_latency": top_latency,
            "top_traffic": top_traffic,
        })


class AdminServicesView(APIView):
    permission_classes = [IsAdminUser]

    CHECKS = [
        ("db",    "PostgreSQL"),
        ("redis", "Redis"),
        ("http",  "MinIO",               "http://minio:9000/minio/health/live"),
        ("http",  "Embedding Service",   "http://embedding-service:8002/health"),
        ("http",  "Translation Service", "http://translation-service:8001/health"),
        ("http",  "Loki",                "http://loki:3100/ready"),
        ("http",  "Promtail",            "http://promtail:9080/ready"),
        ("http",  "Grafana",             "http://grafana:3000/api/health"),
        ("http",  "Prometheus",          "http://prometheus:9090/-/healthy"),
        ("http",  "cAdvisor",            "http://cadvisor:8080/healthz"),
    ]

    def get(self, request):
        futures = {}
        results = []

        with ThreadPoolExecutor(max_workers=6) as executor:
            for check in self.CHECKS:
                kind = check[0]
                if kind == "db":
                    f = executor.submit(_check_db, check[1])
                elif kind == "redis":
                    f = executor.submit(_check_redis, check[1])
                else:
                    f = executor.submit(_check_http, check[1], check[2])
                futures[f] = check[1]

            for f in as_completed(futures):
                results.append(f.result())

        results.sort(key=lambda x: x["name"])
        return Response({"services": results})


class AdminLogsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        service = request.query_params.get("service", "teamhub-backend")
        limit = min(int(request.query_params.get("limit", 100)), 500)
        start_ts = request.query_params.get("start")
        end_ts = request.query_params.get("end")

        now = int(time.time())
        end = int(end_ts) if end_ts else now
        start = int(start_ts) if start_ts else now - 3600

        if service == 'teamhub-backend':
            query = f'{{container="{service}"}} |= `"type": "request"`'
        else:
            query = f'{{container="{service}"}}'

        params = urllib.parse.urlencode({
            "query": query,
            "limit": limit,
            "start": start * 1_000_000_000,
            "end": end * 1_000_000_000,
            "direction": "backward",
        })

        try:
            url = f"{LOKI_URL}/loki/api/v1/query_range?{params}"
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json_module.loads(resp.read())
        except Exception as e:
            return Response({"error": str(e), "logs": []}, status=502)

        logs = []
        for stream in data.get("data", {}).get("result", []):
            for ts_ns, line in stream.get("values", []):
                try:
                    if not line.startswith('{'):
                        json_start = line.find('{')
                        line = line[json_start:] if json_start != -1 else line
                    entry = json_module.loads(line)
                except Exception:
                    entry = {"raw": line}
                entry["ts"] = int(ts_ns) // 1_000_000_000
                logs.append(entry)

        logs.sort(key=lambda x: x.get("ts", 0), reverse=True)

        return Response({"logs": logs})
