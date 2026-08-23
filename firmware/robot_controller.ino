/*
 * Author: Maaz Shaikh
 * PRN: 1032233996
 * Description: STM32 Hardware Controller (Motors, Actuator, LED, RPC) for UNO Form Factor
 * Note: Motor/Encoder directions inverted. Memory pre-allocated to prevent heap fragmentation.
 *
 * PATCHED:
 *  - All Bridge.provide(...) calls switched to Bridge.provide_safe(...). On the UNO Q,
 *    provide() callbacks run on a separate background RPC thread, concurrently with loop().
 *    This sketch had several handlers (especially set_target_position, which calls
 *    digitalWrite/analogWrite directly) racing against loop() on shared globals and the
 *    same actuator pins with no synchronization. provide_safe() runs the callback
 *    cooperatively inside loop() instead, eliminating the race.
 *  - Added a command watchdog: if no set_cmd_vel() call has arrived within CMD_TIMEOUT_MS,
 *    the wheel targets are forced to zero so the robot fails safe (stops) instead of
 *    running forever on the last command if communication is ever lost.
 */

#include <Arduino.h>
#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>

// ==========================================
// PIN DEFINITIONS (UNO Form Factor)
// ==========================================

// 1. Right Motor
#define ENA_R 9   // PWM Pin
#define IN1_R 7   // Flipped for direction correction
#define IN2_R 8   // Flipped for direction correction
#define ENC_R_A 3 // Hardware Interrupt Pin 1
#define ENC_R_B 5 // Digital Pin

// 2. Left Motor
#define ENB_L 6   // PWM Pin
#define IN3_L A1  // Flipped for direction correction
#define IN4_L A0  // Flipped for direction correction
#define ENC_L_A 2 // Hardware Interrupt Pin 0
#define ENC_L_B 4 // Digital Pin

// 3. Linear Actuator 
#define ENA_ACT 10 // PWM Pin
#define IN1_ACT A2 // Analog pin used as Digital
#define IN2_ACT A3 // Analog pin used as Digital

// 4. Addressable LED (NeoPixel)
#define LED_PIN 12       
#define NUM_LEDS 10      
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// ==========================================
// VARIABLES & STATE
// ==========================================
const float WHEEL_RADIUS = 0.05;      
const float WHEEL_SEPARATION = 0.42;    
const float TICKS_PER_REV = 5040.0;  

volatile long leftTicks = 0, rightTicks = 0;

float target_ticks_sec_l = 0.0, target_ticks_sec_r = 0.0;
float cur_sec_l = 0.0, cur_sec_r = 0.0;
float integral_l = 0.0, integral_r = 0.0;
long last_ticks_l = 0, last_ticks_r = 0;
unsigned long last_time = 0;

float Kp_l = 0.03, Ki_l = 0.01;  
float Kp_r = 0.03, Ki_r = 0.01;  

const float SPEED_MM_PER_SEC = 5.25, MAX_STROKE_MM = 200.0;
const int ACT_PWM_SPEED = 255; 
float current_position_mm = 0.0, target_position_mm = 0.0;
bool is_moving_actuator = false;
unsigned long move_start_time = 0, move_duration_ms = 0;

// --- Command watchdog ---
unsigned long last_cmd_time = 0;
const unsigned long CMD_TIMEOUT_MS = 500; // stop the drive motors if no cmd_vel in this long

// ==========================================
// INTERRUPTS & HARDWARE HELPERS
// ==========================================
void isr_L_A() { 
  if (digitalRead(ENC_L_B) == LOW) leftTicks++; 
  else leftTicks--; 
}

void isr_R_A() { 
  if (digitalRead(ENC_R_B) == LOW) rightTicks--; 
  else rightTicks++; 
}

void driveMotor(int en, int in1, int in2, float control_signal) {
  int speed = constrain(abs((int)control_signal), 0, 255);
  if (control_signal == 0) {
    digitalWrite(in1, LOW); digitalWrite(in2, LOW); analogWrite(en, 0);
  } else if (control_signal > 0) {
    digitalWrite(in1, HIGH); digitalWrite(in2, LOW); analogWrite(en, speed);
  } else {
    digitalWrite(in1, LOW); digitalWrite(in2, HIGH); analogWrite(en, speed);
  }
}

// ==========================================
// RPC CALLBACKS
// (All registered via Bridge.provide_safe -> these run inside loop(), not on the
//  background RPC thread, so they're safe to read/write the globals above.)
// ==========================================
String robot_state; // Global string for memory safety

String get_robot_state() {
  robot_state = ""; // Clear the string without deleting the memory block
  robot_state += leftTicks; robot_state += ",";
  robot_state += rightTicks; robot_state += ",";
  robot_state += cur_sec_l; robot_state += ",";
  robot_state += cur_sec_r; robot_state += ",";
  robot_state += target_ticks_sec_l; robot_state += ",";
  robot_state += target_ticks_sec_r;
  return robot_state;
}

void set_cmd_vel(float linear_x, float angular_z) {
  last_cmd_time = millis(); // feed the watchdog
  float vel_left = linear_x - (angular_z * WHEEL_SEPARATION / 2.0);
  float vel_right = linear_x + (angular_z * WHEEL_SEPARATION / 2.0);
  float circ = 2.0 * PI * WHEEL_RADIUS;
  target_ticks_sec_l = (vel_left / circ) * TICKS_PER_REV;
  target_ticks_sec_r = (vel_right / circ) * TICKS_PER_REV;
}

void set_target_position(float target) {
  if (is_moving_actuator) return; 
  target_position_mm = constrain(target, 0.0, MAX_STROKE_MM);
  float dist = target_position_mm - current_position_mm;
  if (abs(dist) > 0.5) {
    move_duration_ms = (unsigned long)((abs(dist) / SPEED_MM_PER_SEC) * 1000.0);
    digitalWrite(IN1_ACT, dist > 0 ? HIGH : LOW);
    digitalWrite(IN2_ACT, dist > 0 ? LOW : HIGH);
    analogWrite(ENA_ACT, ACT_PWM_SPEED);
    move_start_time = millis();
    is_moving_actuator = true;
  }
}

void set_pid_left(float p, float i) { Kp_l = p; Ki_l = i; integral_l = 0; }
void set_pid_right(float p, float i) { Kp_r = p; Ki_r = i; integral_r = 0; }

// ==========================================
// SETUP & LOOP
// ==========================================
void setup() {
  // Pre-allocate 128 bytes of memory to prevent heap fragmentation
  robot_state.reserve(128); 

  strip.begin();
  strip.setBrightness(50);
  strip.fill(strip.Color(255, 0, 0), 0, NUM_LEDS); 
  strip.show();
  
  pinMode(ENC_L_A, INPUT_PULLUP); pinMode(ENC_L_B, INPUT_PULLUP);
  pinMode(ENC_R_A, INPUT_PULLUP); pinMode(ENC_R_B, INPUT_PULLUP);
  
  // Attach interrupts ONLY to Channel A using RISING trigger
  attachInterrupt(digitalPinToInterrupt(ENC_L_A), isr_L_A, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC_R_A), isr_R_A, RISING);

  pinMode(ENA_R, OUTPUT); pinMode(IN1_R, OUTPUT); pinMode(IN2_R, OUTPUT);
  pinMode(ENB_L, OUTPUT); pinMode(IN3_L, OUTPUT); pinMode(IN4_L, OUTPUT);
  pinMode(ENA_ACT, OUTPUT); pinMode(IN1_ACT, OUTPUT); pinMode(IN2_ACT, OUTPUT);

  Bridge.begin();
  Bridge.provide_safe("get_robot_state", get_robot_state);
  Bridge.provide_safe("set_cmd_vel", set_cmd_vel);
  Bridge.provide_safe("set_target_position", set_target_position);
  Bridge.provide_safe("set_pid_left", set_pid_left);
  Bridge.provide_safe("set_pid_right", set_pid_right);
}

void loop() {
  unsigned long current_time = millis();
  if (current_time - last_time >= 50) { 
    float dt = (current_time - last_time) / 1000.0;
    last_time = current_time;

    // 0. Command watchdog: force a stop if cmd_vel has gone stale
    if (current_time - last_cmd_time > CMD_TIMEOUT_MS) {
      target_ticks_sec_l = 0;
      target_ticks_sec_r = 0;
    }

    // 1. LED State
    static bool was_moving = false;
    bool is_moving = (target_ticks_sec_l != 0 || target_ticks_sec_r != 0);
    if (is_moving != was_moving) {
      if (!is_moving) strip.fill(strip.Color(255, 0, 0), 0, NUM_LEDS); 
      else strip.fill(strip.Color(0, 255, 0), 0, NUM_LEDS);            
      strip.show(); 
      was_moving = is_moving;
    }

    // 2. Safely read encoders without interrupting
    noInterrupts(); long cur_l = leftTicks; long cur_r = rightTicks; interrupts();

    // Calculate current velocities
    cur_sec_l = -((cur_l - last_ticks_l) / dt); 
    cur_sec_r = -((cur_r - last_ticks_r) / dt); 
    last_ticks_l = cur_l; last_ticks_r = cur_r;

    // 3. PI Controller
    float err_l = target_ticks_sec_l - cur_sec_l;
    float err_r = target_ticks_sec_r - cur_sec_r;

    if (target_ticks_sec_l != 0) integral_l += err_l * dt; else integral_l = 0; 
    if (target_ticks_sec_r != 0) integral_r += err_r * dt; else integral_r = 0; 

    integral_l = constrain(integral_l, -25500, 25500);
    integral_r = constrain(integral_r, -25500, 25500);

    float pwm_l = constrain((Kp_l * err_l) + (Ki_l * integral_l), -255, 255);
    float pwm_r = constrain((Kp_r * err_r) + (Ki_r * integral_r), -255, 255);

    driveMotor(ENB_L, IN3_L, IN4_L, target_ticks_sec_l == 0 ? 0 : pwm_l);
    driveMotor(ENA_R, IN1_R, IN2_R, target_ticks_sec_r == 0 ? 0 : pwm_r);
  }

  // 4. Linear Actuator Logic
  if (is_moving_actuator && (millis() - move_start_time >= move_duration_ms)) {
    digitalWrite(IN1_ACT, LOW); digitalWrite(IN2_ACT, LOW); analogWrite(ENA_ACT, 0);
    current_position_mm = target_position_mm;
    is_moving_actuator = false;
  }
}
