import serial
import serial.tools.list_ports
import time
import pandas as pd
import logging
from ml.config import settings

logger = logging.getLogger(__name__)

class EMGSerialReader:
    def __init__(self, port, baud_rate=settings.SERIAL_BAUD_RATE, num_channels=settings.NUM_CHANNELS):
        self.port = port
        self.baud_rate = baud_rate
        self.num_channels = num_channels
        self.serial_conn = None
        
    def connect(self):
        """Establish connection with the ESP32."""
        try:
            self.serial_conn = serial.Serial(self.port, self.baud_rate, timeout=1)
            time.sleep(2) # Wait for ESP32 to reset upon serial connection
            logger.info(f"Connected to {self.port} at {self.baud_rate} baud.")
            return True
        except serial.SerialException as e:
            logger.error(f"Failed to connect to {self.port}: {e}")
            return False

    def disconnect(self):
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            logger.info("Disconnected from serial port.")

    @staticmethod
    def list_ports():
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]

    def read_samples(self, duration_sec, simulate=False):
        """
        Reads samples for a specific duration.
        Expected serial format: "timestamp_ms,val0,val1,val2,val3\n"
        """
        if simulate:
            return self._simulate_samples(duration_sec)
            
        if not self.serial_conn or not self.serial_conn.is_open:
            raise Exception("Serial connection not open.")
            
        end_time = time.time() + duration_sec
        samples = []
        
        self.serial_conn.reset_input_buffer()
        
        while time.time() < end_time:
            try:
                line = self.serial_conn.readline().decode('utf-8').strip()
                if line:
                    parts = line.split(',')
                    # Expecting timestamp + channels
                    if len(parts) == self.num_channels + 1:
                        timestamp = int(parts[0])
                        channels = [float(p) for p in parts[1:]]
                        samples.append([timestamp] + channels)
            except Exception as e:
                # Malformed line or decode error
                logger.debug(f"Serial read error: {e}")
                continue
                
        # Return as DataFrame
        columns = ["timestamp"] + [f"ch{i}" for i in range(self.num_channels)]
        return pd.DataFrame(samples, columns=columns)

    def _simulate_samples(self, duration_sec):
        """Generate simulated data for TEST MODE."""
        import numpy as np
        logger.info("Generating SIMULATED_TEST_DATA")
        
        num_samples = int(duration_sec * settings.SAMPLING_RATE_HZ)
        timestamps = np.linspace(0, duration_sec * 1000, num_samples, dtype=int)
        
        data = {"timestamp": timestamps}
        for i in range(self.num_channels):
            # Synthetic sine waves with noise
            signal = np.sin(2 * np.pi * (10 + i * 5) * (timestamps / 1000.0))
            noise = np.random.normal(0, 0.5, num_samples)
            data[f"ch{i}"] = signal + noise
            
        df = pd.DataFrame(data)
        df["is_simulated"] = True
        return df
