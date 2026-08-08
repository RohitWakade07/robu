#!/usr/bin/env python3
"""
CLI Diagnostic & Telemetry Test Tool for WMS Backend <--> ROS 2 Bridge (192.168.1.12:8005).
"""

import sys
import time
import argparse
import requests

ROBOT_DEFAULT_IP = "192.168.1.12"
ROBOT_DEFAULT_PORT = 8005
WMS_BACKEND_URL = "http://localhost:8000/api/v1"

def print_header(title):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def check_direct_robot_bridge(ip, port):
    print_header(f"1. TESTING DIRECT ROBOT BRIDGE CONNECTION (http://{ip}:{port})")
    url = f"http://{ip}:{port}/api/v1/robot-communication"
    
    # 1. Health
    try:
        res = requests.get(f"{url}/health", timeout=3.0)
        print(f"  [+] /health HTTP {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"  [-] /health FAILED: {e}")
        return False

    # 2. Robots List
    try:
        res = requests.get(f"{url}/robots", timeout=3.0)
        print(f"  [+] /robots HTTP {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"  [-] /robots FAILED: {e}")

    # 3. Events Stream
    try:
        res = requests.get(f"{url}/events", timeout=3.0)
        print(f"  [+] /events HTTP {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"  [-] /events FAILED: {e}")

    return True

def check_wms_backend_proxy(ip, port):
    print_header("2. TESTING WMS BACKEND -> ROBOT PROXY (http://localhost:8000)")
    
    # 1. Backend Health
    try:
        res = requests.get("http://localhost:8000/health", timeout=3.0)
        print(f"  [+] WMS Backend Health HTTP {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"  [-] WMS Backend Offline: {e}")
        return False

    # 2. Login as Admin
    try:
        login = requests.post(f"{WMS_BACKEND_URL}/auth/login", json={"email": "admin@robu.io", "password": "admin12345"}, timeout=3.0)
        if login.status_code != 200:
            print(f"  [-] WMS Login failed HTTP {login.status_code}: {login.text}")
            return False
        
        token = login.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("  [+] WMS Admin Login Successful")
    except Exception as e:
        print(f"  [-] Login error: {e}")
        return False

    # 3. Proxy Health
    try:
        res = requests.get(f"{WMS_BACKEND_URL}/robot-communication/health", headers=headers, timeout=3.0)
        print(f"  [+] Proxy /robot-communication/health HTTP {res.status_code}: {res.json()}")
    except Exception as e:
        print(f"  [-] Proxy Health failed: {e}")

    # 4. Proxy Submit Test Task
    try:
        task_data = {
            "task_type": "PICK_AND_PLACE",
            "source_location_id": "RACK-1",
            "destination_location_id": "SHIP-11",
            "priority": 5
        }
        res = requests.post(f"{WMS_BACKEND_URL}/robot-communication/tasks", headers=headers, json=task_data, timeout=3.0)
        print(f"  [+] Submit Mission Task HTTP {res.status_code}: {res.json()}")
        
        task_id = res.json().get("task_id")
        if task_id:
            time.sleep(0.5)
            status_res = requests.get(f"{WMS_BACKEND_URL}/robot-communication/tasks/{task_id}", headers=headers, timeout=3.0)
            print(f"  [+] Task Status Query HTTP {status_res.status_code}: {status_res.json()}")
    except Exception as e:
        print(f"  [-] Task submission failed: {e}")

    return True

def main():
    parser = argparse.ArgumentParser(description="CLI Tool to test WMS Backend <--> ROS 2 Robot Bridge Connection")
    parser.add_argument("--ip", default=ROBOT_DEFAULT_IP, help="Robot IP address (default: 192.168.1.12)")
    parser.add_argument("--port", type=int, default=ROBOT_DEFAULT_PORT, help="ROS Bridge Port (default: 8005)")
    args = parser.parse_args()

    print_header(f"ROBU WMS <--> ROS 2 ROBOT BRIDGE CLI DIAGNOSTIC")
    print(f"Target Robot: http://{args.ip}:{args.port}")
    print(f"Target WMS Backend: http://localhost:8000")

    direct_ok = check_direct_robot_bridge(args.ip, args.port)
    proxy_ok = check_wms_backend_proxy(args.ip, args.port)

    print_header("DIAGNOSTIC SUMMARY")
    print(f"  Direct Robot Bridge (192.168.1.12:8005): {'ONLINE' if direct_ok else 'OFFLINE / UNREACHABLE'}")
    print(f"  WMS Backend Proxy (localhost:8000):       {'ONLINE' if proxy_ok else 'OFFLINE'}")
    
    if not direct_ok:
        print("\n  [!] Troubleshooting Tip:")
        print("      Make sure 'ros2 run armsbot_navigation wms_bridge' is running on robot 192.168.1.12.")

if __name__ == "__main__":
    main()
