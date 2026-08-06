import os
import glob
import pandas as pd
import numpy as np
import logging
from pathlib import Path
from datetime import datetime
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import GroupKFold
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.preprocessing import LabelEncoder

# Fix python path if running directly
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from ml.config import settings
from ml.preprocessing.pipeline import ASVPreprocessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def load_data(data_dir):
    """Load all raw CSV files from directory"""
    csv_files = glob.glob(os.path.join(data_dir, "*.csv"))
    if not csv_files:
        logger.error(f"No CSV files found in {data_dir}")
        return []
        
    data_list = []
    for f in csv_files:
        try:
            df = pd.read_csv(f)
            data_list.append(df)
        except Exception as e:
            logger.error(f"Error loading {f}: {e}")
            
    logger.info(f"Loaded {len(data_list)} recordings.")
    return data_list

def train_and_evaluate():
    data_dir = settings.RAW_DATA_DIR
    logger.info(f"Scanning for data in {data_dir}")
    
    data_list = load_data(data_dir)
    if not data_list:
        logger.warning("Cannot train without data.")
        return
        
    # Preprocess
    preprocessor = ASVPreprocessor(is_training=True)
    features_df = preprocessor.fit(data_list)
    
    # Encode labels
    le = LabelEncoder()
    y = le.fit_transform(features_df['label'])
    
    # Feature matrix
    X = features_df[preprocessor.feature_names].values
    
    # We must prevent data leakage. Group by 'subject' + 'repetition' combination.
    # Windows from the same repetition stay together.
    groups = features_df['subject'].astype(str) + "_" + features_df['repetition'].astype(str)
    
    # Models
    models = {
        'RandomForest': RandomForestClassifier(n_estimators=100, max_depth=15, random_state=settings.RANDOM_STATE),
        'SVM': SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=settings.RANDOM_STATE)
    }
    
    best_model_name = None
    best_model = None
    best_score = -1
    
    # Group K-Fold for robust evaluation
    gkf = GroupKFold(n_splits=min(5, len(groups.unique())))
    
    logger.info(f"Training on {len(X)} samples with {len(preprocessor.feature_names)} features.")
    
    for name, model in models.items():
        logger.info(f"Evaluating {name}...")
        
        fold_scores = []
        # We need a trained instance on the full dataset for saving
        for train_idx, test_idx in gkf.split(X, y, groups):
            X_train, y_train = X[train_idx], y[train_idx]
            X_test, y_test = X[test_idx], y[test_idx]
            
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)
            fold_scores.append(acc)
            
        avg_score = np.mean(fold_scores)
        logger.info(f"{name} Average CV Accuracy: {avg_score:.4f}")
        
        # Train on full dataset
        model.fit(X, y)
        
        if avg_score > best_score:
            best_score = avg_score
            best_model_name = name
            best_model = model
            
    logger.info(f"Best Model: {best_model_name} (Acc: {best_score:.4f})")
    
    # Save artifacts
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = settings.MODELS_DIR / f"asv_model_{timestamp}"
    os.makedirs(model_dir, exist_ok=True)
    
    # Save best model
    joblib.dump(best_model, model_dir / 'classifier.pkl')
    # Save label encoder
    joblib.dump(le, model_dir / 'label_encoder.pkl')
    # Save preprocessor
    preprocessor.save(model_dir / 'preprocessor.pkl')
    
    # Save metrics
    metrics = {
        'best_model': best_model_name,
        'cv_accuracy': best_score,
        'features_count': len(preprocessor.feature_names),
        'classes': le.classes_.tolist()
    }
    pd.DataFrame([metrics]).to_csv(model_dir / 'metrics.csv', index=False)
    
    # Also update a 'latest' symlink or directory
    latest_dir = settings.MODELS_DIR / "latest"
    if os.path.exists(latest_dir) or os.path.islink(latest_dir):
        if os.name == 'nt':
            import shutil
            if os.path.isdir(latest_dir):
                shutil.rmtree(latest_dir)
        else:
            if os.path.islink(latest_dir):
                os.unlink(latest_dir)
                
    if os.name == 'nt':
        import shutil
        shutil.copytree(model_dir, latest_dir)
    else:
        os.symlink(model_dir, latest_dir)
        
    logger.info(f"Model saved to {model_dir} and aliased to {latest_dir}")

if __name__ == "__main__":
    train_and_evaluate()
