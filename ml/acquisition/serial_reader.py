"""Serial EMG reader for ESP32 + ADS1115 acquisition."""
import serial
import serial.tools.list_ports
import time
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EMGSerialReader:
    """Reads structured CSV EMG packets from ESP32 over serial."""

    def __init__(self, port, baud_rate=500000, num_channels=1):
        self.port = port
        self.baud_rate = baud_rate
        self.num_channels = num_channels
        self.serial_conn = None
        self.stats = {"total_lines": 0, "valid_packets": 0, "malformed": 0}

    def connect(self):
        """Open serial connection. Returns True on success."""
        try:
            self.serial_conn = serial.Serial(
                self.port, self.baud_rate, timeout=1
            )
            time.sleep(2)  # ESP32 resets on serial open
            # Drain startup messages
            self.serial_conn.reset_input_buffer()
            logger.info(f"Connected to {self.port} at {self.baud_rate} baud")
            return True
        except serial.SerialException as e:
            logger.error(f"Failed to connect to {self.port}: {e}")
            return False

    def disconnect(self):
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            logger.info("Serial disconnected")

    @staticmethod
    def list_ports():
        """Return list of available serial port device names."""
        return [p.device for p in serial.tools.list_ports.comports()]

    def parse_line(self, raw_line):
        """Parse a single CSV line from ESP32.
        Supports both new format (timestamp_ms,ch0,...) and legacy format (ch0).
        Returns (timestamp_ms, [channel_values]) or None on failure.
        """
        self.stats["total_lines"] += 1
        try:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line or line.startswith("[") or line.startswith("---") or line.startswith("═") or line.startswith("✓") or line.startswith("✗") or line.startswith("ADC:"):
                # Skip log/debug messages from firmware
                return None
            
            # Remove label if present (e.g., "EMG:1024")
            if ":" in line:
                line = line.split(":")[-1].strip()
            
            parts = line.split(",")
            
            # Legacy format or EMG:val format: Just a single ADC value (e.g., "14567" or "EMG:14567")
            if len(parts) == 1:
                # Generate accurate synthetic timestamp based on PC time and known sample rate
                # This prevents USB buffering jitter from creating dt=0 and ruining validation.
                now_ms = int(time.time() * 1000)
                if getattr(self, '_last_ts', None) is None:
                    self._last_ts = now_ms
                    self._sample_idx = 0
                    
                # From ml.config import settings
                from ml.config import settings
                target_interval = 1000.0 / settings.SAMPLING_RATE_HZ
                
                # We anchor the synthetic time to the first received packet, but we allow it to
                # drift towards PC time if it gets too far off (e.g., due to dropped packets).
                synthetic_ts = int(self._last_ts + self._sample_idx * target_interval)
                
                # If synthetic time drifts more than 50ms from PC time, reset the anchor
                if abs(now_ms - synthetic_ts) > 50:
                    self._last_ts = now_ms
                    self._sample_idx = 0
                    synthetic_ts = now_ms
                else:
                    self._sample_idx += 1
                
                timestamp = synthetic_ts
                channels = [float(parts[0])]
                
                if self.num_channels > 1:
                    # Pad with zeros if we're expecting more channels
                    channels.extend([0.0] * (self.num_channels - 1))
                    
                self.stats["valid_packets"] += 1
                return timestamp, channels
                
            # New format: timestamp_ms,ch0[,ch1...]
            timestamp = int(parts[0])
            channels = []
            for i in range(1, min(len(parts), self.num_channels + 1)):
                channels.append(float(parts[i]))
            if len(channels) < self.num_channels:
                self.stats["malformed"] += 1
                return None
            self.stats["valid_packets"] += 1
            return timestamp, channels
        except (ValueError, UnicodeDecodeError, IndexError):
            self.stats["malformed"] += 1
            return None

    def read_samples(self, duration_sec, simulate=False):
        """Read EMG samples for a specified duration.
        Returns dict with 'timestamps' and 'channels' numpy arrays.
        """
        if simulate:
            return self._simulate_samples(duration_sec)

        if not self.serial_conn or not self.serial_conn.is_open:
            raise RuntimeError("Serial connection not open")

        self.stats = {"total_lines": 0, "valid_packets": 0, "malformed": 0}
        timestamps = []
        channel_data = [[] for _ in range(self.num_channels)]

        self.serial_conn.reset_input_buffer()
        end_time = time.time() + duration_sec

        while time.time() < end_time:
            try:
                raw = self.serial_conn.readline()
                if not raw:
                    continue
                result = self.parse_line(raw)
                if result is None:
                    continue
                ts, channels = result
                timestamps.append(ts)
                for i, val in enumerate(channels):
                    channel_data[i].append(val)
            except serial.SerialException as e:
                logger.warning(f"Serial error during read: {e}")
                break

        return {
            "timestamps": np.array(timestamps, dtype=np.int64),
            "channels": np.array(channel_data, dtype=np.float64).T,  # (n_samples, n_channels)
            "stats": dict(self.stats),
        }

    def _simulate_samples(self, duration_sec):
        """Generate clearly-marked simulated test data. NOT for production training."""
        from ml.config import settings
        logger.warning("SIMULATED_TEST_DATA — not for production use")
        n = int(duration_sec * settings.SAMPLING_RATE_HZ)
        t = np.linspace(0, duration_sec, n)
        timestamps = (t * 1000).astype(np.int64)
        channels = np.zeros((n, self.num_channels))
        for ch in range(self.num_channels):
            channels[:, ch] = (
                np.sin(2 * np.pi * 20 * t) * 500
                + np.random.normal(0, 50, n)
            )
        return {
            "timestamps": timestamps,
            "channels": channels,
            "stats": {"total_lines": n, "valid_packets": n, "malformed": 0},
            "is_simulated": True,
        }
