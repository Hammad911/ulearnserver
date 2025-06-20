import redis
import json
from typing import Any, Optional
import os
from dotenv import load_dotenv
from .monitoring import track_cache_operation

# Load environment variables
load_dotenv()

# Initialize Redis client
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis-11091.c276.us-east-1-2.ec2.redns.redis-cloud.com'),
    port=int(os.getenv('REDIS_PORT', 11091)),
    password=os.getenv('REDIS_PASSWORD', 'Mtn5vtm0i6jOHEph3r4lP8aBnBeB6tFQ'),
    decode_responses=True,
    ssl=True
)


class Cache:
    def __init__(self, prefix: str = '', ttl: int = 3600):
        self.prefix = prefix
        self.ttl = ttl

    def _get_key(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        cache_key = self._get_key(key)
        value = redis_client.get(cache_key)
        
        if value:
            track_cache_operation(self.prefix, True)
            return json.loads(value)
        
        track_cache_operation(self.prefix, False)
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        cache_key = self._get_key(key)
        try:
            redis_client.setex(
                cache_key,
                ttl or self.ttl,
                json.dumps(value)
            )
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        cache_key = self._get_key(key)
        try:
            redis_client.delete(cache_key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    def clear(self) -> bool:
        """Clear all keys with this prefix"""
        if not self.prefix:
            return False
        
        try:
            keys = redis_client.keys(f"{self.prefix}:*")
            if keys:
                redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False

# Create cache instances for different purposes
user_cache = Cache(prefix='user', ttl=3600)  # 1 hour
search_cache = Cache(prefix='search', ttl=1800)  # 30 minutes
chat_cache = Cache(prefix='chat', ttl=300)  # 5 minutes 