import rclpy
from rclpy.node import Node
from rclpy.parameter import Parameter
from sensor_msgs.msg import Image
from geometry_msgs.msg import TransformStamped
import tf2_ros
from cv_bridge import CvBridge, CvBridgeError
import cv2
import numpy as np
from scipy.spatial.transform import Rotation as R
import yaml  
import os

class ArucoVisionTF(Node):
    def __init__(self):
        super().__init__(
            'aruco_vision_tf_publisher',
            parameter_overrides=[Parameter('use_sim_time', Parameter.Type.BOOL, True)]
        )
        
        self.team_id = 'arms_warehouse' 
        self.color_cam_sub = self.create_subscription(Image, '/camera/image_raw', self.colorimagecb, 10)

        self.cv_image = None
        self.bridge = CvBridge()

        yaml_path = os.path.expanduser('~/arms_ws/camera_info.yaml')
        try:
            with open(yaml_path, 'r') as f:
                calib_data = yaml.safe_load(f)
            self.cam_mat = np.array(calib_data['camera_matrix']['data']).reshape((3, 3))
            self.dist_mat = np.array(calib_data['distortion_coefficients']['data'])
        except Exception as e:
            self.cam_mat = np.array([[960.0, 0, 960.0], [0, 960.0, 540.0], [0, 0, 1]])
            self.dist_mat = np.zeros(5)

        self.tf_broadcaster = tf2_ros.TransformBroadcaster(self)
        
        # Exact offset from URDF: base_link -> chassis -> camera_link
        self.cam_offset = np.array([0.21, 0.0, 0.24])
        
        # Pure rotation matrix from Optical to ROS
        self.T_opt_to_ros = np.array([
            [ 0,  0,  1],
            [-1,  0,  0],
            [ 0, -1,  0]
        ])

    def colorimagecb(self, msg: Image):
        try:
            self.cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            self.aruco_detection(self.cv_image)
            cv2.waitKey(1)
        except CvBridgeError as e:
            self.get_logger().error(f"CV Bridge Error: {e}")

    def aruco_detection(self, rgb_image):
        aruco_area_threshold = 300
        output = rgb_image.copy()
        gray = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)

        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        parameters = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
        corners, ids, _ = detector.detectMarkers(gray)

        if ids is not None:
            for i, marker_corner in enumerate(corners):
                marker_id = int(ids[i][0])
                cv2.aruco.drawDetectedMarkers(output, [corners[i]], np.array([[marker_id]]))

                if marker_id in [1, 2, 3, 4]:
                    size_of_aruco_m = 0.08
                elif marker_id in [11, 12, 13, 14]:
                    size_of_aruco_m = 0.15
                else:
                    size_of_aruco_m = 0.10 
                
                pts = marker_corner[0]
                width = np.linalg.norm(pts[1] - pts[0])
                height = np.linalg.norm(pts[0] - pts[3])
                area = width * height

                if area > aruco_area_threshold:
                    marker_length = size_of_aruco_m
                    obj_points = np.array([
                        [-marker_length / 2,  marker_length / 2, 0],
                        [ marker_length / 2,  marker_length / 2, 0],
                        [ marker_length / 2, -marker_length / 2, 0],
                        [-marker_length / 2, -marker_length / 2, 0]
                    ], dtype=np.float32)

                    _, rvec, tvec = cv2.solvePnP(obj_points, marker_corner, self.cam_mat, self.dist_mat)
                    cv2.drawFrameAxes(output, self.cam_mat, self.dist_mat, rvec, tvec, 0.05)

                    aruco_data = {"id": marker_id, "tvec": tvec.flatten(), "rvec": rvec.flatten()}
                    self.publish_base_tf(aruco_data)
                    
        cv2.namedWindow("ArUco Target Hunter", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("ArUco Target Hunter", 640, 480)
        cv2.imshow("ArUco Target Hunter", output)

    def publish_base_tf(self, aruco_info):
        marker_id = aruco_info['id']
        if marker_id in [1, 2, 3, 4]:
            target_name = f"{self.team_id}_box_{marker_id}"
        else:
            target_name = f"{self.team_id}_rack_slot_{marker_id}"

        tvec_opt = np.array([aruco_info['tvec'][0], aruco_info['tvec'][1], aruco_info['tvec'][2]])
        tvec_base = np.dot(self.T_opt_to_ros, tvec_opt) + self.cam_offset

        r_opt = R.from_rotvec(aruco_info['rvec']).as_matrix()
        r_base = R.from_matrix(np.dot(self.T_opt_to_ros, r_opt))

        t_marker = TransformStamped()
        t_marker.header.stamp = self.get_clock().now().to_msg()
        t_marker.header.frame_id = 'base_link'
        t_marker.child_frame_id = target_name
        
        t_marker.transform.translation.x = float(tvec_base[0])
        t_marker.transform.translation.y = float(tvec_base[1])
        t_marker.transform.translation.z = float(tvec_base[2])
        
        qx, qy, qz, qw = r_base.as_quat()
        t_marker.transform.rotation.x = qx
        t_marker.transform.rotation.y = qy
        t_marker.transform.rotation.z = qz
        t_marker.transform.rotation.w = qw
        
        self.tf_broadcaster.sendTransform(t_marker)

        t_goal = TransformStamped()
        t_goal.header.stamp = self.get_clock().now().to_msg()
        t_goal.header.frame_id = target_name 
        t_goal.child_frame_id = f"{target_name}_goal"
        
        # FIX: X axis points towards robot. Goal is +0.4m towards robot.
        t_goal.transform.translation.x = 0.4
        t_goal.transform.translation.y = 0.0
        t_goal.transform.translation.z = 0.0
        
        t_goal.transform.rotation.x = 0.0
        t_goal.transform.rotation.y = 0.0
        t_goal.transform.rotation.z = 0.0
        t_goal.transform.rotation.w = 1.0
        
        self.tf_broadcaster.sendTransform(t_goal)

def main():
    rclpy.init()
    node = ArucoVisionTF()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()