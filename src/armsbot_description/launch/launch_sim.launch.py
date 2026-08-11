import os

from ament_index_python.packages import get_package_share_directory

from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource

from launch_ros.actions import Node
from launch.substitutions import PathJoinSubstitution

def generate_launch_description():

    package_name='armsbot_description' 
    
    set_env = SetEnvironmentVariable(
        name='IGN_GAZEBO_RESOURCE_PATH',
        value=os.path.join(get_package_share_directory(package_name), 'models')
    )

    rsp = IncludeLaunchDescription(
                PythonLaunchDescriptionSource([os.path.join(
                    get_package_share_directory(package_name),'launch','rsp.launch.py'
                )]), launch_arguments={'use_sim_time': 'true'}.items()
    )

    world_file = PathJoinSubstitution([
        get_package_share_directory(package_name),
        'worlds',
        'my_world.sdf'
    ])

    gazebo = IncludeLaunchDescription(
                PythonLaunchDescriptionSource([os.path.join(
                    get_package_share_directory('ros_gz_sim'), 'launch', 'gz_sim.launch.py')]),
                launch_arguments={'gz_args': ['-r -v 2 ', world_file]}.items()
             )

    # Spawn robot at X=3.0, Y=0.0 (Mathematical safe center of map bounds)
    spawn_entity = Node(package='ros_gz_sim', executable='create',
                        arguments=['-topic', 'robot_description',
                                   '-name', 'my_bot',
                                   '-x', '3.0',
                                   '-y', '0.0',
                                   '-z', '0.1',
                                   '-Y', '0.0'],
                        output='screen')

    joint_state_broadcaster_spawner = Node(
        package="controller_manager",
        executable="spawner",
        arguments=["joint_state_broadcaster"],
    )

    diff_drive_spawner = Node(
        package="controller_manager",
        executable="spawner",
        arguments=["differential_drive_controller"],
    )

    actuator_spawner = Node(
        package="controller_manager",
        executable="spawner",
        arguments=["linear_actuator_controller"],
    )

    bridge_node = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        arguments=[
            '/clock@rosgraph_msgs/msg/Clock[ignition.msgs.Clock',
            '/scan@sensor_msgs/msg/LaserScan[ignition.msgs.LaserScan',
            '/camera/image_raw@sensor_msgs/msg/Image[ignition.msgs.Image',
            '/imu@sensor_msgs/msg/Imu[ignition.msgs.IMU'
        ],
        output='screen'
    )

    return LaunchDescription([
        set_env,
        rsp,
        gazebo,
        spawn_entity,
        joint_state_broadcaster_spawner,
        diff_drive_spawner,
        actuator_spawner,
        bridge_node
    ])