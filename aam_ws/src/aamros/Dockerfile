FROM ros:humble-ros-base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y \
    python3-pip \
    python3-colcon-common-extensions \
    tmux \
    nano \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install msgpack

RUN mkdir -p /ros2_ws/src

WORKDIR /ros2_ws

CMD ["bash"]
