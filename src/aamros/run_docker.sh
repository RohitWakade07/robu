#!/bin/bash
docker run -it \
  --network=host \
  --ipc=host \
  -v /run/arduino-router.sock:/run/arduino-router.sock \
  -v ~/aam_ws/src:/ros2_ws/src \
  --name ros2_humble \
  ros2_humble_image \
  bash
