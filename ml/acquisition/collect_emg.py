import os
import time
import argparse
import logging
import pandas as pd
from pathlib import Path

# Fix python path if running directly
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from ml.config import settings
from ml.acquisition.serial_reader import EMGSerialReader

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def countdown(seconds):
    for i in range(seconds, 0, -1):
        print(f"{i}...")
        time.sleep(1)

def run_collection(subject, word, repetitions, duration, port, simulate):
    reader = EMGSerialReader(port)
    
    if not simulate:
        if not reader.connect():
            logger.error("Exiting due to connection failure.")
            return
            
    try:
        for rep in range(1, repetitions + 1):
            print(f"\n--- Repetition {rep}/{repetitions} for word '{word}' ---")
            print("Get ready...")
            countdown(3)
            
            print("RECORDING... (Perform the gesture/articulation now)")
            df = reader.read_samples(duration, simulate=simulate)
            
            print("REST...")
            
            # Add metadata
            df['subject'] = subject
            df['label'] = word
            df['repetition'] = rep
            
            # Save file safely
            timestamp_str = time.strftime("%Y%m%d_%H%M%S")
            filename = f"sub_{subject}_word_{word}_rep_{rep}_{timestamp_str}.csv"
            save_path = settings.RAW_DATA_DIR / filename
            
            df.to_csv(save_path, index=False)
            logger.info(f"Saved {len(df)} samples to {save_path}")
            
            if rep < repetitions:
                time.sleep(2)
                
    finally:
        if not simulate:
            reader.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ASV EMG Data Collection CLI")
    parser.add_argument("--subject", type=str, required=True, help="Subject ID")
    parser.add_argument("--word", type=str, required=True, choices=settings.VOCABULARY, help="Target word")
    parser.add_argument("--reps", type=int, default=5, help="Number of repetitions")
    parser.add_argument("--duration", type=float, default=2.0, help="Duration of each recording in seconds")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g., COM3 or /dev/ttyUSB0)")
    parser.add_argument("--simulate", action="store_true", help="Run in TEST MODE with simulated data")
    
    args = parser.parse_args()
    
    if not args.simulate and not args.port:
        print("Available ports:", EMGSerialReader.list_ports())
        args.port = input("Enter serial port: ")
        
    run_collection(args.subject, args.word, args.reps, args.duration, args.port, args.simulate)
