/**
 * ASV - A Silent Voice
 * ESP32 Firmware for Silent Speech Recognition System
 * 
 * Hardware Configuration:
 * - ESP32 DevKit V1
 * - ADS1115 16-bit ADC (I2C Address: 0x48)
 * - SSD1306 128x64 OLED Display (I2C Address: 0x3C)
 * - I2C Bus: GPIO21 (SDA), GPIO22 (SCL)
 * - Serial Monitor: 115200 baud
 * 
 * Features:
 * - I2C device detection and scanning
 * - Real-time ADC data acquisition from ADS1115
 * - OLED status display
 * - BLE advertising as "ASV-Device"
 * - Professional serial debugging output
 * 
 * Author: ASV Development Team
 * Date: 2024
 */

#include <Arduino.h>
#include "i2c_scanner.h"
#include "oled_display.h"
#include "ads1115_test.h"
#include "ble_test.h"

// ============================================================================
// GLOBAL INSTANCES
// ============================================================================

I2CScanner i2c_scanner;          // I2C device scanner
OLEDDisplay oled_display;        // OLED display manager
ADS1115Module adc_module;        // ADC module
BLEModule ble_module;            // BLE module

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

#define I2C_SDA_PIN 21           // GPIO21 for I2C SDA
#define I2C_SCL_PIN 22           // GPIO22 for I2C SCL
#define I2C_FREQUENCY 100000     // 100kHz I2C bus speed

#define LOOP_DELAY_MS 500        // Main loop delay
#define ADC_SAMPLES 10           // Samples for averaging

// ============================================================================
// GLOBAL STATE VARIABLES
// ============================================================================

bool system_ready = false;
bool ble_initialized = false;
bool ads_connected = false;
bool oled_connected = false;

unsigned long loop_counter = 0;
unsigned long last_update_time = 0;

// ============================================================================
// SERIAL COMMUNICATION UTILITIES
// ============================================================================

void print_separator(const char* title) {
    Serial.println("\n════════════════════════════════════════════════════════════");
    if (title) {
        Serial.print("  ");
        Serial.println(title);
        Serial.println("════════════════════════════════════════════════════════════");
    }
}

void print_system_info() {
    print_separator("SYSTEM INFORMATION");
    
    Serial.println("[INFO] Device: ESP32 DevKit V1");
    Serial.println("[INFO] Firmware: ASV Silent Speech Recognition");
    Serial.println("[INFO] Version: 1.0.0");
    Serial.println("[INFO] Board: esp32doit-devkit1");
    Serial.println("[INFO] Arduino Framework: ESP32 Arduino");
    
    Serial.print("[INFO] Chip ID: ");
    Serial.println(ESP.getChipId(), HEX);
    
    Serial.print("[INFO] Flash Size: ");
    Serial.print(ESP.getFlashChipSize() / 1024 / 1024);
    Serial.println(" MB");
    
    Serial.print("[INFO] Free RAM: ");
    Serial.print(ESP.getFreeHeap() / 1024);
    Serial.println(" KB");
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    
    // Wait for serial to be ready
    delay(1000);
    
    print_separator("ASV - A SILENT VOICE");
    Serial.println("[STARTUP] Initializing ESP32 firmware...\n");
    
    print_system_info();
    
    // ========================================================================
    // Step 1: Initialize I2C Bus
    // ========================================================================
    print_separator("STEP 1: I2C BUS INITIALIZATION");
    Serial.println("[I2C] Initializing I2C bus...");
    Serial.println("[I2C] Configuration:");
    Serial.println("[I2C]   - SDA Pin: GPIO" + String(I2C_SDA_PIN));
    Serial.println("[I2C]   - SCL Pin: GPIO" + String(I2C_SCL_PIN));
    Serial.println("[I2C]   - Frequency: " + String(I2C_FREQUENCY / 1000) + " kHz\n");
    
    i2c_scanner.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQUENCY);
    
    // Scan for I2C devices
    delay(500);
    int devices_found = i2c_scanner.scan();
    
    if (devices_found < 2) {
        Serial.println("[ERROR] Not all required I2C devices found!");
        Serial.println("[ERROR] Expected: ADS1115 (0x48) + SSD1306 (0x3C)");
    }
    
    // ========================================================================
    // Step 2: Initialize OLED Display
    // ========================================================================
    print_separator("STEP 2: OLED DISPLAY INITIALIZATION");
    Serial.println("[OLED] Initializing SSD1306 128x64 display...\n");
    
    if (oled_display.begin()) {
        oled_connected = true;
        oled_display.showSplash();
        delay(2000);
        Serial.println("[OLED] ✓ Display initialized successfully\n");
    } else {
        Serial.println("[OLED] ✗ FAILED to initialize display!\n");
    }
    
    // ========================================================================
    // Step 3: Initialize ADS1115 ADC
    // ========================================================================
    print_separator("STEP 3: ADS1115 ADC INITIALIZATION");
    Serial.println("[ADS1115] Initializing 16-bit ADC module...\n");
    
    if (adc_module.begin()) {
        ads_connected = true;
        Serial.println("[ADS1115] ✓ ADC initialized successfully\n");
    } else {
        Serial.println("[ADS1115] ✗ FAILED to initialize ADC!\n");
    }
    
    // ========================================================================
    // Step 4: Initialize BLE
    // ========================================================================
    print_separator("STEP 4: BLUETOOTH LOW ENERGY (BLE) INITIALIZATION");
    Serial.println("[BLE] Initializing Bluetooth Low Energy...\n");
    
    ble_module.begin();
    ble_module.startAdvertising();
    ble_initialized = true;
    
    Serial.println("\n[BLE] ✓ BLE initialized successfully\n");
    
    // ========================================================================
    // System Ready
    // ========================================================================
    print_separator("SYSTEM STATUS");
    
    system_ready = (ads_connected && oled_connected && ble_initialized);
    
    Serial.println("[STATUS] I2C Bus:         ✓ READY");
    Serial.println("[STATUS] OLED Display:    " + String(oled_connected ? "✓" : "✗") + " " + 
                   String(oled_connected ? "READY" : "OFFLINE"));
    Serial.println("[STATUS] ADS1115 ADC:    " + String(ads_connected ? "✓" : "✗") + " " + 
                   String(ads_connected ? "READY" : "OFFLINE"));
    Serial.println("[STATUS] BLE Module:     ✓ READY");
    Serial.println("[STATUS] System Status:  " + String(system_ready ? "✓ READY" : "✗ ERRORS DETECTED"));
    
    if (system_ready) {
        Serial.println("\n✓ ALL SYSTEMS OPERATIONAL - READY FOR TESTING\n");
        
        if (oled_connected) {
            oled_display.showStatus(ble_module.isConnected(), ads_connected, 0);
        }
    } else {
        Serial.println("\n✗ SYSTEM NOT READY - CHECK HARDWARE CONNECTIONS\n");
        
        if (oled_connected) {
            oled_display.showError("INIT FAILED!");
        }
    }
    
    print_separator(nullptr);
    delay(2000);
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
    if (!system_ready) {
        // Blink or display error if system not ready
        delay(1000);
        return;
    }
    
    // ========================================================================
    // Read ADC Values
    // ========================================================================
    
    if (ads_connected) {
        int16_t adc_raw = adc_module.readAveraged(ADC_SAMPLES);
        float adc_voltage = adc_raw * 0.125f;  // Convert to mV
        
        // Print to serial every iteration
        Serial.print("[ADC] Raw: ");
        Serial.print(adc_raw);
        Serial.print(" | Voltage: ");
        Serial.print(adc_voltage, 2);
        Serial.print(" mV | BLE: ");
        Serial.println(ble_module.getStatusString());
    }
    
    // ========================================================================
    // Update OLED Display (every 500ms)
    // ========================================================================
    
    unsigned long current_time = millis();
    if (current_time - last_update_time >= 500) {
        last_update_time = current_time;
        
        if (oled_connected && ads_connected) {
            int16_t adc_raw = adc_module.readValue();
            oled_display.showStatus(
                ble_module.isConnected(),
                ads_connected,
                adc_raw
            );
        }
        
        // Print loop counter every update
        loop_counter++;
        if (loop_counter % 20 == 0) {  // Every 10 seconds
            Serial.print("[LOOP] Iterations: ");
            Serial.print(loop_counter);
            Serial.print(" | Uptime: ");
            Serial.print(current_time / 1000);
            Serial.println(" seconds");
        }
    }
    
    // ========================================================================
    // Main Loop Delay
    // ========================================================================
    
    delay(LOOP_DELAY_MS);
}

// ============================================================================
// END OF FIRMWARE
// ============================================================================
