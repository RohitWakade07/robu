#include "ArduinoGraphics.h"
#include "Arduino_LED_Matrix.h"

ArduinoLEDMatrix matrix;

// Voltage divider resistor values in Ohms
const float R1 = 20000.0; 
const float R2 = 10000.0;

// Arduino reference voltage (usually exactly 5.0V, but measure with a multimeter for best accuracy)
const float V_REF = 5.0; 

// Battery thresholds
const float BATTERY_MAX_V = 13.6; // 100%
const float BATTERY_MIN_V = 11.0; // 0%

int getBatteryPercentageRounded(int analogPin) {
  // Read the analog value (0 - 1023)
  // Take an average of 10 readings to smooth out noise
  long sum = 0;
  for(int i = 0; i < 10; i++) {
    sum += analogRead(analogPin);
    delay(2);
  }
  int analogValue = sum / 10;

  // Calculate the voltage at the Arduino pin
  float pinVoltage = (analogValue * V_REF) / 1023.0;

  // Reverse the voltage divider math to find the actual battery voltage
  float batteryVoltage = pinVoltage * ((R1 + R2) / R2);

  // Map the voltage to a percentage (0 to 100%)
  float batteryPercentage = ((batteryVoltage - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0;
  
  if (batteryPercentage > 100.0) batteryPercentage = 100.0;
  if (batteryPercentage < 0.0) batteryPercentage = 0.0;

  // Quantize to the nearest 5%
  int roundedPercentage = ((int)(batteryPercentage + 2.5) / 5) * 5;
  
  return roundedPercentage;
}

void setup() {
  Serial.begin(115200);
  
  // Initialize the built-in LED matrix
  matrix.begin();
  
  // Configure the text properties
  matrix.beginDraw();
  matrix.stroke(0xFFFFFFFF);
  matrix.textScrollSpeed(50);
  matrix.textFont(Font_5x7);
  matrix.endDraw();
}

void loop() {
  int currentBattery = getBatteryPercentageRounded(A0);
  
  // 1. Display on the Uno Q / R4 LED Matrix
  matrix.beginDraw();
  matrix.stroke(0xFFFFFFFF);
  matrix.textScrollSpeed(50);
  matrix.textFont(Font_5x7);
  matrix.beginText(0, 1, 0xFFFFFF); // X, Y, Color
  
  // Print the percentage to the matrix buffer
  matrix.print(currentBattery);
  
  // Add a small '%' symbol or indicator if desired, but 2 digits fit perfectly
  matrix.endText(SCROLL_LEFT); // Scroll if it's 100, otherwise it will just display
  matrix.endDraw();
  
  // 2. Append it to your RPC string state
  // Currently your robot returns: "ticks_l, ticks_r, actual_l, actual_r, target_l, target_r"
  // You should change the string generation in your existing Arduino code to append the battery:
  // String state_str = String(ticks_l) + "," + String(ticks_r) + ... + "," + String(currentBattery);
  
  delay(1000); // Check every 1 second
}
