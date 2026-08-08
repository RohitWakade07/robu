import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

def generate_launch_description():
    nav2_bringup_dir = get_package_share_directory('nav2_bringup')
    armsbot_nav_dir = get_package_share_directory('armsbot_navigation')

    params_file = os.path.join(armsbot_nav_dir, 'config', 'nav2_params.yaml')
    map_file = os.path.join(armsbot_nav_dir, 'maps', 'my_map.yaml')

    return LaunchDescription([
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(
                os.path.join(nav2_bringup_dir, 'launch', 'bringup_launch.py')
            ),
            launch_arguments={
                'map': map_file,
                'params_file': params_file,
                'use_sim_time': 'true'
            }.items(),
        )
    ])