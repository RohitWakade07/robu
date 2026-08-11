# ARMSBOT WAREHOUSE ROBOT PROJECT

This repository contains the ROS 2 Humble & Ignition Gazebo simulation for the **Armsbot**, a custom warehouse forklift AMR. The robot autonomously navigates a warehouse, localizes racks and crates using ArUco markers, and precision-docks to pick and place payloads using a linear actuator forklift.

## 🤖 Robot Overview
- **Drive System:** Differential drive (2 powered wheels, 2 casters)
- **Sensors:** 180-degree 2D Lidar, RGB Camera, IMU
- **Actuators:** Linear actuator forklift for picking/placing crates
- **Software Stack:** ROS 2 Humble, Nav2, AMCL, SLAM Toolbox, `ros2_control`, OpenCV

---

## 📂 Workspace Structure
- **`armsbot_description`**: URDF Xacro files, Ignition world (`my_world.sdf`), `launch_sim.launch.py`, and config files for EKF, Nav2, and `ros2_control`.
- **`armsbot_navigation`**: Nav2 parameters, maps, and the `task_manager.py` node that orchestrates the mission.
- **`armsbot_odometry`**: Custom wheel odometry node.
- **`armsbot_camera`**: Unified Imou Ranger 2 camera node (Video + ONVIF PTZ).
- **`aruco_detection`**: standalone node for ArUco detection and TF broadcasting.
- **`picknplace`**: standalone node for two-phase precision visual servoing and forklift control.

---

## 🚀 How to Run the Simulation

### Step 1: Build the Workspace
Open a terminal in the root of your workspace and run:
```bash
cd ~/arms_ws
colcon build
source install/setup.bash
```

### Step 2: Launch the Master Control Script
We provide a master bash script to easily launch all necessary nodes in separate tabs.
```bash
./run_mission.sh
```
You will be prompted to select a mode:
1. **Mapping Mode (SLAM)**: Uses SLAM Toolbox and Teleop. Drive the robot around manually to generate a new 2D occupancy map.
2. **Autonomous Mode (Nav2 + AMCL)**: Starts the full Nav2 stack, AMCL localization, and the interactive Task Manager for autonomous pick-and-place.

### Step 3: Running an Autonomous Mission
1. Select Mode `2` in the terminal.
2. Wait for Gazebo, RViz, and Nav2 to fully load (the terminal will say "Nav2 Action Server is READY!").
3. In the **Task Manager** terminal tab, enter a Pick ID (e.g., `1`) and a Place ID (e.g., `2`).
4. The robot will autonomously navigate to the pick location, visually dock using the camera, lift the forklift, navigate to the place location, dock again, and return home.

---

## 👀 How to View and Monitor

- **Gazebo**: The main 3D physics simulation window. You can see the robot, warehouse, racks, and ArUco markers here.
- **RViz**: The ROS 2 visualization tool. Here you can see:
  - The `map` and `local_costmap` (where the robot thinks walls are).
  - The robot's `base_link` and TF frames.
  - The `ArUco Target Hunter` OpenCV window (shows what the camera sees and the detected markers with green axes drawn on them).
- **Terminal Logs**: Monitor the `Task Manager` tab for mission phases, and the `ArUco Detection` / `Auto Docker` tabs for visual servoing status.

---

## 🛠️ Key Features & Technical Fixes

### Navigation & Localization
- **AMCL Initial Pose Syncing**: The robot spawns exactly at `X=3.0, Y=0.0` in Gazebo, which matches the `initial_pose` in `nav2_params.yaml`. This prevents AMCL from diverging on startup.
- **Lidar Self-Detection Filter**: `obstacle_min_range` is set to `0.3m` so the 180-degree Lidar ignores the linear actuator mast sitting directly behind it.
- **DWB Planner Tuning**: Goal tolerances tightened (`yaw_goal_tolerance: 0.1`) so the robot parks perfectly parallel to the racks. Wheel separation corrected to `0.42m` to match the physical URDF.

### Computer Vision & ArUco
- **Optical to ROS Frame Transformation**: `aruco_detection` uses a pure rotation matrix to translate OpenCV optical coordinates `(Z fwd, X right, Y down)` into standard ROS coordinates `(X fwd, Y left, Z up)`.
- **Goal Offset**: The target goal TF frame is published `0.4m` in front of the marker so the robot stops with ample clearance for the forklift.
- **Sim Time Synchronization**: All custom nodes strictly enforce `use_sim_time: True` to prevent TF messages from being dropped due to clock mismatches between Gazebo and ROS 2.

### Visual Servoing (Pick & Place)
- **Two-Phase Docking**: `picknplace.py` uses a `CRUISE` phase (fast approach) and a `BRAKE` phase (slow deceleration using wheel odometry).
- **Active Steering in Brake Zone**: The `BRAKE` phase actively corrects its steering angle using live TF data if available, preventing the robot from drifting sideways into walls while braking.
- **Hard Stop Guard**: `HARD_STOP_DISTANCE` is strictly set to `0.05m` (less than the `0.15m` stop distance) to prevent false premature triggers.

---

## ⚠️ Troubleshooting

- **Controllers Fail to Spawn / Robot doesn't move**: If Gazebo is killed ungracefully, zombie processes can prevent `ros2_control` from loading. Run this to clean up:
  ```bash
  killall -9 ruby gzserver gzclient ign gazebo ruby
  ```
- **AMCL "Out of Bounds" Error**: If you change the spawn point in `launch_sim.launch.py`, you **must** update `initial_pose` in `nav2_params.yaml` to match, or AMCL will fail to localize and the robot will spin in circles.
- **"TF does not exist" in Auto Docker**: Ensure the `aruco_detection` node is running in its terminal tab and that the camera can physically see the marker (check the OpenCV window).
````