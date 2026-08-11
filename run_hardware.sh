#!/bin/bash

echo "ArmsBot Hardware Master Control"
echo "1) Mapping Mode (SLAM Toolbox + Teleop)"
echo "2) Autonomous Mode (AMCL + Nav2 + WMS Task Manager)"
read -p "Select mode: " mode

if [ "$mode" == "1" ]; then
    echo "Starting Mapping Mode..."
    gnome-terminal --tab --title="Robot State Publisher" -- bash -c "source install/setup.bash; ros2 launch armsbot_description rsp.launch.py use_sim_time:=false; exec bash"
    sleep 2
    gnome-terminal --tab --title="Robot Hardware Node" -- bash -c "source install/setup.bash; ros2 run aamros robot_hardware_node; exec bash"
    sleep 2
    gnome-terminal --tab --title="Sensors (Lidar & Camera)" -- bash -c "source install/setup.bash; ros2 launch armsbot_camera armsbot_camera_imou.launch.py; exec bash"
    gnome-terminal --tab --title="EKF" -- bash -c "source install/setup.bash; ros2 run robot_localization ekf_node --ros-args -p use_sim_time:=false --params-file src/armsbot_description/config/ekf.yaml; exec bash"
    gnome-terminal --tab --title="SLAM Toolbox" -- bash -c "source install/setup.bash; ros2 launch slam_toolbox online_async_launch.py slam_params_file:=./src/armsbot_description/config/mapper_params_online_async.yaml use_sim_time:=false; exec bash"
    gnome-terminal --tab --title="RViz" -- bash -c "source install/setup.bash; rviz2; exec bash"
    gnome-terminal --tab --title="Teleop" -- bash -c "source install/setup.bash; python3 ~/aam_ws/src/armsbot_navigation/teleop_wasd.py; exec bash"
    
    echo "================================================="
    echo "Mapping mode started."
    echo "When you are done exploring, use this command to save the map:"
    echo "ros2 run nav2_map_server map_saver_cli -f ~/aam_ws/src/armsbot_navigation/maps/my_map"
    echo "================================================="
    gnome-terminal --tab --title="Map Saver" -- bash -c "echo 'Run the map saver command here when ready.'; exec bash"

elif [ "$mode" == "2" ]; then
    echo "Starting Autonomous Mode (WMS Integrated)..."
    gnome-terminal --tab --title="Robot State Publisher" -- bash -c "source install/setup.bash; ros2 launch armsbot_description rsp.launch.py use_sim_time:=false; exec bash"
    sleep 2
    gnome-terminal --tab --title="Robot Hardware Node" -- bash -c "source install/setup.bash; ros2 run aamros robot_hardware_node; exec bash"
    sleep 2
    gnome-terminal --tab --title="Sensors (Lidar & Camera)" -- bash -c "source install/setup.bash; ros2 launch armsbot_camera armsbot_camera_imou.launch.py; exec bash"
    gnome-terminal --tab --title="EKF" -- bash -c "source install/setup.bash; ros2 run robot_localization ekf_node --ros-args -p use_sim_time:=false --params-file src/armsbot_description/config/ekf.yaml; exec bash"
    gnome-terminal --tab --title="Nav2 + AMCL" -- bash -c "source install/setup.bash; ros2 launch armsbot_navigation navigation_amcl.launch.py use_sim_time:=false; exec bash"
    
    gnome-terminal --tab --title="ArUco & Barcode" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation aruco_detection --ros-args -p use_sim_time:=false; ros2 run armsbot_camera barcode_detection; exec bash"
    
    # Launch the WMS Bridge and Task Manager
    gnome-terminal --tab --title="WMS Bridge API" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation wms_bridge; exec bash"
    gnome-terminal --tab --title="Task Manager" -- bash -c "source install/setup.bash; ros2 run armsbot_navigation task_manager --ros-args -p use_sim_time:=false; exec bash"

    echo "All nodes started! WMS Bridge API is listening on port 8005."
else
    echo "Invalid option. Exiting."
fi
