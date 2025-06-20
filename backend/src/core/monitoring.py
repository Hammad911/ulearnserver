import logging
import time
from prometheus_client import Counter, Histogram, Gauge
from pythonjsonlogger import jsonlogger
from sentry_sdk import init as sentry_init
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Sentry
sentry_init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
    environment=os.getenv("ENVIRONMENT", "development")
)

# Configure structured logging
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(levelname)s %(name)s %(message)s'
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

ACTIVE_USERS = Gauge(
    'active_users',
    'Number of active users'
)

DB_CONNECTION_POOL = Gauge(
    'db_connection_pool',
    'Database connection pool size',
    ['state']  # available, in_use
)

CACHE_HITS = Counter(
    'cache_hits_total',
    'Total cache hits',
    ['cache_type']
)

CACHE_MISSES = Counter(
    'cache_misses_total',
    'Total cache misses',
    ['cache_type']
)

# Middleware for request tracking
async def track_request(request, call_next):
    start_time = time.time()
    
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        status_code = 500
        raise e
    finally:
        duration = time.time() - start_time
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=status_code
        ).inc()
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        # Log request details
        logger.info(
            "Request processed",
            extra={
                "method": request.method,
                "endpoint": request.url.path,
                "status_code": status_code,
                "duration": duration,
                "client_ip": request.client.host
            }
        )
    
    return response

def update_db_pool_metrics(pool):
    """Update database connection pool metrics"""
    DB_CONNECTION_POOL.labels(state='available').set(pool._pool.qsize())
    DB_CONNECTION_POOL.labels(state='in_use').set(
        pool._pool.maxsize - pool._pool.qsize()
    )

def track_cache_operation(cache_type, hit):
    """Track cache hits and misses"""
    if hit:
        CACHE_HITS.labels(cache_type=cache_type).inc()
    else:
        CACHE_MISSES.labels(cache_type=cache_type).inc() 