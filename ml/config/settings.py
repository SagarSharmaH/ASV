import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "datasets" / "custom_silent_speech"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
METADATA_DIR = DATA_DIR / "metadata"
MODELS_DIR = BASE_DIR / "ml" / "models"

# Ensure directories exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, METADATA_DIR, MODELS_DIR]:
    os.makedirs(directory, exist_ok=True)

# Hardware & Acquisition Settings
# The actual rate achievable by the ADS1115 (e.g., 500 SPS, 860 SPS)
SAMPLING_RATE_HZ = 500  
NUM_CHANNELS = 4
SERIAL_BAUD_RATE = 115200

# DSP & Filtering
# Notch frequency to remove powerline interference
NOTCH_FREQ_HZ = 50  
NOTCH_QUALITY = 30

# Bandpass limits (must be strictly < Nyquist frequency)
BANDPASS_LOW_HZ = 10
BANDPASS_HIGH_HZ = min(400, (SAMPLING_RATE_HZ / 2) - 1)  

# Segmentation Settings
WINDOW_DURATION_MS = 256
OVERLAP_PERCENT = 0.5
WINDOW_SIZE = int(SAMPLING_RATE_HZ * (WINDOW_DURATION_MS / 1000.0))
STEP_SIZE = int(WINDOW_SIZE * (1.0 - OVERLAP_PERCENT))

# Vocabulary
VOCABULARY = [
    "HELLO",
    "HELP",
    "YES",
    "NO",
    "THANK_YOU"
]

# Random state for reproducibility
RANDOM_STATE = 42
