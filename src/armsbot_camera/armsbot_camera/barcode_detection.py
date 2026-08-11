#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
try:
    from pyzbar.pyzbar import decode
except ImportError:
    decode = None

class BarcodeDetectionNode(Node):
    def __init__(self):
        super().__init__('barcode_detection_node')
        self.subscription = self.create_subscription(
            Image,
            '/camera/image_raw',
            self.image_callback,
            10)
        self.bridge = CvBridge()
        self.get_logger().info('Barcode detection node started.')

    def image_callback(self, msg):
        if decode is None:
            self.get_logger().warn('pyzbar is not installed. Run: sudo apt install libzbar0 && pip3 install pyzbar', throttle_duration_sec=10)
            return
            
        try:
            cv_image = self.bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f"Failed to convert image: {e}")
            return

        barcodes = decode(cv_image)
        for barcode in barcodes:
            barcode_data = barcode.data.decode('utf-8')
            barcode_type = barcode.type
            self.get_logger().info(f"Detected {barcode_type}: {barcode_data}")

def main(args=None):
    rclpy.init(args=args)
    node = BarcodeDetectionNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
