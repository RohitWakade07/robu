import os
from glob import glob
from setuptools import setup

package_name = 'armsbot_navigation'

setup(
    name=package_name,
    version='0.0.1',
    packages=[package_name],
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob(os.path.join('launch', '*launch.[pxy][yma]*'))),
        (os.path.join('share', package_name, 'config'), glob(os.path.join('config', '*.yaml'))),
        (os.path.join('share', package_name, 'maps'), glob(os.path.join('maps', '*'))),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='marmik',
    maintainer_email='marmik@todo.todo',
    description='ROS 2 Nav2 Online SLAM and Visual Servoing package for armsbot AMR',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'task_manager = armsbot_navigation.task_manager:main',
            'picknplace = armsbot_navigation.picknplace:main',
            'aruco_detection = armsbot_navigation.aruco_detection:main',
            'wms_bridge = armsbot_navigation.wms_bridge:main',
        ],
    },
)