#!/bin/bash

echo "ArmsBot Hardware Master Control"
echo "Initializing..."

# We assume you've run colcon build in ~/aam_ws

gnome-terminal --tab --title="Robot State Publisher" -- bash -c "source install/setup.bash; ros2 launch armsbot_description rsp.launch.py use_sim_time:=false; exec bash"
sleep 2

gnome-terminal --tab --title="Robot Hardware Node" -- bash -c "source install/setup.bash; ros2 run aamros robot_hardware_node; exec bash"
sleep 2

gnome-terminal --tab --title="Sensors (Lidar & Camera)" -- bash -c "source install/setup.bash; ros2 launch armsbot_camera armsbot_camera_imou.launch.py; exec bash"
# Note: Add your specific Lidar launch command here if it's separate from the camera launch.

gnome-terminal --tab --title="EKF" -- bash -c "source install/setup.bash; ros2 run robot_localization ekf_node --ros-args -p use_sim_time:=false --params-file src/armsbot_description/config/ekf.yaml; exec bash"
sleep 2

gnome-terminal --tab --title="Nav2 + AMCL" -- bash -c "source install/setup.bash; ros2 launch armsbot_navigation navigation_amcl.launch.py use_sim_time:=false; exec bash"

gnome-terminal --tab --title="ArUco & Barcode" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation aruco_detection --ros-args -p use_sim_time:=false; ros2 run armsbot_camera barcode_detection; exec bash"

gnome-terminal --tab --title="WMS Bridge API" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation wms_bridge; exec bash"

gnome-terminal --tab --title="Task Manager" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation task_manager --ros-args -p use_sim_time:=false; exec bash"

echo "All nodes started! WMS Bridge API is listening on port 8000."
