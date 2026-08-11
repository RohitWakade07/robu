import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from sensor_msgs.msg import Image, CompressedImage
from cv_bridge import CvBridge
import cv2
import numpy as np
from onvif import ONVIFCamera

class ImouCameraNode(Node):
    def __init__(self):
        super().__init__('imou_camera_node')
        
        # --- Centralized Camera Credentials ---
        self.ip_address = '10.230.76.56'
        self.username = 'admin'
        self.password = 'L2C68A82'
        
        # ==========================================
        # 1. PUBLISHER SETUP (Raw & Compressed)
        # ==========================================
        self.pub_raw = self.create_publisher(Image, 'camera/image_raw', 10)
        self.pub_comp = self.create_publisher(CompressedImage, 'camera/image_compressed', 10)
        self.bridge = CvBridge()
        
        self.rtsp_url = f"rtsp://{self.username}:{self.password}@{self.ip_address}:554/cam/realmonitor?channel=1&subtype=1"
        
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not self.cap.isOpened():
            self.get_logger().error(f"Failed to open RTSP stream at {self.ip_address}")
        else:
            self.timer = self.create_timer(1.0 / 30.0, self.timer_callback)
            self.get_logger().info("Video connected! Publishing BOTH Raw and Compressed images.")

        # ==========================================
        # 2. SUBSCRIBER SETUP (ONVIF PTZ Control)
        # ==========================================
        self.subscription = self.create_subscription(
            Twist, '/camera/cmd_vel', self.listener_callback, 10)
            
        self.get_logger().info("Connecting to ONVIF PTZ service...")
        
        try:
            self.mycam = ONVIFCamera(self.ip_address, 80, self.username, self.password)
            self.media = self.mycam.create_media_service()
            self.ptz = self.mycam.create_ptz_service()
            
            profiles = self.media.GetProfiles()
            self.profile_token = profiles[0].token
            
            self.move_request = self.ptz.create_type('ContinuousMove')
            self.move_request.ProfileToken = self.profile_token
            
            self.current_state = "STOPPED"
            self.get_logger().info("ONVIF PTZ connected! Listening on /camera/cmd_vel")
            
        except Exception as e:
            self.get_logger().error(f"Failed to connect PTZ via ONVIF: {e}")
            self.mycam = None

    # --- Dual Video Publishing Loop ---
    def timer_callback(self):
        ret, frame = self.cap.read()
        if ret:
            timestamp = self.get_clock().now().to_msg()
            frame_id = 'camera_link_optical'

            # 1. Publish the RAW image
            raw_msg = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
            raw_msg.header.stamp = timestamp
            raw_msg.header.frame_id = frame_id
            self.pub_raw.publish(raw_msg)

            # 2. Publish the COMPRESSED image
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
            success, encoded_image = cv2.imencode('.jpg', frame, encode_param)

            if success:
                comp_msg = CompressedImage()
                comp_msg.header.stamp = timestamp
                comp_msg.header.frame_id = frame_id
                comp_msg.format = "jpeg"
                comp_msg.data = np.array(encoded_image).tobytes()
                self.pub_comp.publish(comp_msg)
        else:
            self.get_logger().warn("Dropped frame or lost connection to camera video.")

    # --- PTZ Control Loop (Unchanged) ---
    def listener_callback(self, msg):
        if self.mycam is None:
            return

        threshold = 0.1
        pan = 0.0
        tilt = 0.0

        if msg.angular.z > threshold: pan = -0.5
        elif msg.angular.z < -threshold: pan = 0.5
        
        if msg.linear.x > threshold: tilt = 0.5
        elif msg.linear.x < -threshold: tilt = -0.5

        if pan == 0.0 and tilt == 0.0:
            if self.current_state != "STOPPED":
                self.ptz.Stop({'ProfileToken': self.profile_token})
                self.current_state = "STOPPED"
                self.get_logger().info("Camera Stopped.")
        else:
            self.move_request.Velocity = {
                'PanTilt': {'x': pan, 'y': tilt}
            }
            
            try:
                self.ptz.ContinuousMove(self.move_request)
                self.current_state = "MOVING"
            except Exception as e:
                self.get_logger().error(f"ONVIF Move Error: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = ImouCameraNode()
    
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        if hasattr(node, 'mycam') and node.mycam and node.current_state != "STOPPED":
            node.ptz.Stop({'ProfileToken': node.profile_token})
            node.get_logger().info("Emergency motor stop triggered.")
    finally:
        if hasattr(node, 'cap') and node.cap.isOpened():
            node.cap.release()
        
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()

if __name__ == '__main__':
    main()