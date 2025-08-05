#!/usr/bin/env python3
"""
Simple health check script for the Python backend
"""
import requests
import sys
import os

def check_health():
    try:
        port = os.getenv("PORT", "3001")
        url = f"http://localhost:{port}/api/health"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                print("✅ Backend is healthy")
                return True
        
        print(f"❌ Backend health check failed: {response.status_code}")
        return False
        
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

if __name__ == "__main__":
    if check_health():
        sys.exit(0)
    else:
        sys.exit(1)