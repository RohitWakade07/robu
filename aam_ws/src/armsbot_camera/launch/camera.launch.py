import os
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    imou_camera_node = Node(
        package='armsbot_camera',
        executable='imou_camera',
        name='imou_camera_node',
        output='screen',
        emulate_tty=True,
    )

    return LaunchDescription([
        imou_camera_node
    ])
