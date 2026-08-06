import pytest
import numpy as np
import pandas as pd
import os
import sys
from pathlib import Path

# Fix python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from ml.config import settings
from ml.preprocessing.pipeline import ASVPreprocessor
from ml.utils.features import EMGFeatureExtractor
from ml.inference.realtime_engine import RealtimeASVEngine

def test_feature_extractor_vectorized():
    extractor = EMGFeatureExtractor(fs=500)
    
    # Create dummy data (256 samples, 4 channels)
    window = np.random.randn(256, 4)
    
    features = extractor.extract_features_vectorized(window, include_frequency=True)
    
    # Check that basic features are present and correct shape
    for feat in ['MAV', 'RMS', 'VAR', 'STD', 'WL', 'ZCR', 'SSC', 'MF', 'MEDF']:
        assert feat in features, f"Missing feature {feat}"
        assert len(features[feat]) == 4, f"{feat} has wrong shape: {features[feat].shape}"
        
    flat_feat, names = extractor.flatten_features(features)
    assert len(flat_feat) == 4 * 9 # 9 features * 4 channels
    assert len(names) == len(flat_feat)

def test_asv_preprocessor_fit():
    preprocessor = ASVPreprocessor(is_training=True)
    
    # Create dummy dataframe representing a recording
    num_samples = 1000
    df = pd.DataFrame({
        'timestamp': np.arange(num_samples),
        'ch0': np.random.randn(num_samples),
        'ch1': np.random.randn(num_samples),
        'ch2': np.random.randn(num_samples),
        'ch3': np.random.randn(num_samples),
        'label': ['HELLO'] * num_samples,
        'subject': ['TEST_SUB'] * num_samples,
        'repetition': [1] * num_samples
    })
    
    features_df = preprocessor.fit([df])
    
    assert not features_df.empty
    assert preprocessor.scaler is not None
    assert preprocessor.feature_names is not None
    assert len(preprocessor.feature_names) > 0

def test_realtime_engine_not_trained():
    # If no model exists, it should safely return MODEL_NOT_TRAINED
    engine = RealtimeASVEngine(model_dir="non_existent_dir")
    
    assert engine.is_loaded == False
    
    dummy_window = np.zeros((settings.WINDOW_SIZE, settings.NUM_CHANNELS))
    res = engine.predict_window(dummy_window)
    
    assert res["status"] == "MODEL_NOT_TRAINED"
    assert res["prediction"] is None
