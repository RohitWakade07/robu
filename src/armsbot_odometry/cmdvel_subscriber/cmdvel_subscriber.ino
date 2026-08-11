#include <Arduino.h>
#include <micro_ros_arduino.h>
#include <stdio.h>
#include <rcl/rcl.h>
#include <rcl/error_handling.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <geometry_msgs/msg/twist.h>
#include <geometry_msgs/msg/point.h>

// --- Robot Physical Parameters ---
const float WHEEL_RADIUS = 0.033;      // Meters (e.g., 66mm diameter)
const float WHEEL_SEPARATION = 0.20;   // Meters (Distance between left and right wheels)
const float TICKS_PER_REV = 5040.0;    // 4X Decoding for Johnson Motor

// --- Motor Pins (L298N) ---
#define ENA_L 27 // Left Motor PWM
#define IN1_L 26 // Left Motor Dir 1
#define IN2_L 25 // Left Motor Dir 2

#define ENB_R 14 // Right Motor PWM
#define IN3_R 12 // Right Motor Dir 1
#define IN4_R 13 // Right Motor Dir 2

// --- Encoder Pins ---
#define ENC_L_A 32
#define ENC_L_B 33
#define ENC_R_A 34 // Note: GPIO 34-39 are input only (perfect for encoders)
#define ENC_R_B 35 

// --- micro-ROS Objects ---
rcl_subscription_t subscriber;
rcl_publisher_t publisher;
geometry_msgs__msg__Twist twist_msg;
geometry_msgs__msg__Point ticks_msg;
rclc_executor_t executor;
rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;

// --- Control Variables ---
volatile long leftTicks = 0;
volatile long rightTicks = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

float target_ticks_sec_l = 0.0;
float target_ticks_sec_r = 0.0;
float integral_l = 0.0;
float integral_r = 0.0;

long last_ticks_l = 0;
long last_ticks_r = 0;
unsigned long last_time = 0;

// --- Encoder Interrupts (4X Decoding) ---
void IRAM_ATTR isr_L_A() {
  portENTER_CRITICAL_ISR(&mux);
  if (digitalRead(ENC_L_A) == digitalRead(ENC_L_B)) leftTicks++; else leftTicks--;
  portEXIT_CRITICAL_ISR(&mux);
}
void IRAM_ATTR isr_L_B() {
  portENTER_CRITICAL_ISR(&mux);
  if (digitalRead(ENC_L_A) != digitalRead(ENC_L_B)) leftTicks++; else leftTicks--;
  portEXIT_CRITICAL_ISR(&mux);
}
void IRAM_ATTR isr_R_A() {
  portENTER_CRITICAL_ISR(&mux);
  // Right motor is usually mirrored, so we invert the tick addition here
  if (digitalRead(ENC_R_A) == digitalRead(ENC_R_B)) rightTicks--; else rightTicks++;
  portEXIT_CRITICAL_ISR(&mux);
}
void IRAM_ATTR isr_R_B() {
  portENTER_CRITICAL_ISR(&mux);
  if (digitalRead(ENC_R_A) != digitalRead(ENC_R_B)) rightTicks--; else rightTicks++;
  portEXIT_CRITICAL_ISR(&mux);
}

// --- Macros ---
#define RCCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){while(1){delay(100);}}}
#define RCSOFTCHECK(fn) { rcl_ret_t temp_rc = fn; if((temp_rc != RCL_RET_OK)){}}

// --- cmd_vel Callback & Differential Kinematics ---
void twist_callback(const void * msgin) {
  const geometry_msgs__msg__Twist * msg = (const geometry_msgs__msg__Twist *)msgin;
  
  float linear_x = msg->linear.x;  // Forward speed (m/s)
  float angular_z = msg->angular.z; // Rotation speed (rad/s)

  // Differential Drive Kinematics Equations
  float vel_left = linear_x - (angular_z * WHEEL_SEPARATION / 2.0);
  float vel_right = linear_x + (angular_z * WHEEL_SEPARATION / 2.0);

  float wheel_circumference = 2.0 * PI * WHEEL_RADIUS;
  
  target_ticks_sec_l = (vel_left / wheel_circumference) * TICKS_PER_REV;
  target_ticks_sec_r = (vel_right / wheel_circumference) * TICKS_PER_REV;
}

// --- Motor Control Helper ---
void driveMotor(int en, int in1, int in2, float control_signal) {
  int speed = abs(control_signal);
  if (speed > 255) speed = 255;
  if (speed > 0 && speed < 70) speed = 70; // L298N deadband

  if (control_signal == 0) {
    digitalWrite(in1, LOW); digitalWrite(in2, LOW); analogWrite(en, 0);
  } else if (control_signal > 0) {
    digitalWrite(in1, HIGH); digitalWrite(in2, LOW); analogWrite(en, speed);
  } else {
    digitalWrite(in1, LOW); digitalWrite(in2, HIGH); analogWrite(en, speed);
  }
}

void setup() {
  set_microros_transports();

  // Pin Setup
  pinMode(ENC_L_A, INPUT_PULLUP); pinMode(ENC_L_B, INPUT_PULLUP);
  pinMode(ENC_R_A, INPUT_PULLUP); pinMode(ENC_R_B, INPUT_PULLUP);
  
  attachInterrupt(digitalPinToInterrupt(ENC_L_A), isr_L_A, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_L_B), isr_L_B, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), isr_R_A, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_R_B), isr_R_B, CHANGE);

  pinMode(ENA_L, OUTPUT); pinMode(IN1_L, OUTPUT); pinMode(IN2_L, OUTPUT);
  pinMode(ENB_R, OUTPUT); pinMode(IN3_R, OUTPUT); pinMode(IN4_R, OUTPUT);
  
  driveMotor(ENA_L, IN1_L, IN2_L, 0);
  driveMotor(ENB_R, IN3_R, IN4_R, 0);

  delay(2000);

  // micro-ROS Setup
  allocator = rcl_get_default_allocator();
  RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));
  RCCHECK(rclc_node_init_default(&node, "esp32_base_node", "", &support));

  RCCHECK(rclc_subscription_init_default(
    &subscriber, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Twist), "cmd_vel"));

  RCCHECK(rclc_publisher_init_default(
    &publisher, &node, ROSIDL_GET_MSG_TYPE_SUPPORT(geometry_msgs, msg, Point), "motor_ticks"));

  RCCHECK(rclc_executor_init(&executor, &support.context, 1, &allocator));
  RCCHECK(rclc_executor_add_subscription(&executor, &subscriber, &twist_msg, &twist_callback, ON_NEW_DATA));
}

void loop() {
  RCCHECK(rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10)));

  unsigned long current_time = millis();
  if (current_time - last_time >= 50) { // Run at 20Hz
    float dt = (current_time - last_time) / 1000.0;
    last_time = current_time;

    // 1. Safely read ticks
    long current_l, current_r;
    portENTER_CRITICAL(&mux);
    current_l = leftTicks;
    current_r = rightTicks;
    portEXIT_CRITICAL(&mux);

    // 2. Publish Odometry Data
    ticks_msg.x = (double)current_l;
    ticks_msg.y = (double)current_r;
    ticks_msg.z = 0.0;
    RCSOFTCHECK(rcl_publish(&publisher, &ticks_msg, NULL));

    // 3. Calculate Current Velocity (Ticks/Sec)
    float current_sec_l = (current_l - last_ticks_l) / dt;
    float current_sec_r = (current_r - last_ticks_r) / dt;
    last_ticks_l = current_l;
    last_ticks_r = current_r;

    // 4. PI Controller Math
    float error_l = target_ticks_sec_l - current_sec_l;
    float error_r = target_ticks_sec_r - current_sec_r;

    float Kp = 0.05, Ki = 0.1;

    // Hard stop and reset integrals if cmd_vel is 0
    if (target_ticks_sec_l == 0) { integral_l = 0; error_l = 0; }
    else { integral_l += (error_l * dt); }
    
    if (target_ticks_sec_r == 0) { integral_r = 0; error_r = 0; }
    else { integral_r += (error_r * dt); }

    // Anti-windup
    integral_l = constrain(integral_l, -255, 255);
    integral_r = constrain(integral_r, -255, 255);

    float pwm_l = (Kp * error_l) + (Ki * integral_l);
    float pwm_r = (Kp * error_r) + (Ki * integral_r);

    // 5. Apply power to motors
    if (target_ticks_sec_l == 0) driveMotor(ENA_L, IN1_L, IN2_L, 0);
    else driveMotor(ENA_L, IN1_L, IN2_L, pwm_l);

    if (target_ticks_sec_r == 0) driveMotor(ENB_R, IN3_R, IN4_R, 0);
    else driveMotor(ENB_R, IN3_R, IN4_R, pwm_r);
  }
}
