from setuptools import find_packages, setup

package_name = 'aamros'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools', 'msgpack'],
    zip_safe=True,
    maintainer='root',
    maintainer_email='root@todo.todo',
    description='Hardware bridge for aamros',
    license='TODO: License declaration',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
		    'robot_hardware_node = aamros.robot_hardware_node:main'
        ],
    },
)
