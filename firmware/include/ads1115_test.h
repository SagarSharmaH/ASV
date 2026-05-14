#ifndef ADS1115_TEST_H
#define ADS1115_TEST_H

#include <Adafruit_ADS1X15.h>

/**
 * ADS1115 ADC Module
 * Manages 16-bit I2C ADC for EMG signal acquisition
 * 
 * Pin Configuration:
 * - SDA: GPIO21 (shared with OLED)
 * - SCL: GPIO22 (shared with OLED)
 * - Address: 0x48
 * - Analog Input: A0 (single-ended mode)
 */

#define ADS_ADDR 0x48
#define ADS_CHANNEL_NUM 0

class ADS1115Module {
public:
    /**
     * Initialize ADS1115
     * @return true if successful
     */
    bool begin();
    
    /**
     * Read single-ended value from channel 0
     * @return ADC value (0-32767)
     */
    int16_t readValue();
    
    /**
     * Read multiple samples and return average
     * @param samples Number of samples to average
     * @return Averaged ADC value
     */
    int16_t readAveraged(int samples = 10);
    
    /**
     * Get device status
     * @return true if device is responding
     */
    bool isConnected();
    
    /**
     * Get current measurement
     * @return Formatted measurement string
     */
    const char* getMeasurementString();

private:
    Adafruit_ADS1115 ads;
    bool is_initialized = false;
    int16_t last_value = 0;
};

#endif // ADS1115_TEST_H
