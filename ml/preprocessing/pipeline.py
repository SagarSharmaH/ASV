import numpy as np
import pandas as pd
import logging
from ml.config import settings
from ml.utils.filters import apply_standard_emg_filter
from ml.utils.features import EMGFeatureExtractor
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)

class ASVPreprocessor:
    def __init__(self, is_training=False):
        self.is_training = is_training
        self.scaler = None
        self.feature_extractor = EMGFeatureExtractor(fs=settings.SAMPLING_RATE_HZ)
        self.feature_names = None
        
    def fit(self, data_list):
        """Fit scaler on training data"""
        if not self.is_training:
            raise ValueError("fit() called but is_training=False")
            
        logger.info("Fitting ASVPreprocessor...")
        
        all_features = []
        for df in data_list:
            # Process each file's data
            features_df = self._process_recording(df)
            if not features_df.empty:
                all_features.append(features_df)
                
        if not all_features:
            raise ValueError("No valid features extracted from training data")
            
        combined_features = pd.concat(all_features, ignore_index=True)
        feature_cols = [c for c in combined_features.columns if c not in ['label', 'subject', 'repetition']]
        self.feature_names = feature_cols
        
        self.scaler = StandardScaler()
        self.scaler.fit(combined_features[feature_cols].values)
        logger.info("Scaler fitted successfully.")
        
        return combined_features

    def transform(self, df):
        """Transform data (training or inference)"""
        if self.scaler is None:
            raise ValueError("Scaler is not fitted or loaded")
            
        features_df = self._process_recording(df)
        if features_df.empty:
            return features_df
            
        features_df[self.feature_names] = self.scaler.transform(features_df[self.feature_names].values)
        return features_df

    def process_live_window(self, window_data):
        """
        Process a single live window during real-time inference.
        window_data: numpy array (n_samples, n_channels)
        """
        if self.scaler is None:
            raise ValueError("Scaler is not fitted or loaded")
            
        # 1. Filter
        filtered_window = apply_standard_emg_filter(
            window_data,
            fs=settings.SAMPLING_RATE_HZ,
            notch_freq=settings.NOTCH_FREQ_HZ,
            lowcut=settings.BANDPASS_LOW_HZ,
            highcut=settings.BANDPASS_HIGH_HZ
        )
        
        # 2. Extract features
        features_dict = self.feature_extractor.extract_features_vectorized(filtered_window, include_frequency=True)
        flat_features, feature_names = self.feature_extractor.flatten_features(features_dict)
        
        if self.feature_names is None:
            self.feature_names = feature_names
            
        # 3. Scale
        scaled_features = self.scaler.transform([flat_features])
        return scaled_features[0]

    def _process_recording(self, df):
        """Process a single recording dataframe (used in training/batch testing)"""
        if 'is_simulated' in df.columns and df['is_simulated'].any():
            # In production, we might want to reject simulated data
            # but for now we process it if provided
            pass
            
        # Find EMG channels
        emg_cols = [col for col in df.columns if col.startswith('ch') and col[2:].isdigit()]
        if len(emg_cols) == 0:
            logger.warning("No EMG channels found in data")
            return pd.DataFrame()
            
        emg_data = df[emg_cols].values
        
        # Filter whole recording (better than filtering small windows)
        filtered_data = apply_standard_emg_filter(
            emg_data,
            fs=settings.SAMPLING_RATE_HZ,
            notch_freq=settings.NOTCH_FREQ_HZ,
            lowcut=settings.BANDPASS_LOW_HZ,
            highcut=settings.BANDPASS_HIGH_HZ
        )
        
        # Segment and extract features
        window_size = settings.WINDOW_SIZE
        step_size = settings.STEP_SIZE
        
        n_samples = len(filtered_data)
        features_list = []
        
        for start_idx in range(0, n_samples - window_size + 1, step_size):
            end_idx = start_idx + window_size
            window = filtered_data[start_idx:end_idx]
            
            features_dict = self.feature_extractor.extract_features_vectorized(window, include_frequency=True)
            flat_features, feature_names = self.feature_extractor.flatten_features(features_dict)
            
            feat_row = dict(zip(feature_names, flat_features))
            
            # Carry over labels if present
            if 'label' in df.columns:
                feat_row['label'] = df['label'].iloc[start_idx]
            if 'subject' in df.columns:
                feat_row['subject'] = df['subject'].iloc[start_idx]
            if 'repetition' in df.columns:
                feat_row['repetition'] = df['repetition'].iloc[start_idx]
                
            features_list.append(feat_row)
            
        return pd.DataFrame(features_list)
        
    def save(self, filepath):
        """Save scaler and configuration"""
        obj = {
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'settings': {
                'SAMPLING_RATE_HZ': settings.SAMPLING_RATE_HZ,
                'WINDOW_SIZE': settings.WINDOW_SIZE,
                'NUM_CHANNELS': settings.NUM_CHANNELS
            }
        }
        joblib.dump(obj, filepath)
        
    @classmethod
    def load(cls, filepath):
        """Load scaler and configuration"""
        obj = joblib.load(filepath)
        instance = cls(is_training=False)
        instance.scaler = obj['scaler']
        instance.feature_names = obj['feature_names']
        
        # Validate settings match
        saved_settings = obj['settings']
        if saved_settings['SAMPLING_RATE_HZ'] != settings.SAMPLING_RATE_HZ:
            logger.warning(f"Loaded sampling rate ({saved_settings['SAMPLING_RATE_HZ']}) differs from config ({settings.SAMPLING_RATE_HZ})")
            
        return instance
