FROM ros:humble-ros-base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y \
    python3-pip \
    python3-colcon-common-extensions \
    python3-rosdep \
    python3-vcstool \
    python3-argcomplete \
    ros-humble-rclpy \
    ros-humble-std-msgs \
    ros-humble-sensor-msgs \
    ros-humble-geometry-msgs \
    ros-humble-nav-msgs \
    ros-humble-action-msgs \
    ros-humble-tf2 \
    ros-humble-tf2-ros \
    ros-humble-navigation2 \
    ros-humble-nav2-bringup \
    ros-humble-slam-toolbox \
    ros-humble-robot-localization \
    ros-humble-robot-state-publisher \
    ros-humble-xacro \
    ros-humble-cv-bridge \
    python3-opencv \
    libzbar0 \
    tmux \
    nano \
    git \
    curl \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install microROS agent and other Python dependencies
RUN pip3 install --upgrade pip
RUN pip3 install numpy fastapi uvicorn pydantic requests httpx pyzbar onvif-zeep


RUN mkdir -p /aam_ws/src

RUN echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
RUN echo "source /aam_ws/install/setup.bash 2>/dev/null || true" >> ~/.bashrc

WORKDIR /aam_ws

CMD ["bash"]
