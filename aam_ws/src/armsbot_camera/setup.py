import os
from glob import glob
from setuptools import setup

package_name = 'armsbot_camera'

setup(
    name=package_name,
    version='0.0.0',
    packages=[package_name],
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        # This line tells ROS 2 where to find your launch files during the build
        (os.path.join('share', package_name, 'launch'), glob(os.path.join('launch', '*launch.[pxy][yma]*'))),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='maaz',
    maintainer_email='maaz@todo.todo',
    description='Unified Imou Ranger 2 Camera node (Video + PTZ)',
    license='TODO: License declaration',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'barcode_detection = armsbot_camera.barcode_detection:main',
            # This registers your Python script as a runnable executable
            'imou_camera = armsbot_camera.imou_camera_node:main',
        ],
    },
)
