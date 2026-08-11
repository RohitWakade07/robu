# Autonomous Warehouse Robot (aam_ws)

Welcome to the `aam_ws` repository! This workspace is designed for a custom differential-drive warehouse Automated Mobile Robot (AMR) using ROS 2 Humble. 

This repository successfully bridges high-level web dashboards (WMS) to low-level microcontrollers (Arduino Uno Q / STM32) and coordinates autonomous navigation, visual servoing (ArUco), and picking/placing using a linear actuator.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Packages](#packages)
3. [Installation & Setup](#installation--setup)
4. [Running the Robot](#running-the-robot)
5. [WMS API Endpoints](#wms-api-endpoints)

---

## Architecture Overview

The robot's software is split into three main layers:
1. **Low-Level Control (Arduino/MCU)**: Reads battery voltage, counts wheel encoder ticks, controls motor speeds, and executes linear actuator commands.
2. **ROS 2 Core (aam_ws)**: Handles SLAM, Nav2 auto-navigation, ArUco visual servoing, and the central Task Manager queue.
3. **WMS Bridge (FastAPI)**: An HTTP API that accepts `Canonical JSON` tasks from the web server and continuously streams MJPEG video, telemetry, and status updates back to the web server.

---

## Packages

* **`aamros`**: Contains the critical `robot_hardware_node.py`. It uses a custom UNIX socket RPC to talk to the `arduino-router` service, sending velocity commands and reading back tick counts and battery percentage.
* **`armsbot_navigation`**: The brain of the operation. Contains:
  * `task_manager.py`: Priority queue that parses tasks, triggers navigation, and sends updates.
  * `wms_bridge.py`: The FastAPI server exposing port 8005.
  * `picknplace.py`: Drives the robot using the camera for precise alignment to racks.
* **`armsbot_camera`**: Connects to the IP camera and publishes `/camera/image_raw` using OpenCV. Contains barcode detection scripts.
* **`armsbot_description`**: Contains the physical URDF specifications and models of the forklift robot.

---

## Installation & Setup

This workspace is designed to be built inside a Docker container natively on the robot's edge computer (Raspberry Pi/Jetson/Debian).

### 1. Requirements
* Docker installed on the host.
* The `arduino-router` service running on the host system (which communicates via `/tmp/arduino-router.sock`).

### 2. Build the Docker Image
Navigate to the `aamros` package and build the ROS Humble Docker image. It contains all dependencies including Nav2, FastAPI, and OpenCV.
```bash
cd ~/aam_ws/src/aamros
docker build -t ros_humble_aam .
```

### 3. Launch the Container
Use the provided script to start the container. It maps the host network and the MCU socket directly into the Docker environment.
```bash
cd ~/aam_ws/src/aamros
./run.sh
```

### 4. Build the Workspace
Inside the Docker terminal, run:
```bash
cd ~/aam_ws
colcon build
```

---

## Running the Robot

We provide an all-in-one shell script for simplicity.

```bash
cd ~/aam_ws
source install/setup.bash
./run_hardware.sh
```

You will be prompted with a menu:
1. **Mapping Mode**: Starts SLAM Toolbox and Teleop. Use this to drive the robot around a new warehouse and generate a map. (A separate terminal is spawned to easily save the map when finished).
2. **Autonomous Mode**: Starts Nav2, the camera, and the WMS Bridge. The robot will hold position and wait for commands from the web server.

---

## WMS API Endpoints

When in **Autonomous Mode**, the robot listens on `http://<ROBOT_IP>:8005`.

### 1. Submit a Task
Send a JSON payload to queue a mission.
**POST** `http://<ROBOT_IP>:8005/api/v1/robot-communication/tasks`
```json
{
  "message_type": "TASK_CREATE",
  "task_id": "mission-01",
  "priority": 5,
  "payload": {
    "task_type": "PICK_AND_PLACE",
    "source_location": {"location_id": "RACK-1"},
    "destination_location": {"location_id": "SHIP-11"}
  }
}
```

### 2. View Live Camera
You can view the live MJPEG camera feed by opening this URL in a browser or embedding it in a frontend dashboard `<img src="...">`.
**GET** `http://<ROBOT_IP>:8005/api/v1/robot-communication/video_feed`

### 3. Real-Time Telemetry & Alerts
The robot will automatically `POST` JSON data to the WMS server at `http://<WMS_SERVER_IP>:8000/api/v1/events`. 
* *Lifecycle states*: `TASK_QUEUED`, `NAVIGATING_TO_PICK`, `PICKING`, etc.
* *Alerts*: If the Arduino reports a battery level < 15%, the robot instantly fires a `LOW_BATTERY` event.
