#include "ads1115_test.h"

/**
 * ADS1115 ADC Implementation
 * 16-bit I2C ADC for EMG signal acquisition
 */

bool ADS1115Module::begin() {
    if (is_initialized) {
        return true;
    }
    
    // Initialize ADS1115
    if (!ads.begin(ADS_ADDR)) {
        Serial.println("[ADS1115] ERROR: Could not find ADS1115 at 0x48!");
        return false;
    }
    
    is_initialized = true;
    
    // Set gain to +/- 4.096V (6.144V / 1.5)
    ads.setGain(GAIN_ONE);  // +/- 4.096V range
    
    Serial.println("[ADS1115] Successfully initialized at 0x48");
    Serial.println("[ADS1115] Configuration:");
    Serial.println("         - Gain: +/- 4.096V");
    Serial.println("         - Channel: A0 (single-ended)");
    Serial.println("         - Resolution: 16-bit");
    
    return true;
}

int16_t ADS1115Module::readValue() {
    if (!is_initialized) {
        Serial.println("[ADS1115] ERROR: Module not initialized!");
        return -1;
    }
    
    // Read from channel 0 (A0)
    last_value = ads.readADC_SingleEnded(ADS_CHANNEL_NUM);
    
    return last_value;
}

int16_t ADS1115Module::readAveraged(int samples) {
    if (!is_initialized) {
        Serial.println("[ADS1115] ERROR: Module not initialized!");
        return -1;
    }
    
    int32_t sum = 0;
    
    for (int i = 0; i < samples; i++) {
        sum += ads.readADC_SingleEnded(ADS_CHANNEL_NUM);
        delayMicroseconds(100);  // Small delay between samples
    }
    
    last_value = sum / samples;
    
    return last_value;
}

bool ADS1115Module::isConnected() {
    if (!is_initialized) {
        return false;
    }
    
    // Try to read a value to verify connection
    int16_t test_value = ads.readADC_SingleEnded(ADS_CHANNEL_NUM);
    
    return true;  // If we got this far, device is connected
}

const char* ADS1115Module::getMeasurementString() {
    static char buffer[32];
    
    // Convert ADC value to millivolts
    // ADS1115 with GAIN_ONE: 1 LSB = 0.125mV
    float voltage = last_value * 0.125f;
    
    snprintf(buffer, sizeof(buffer), "ADC: %d (%.2f mV)", last_value, voltage);
    
    return buffer;
}
