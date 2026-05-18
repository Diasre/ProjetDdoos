import os
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import tensorflow as tf

# ==========================================
# CONFIGURATION
# ==========================================
DATASET_PATH = "C:\\chemin\\vers\\votre_dataset.csv"  # Modifiez ce chemin !
N_SPLITS = 5
EPOCHS = 5
BATCH_SIZE = 256

print("=========================================")
print("🧠 DDOS GUARD - LSTM CROSS VALIDATION (K-FOLD)")
print("=========================================")

def build_lstm_model(input_shape, num_classes):
    """
    Reconstruit l'architecture LSTM pour chaque sous-entraînement (Fold).
    L'exigence d'un K-Fold est d'avoir un modèle "vierge" à chaque boucle.
    """
    model = tf.keras.Sequential([
        # Couche d'entrée formatée pour LSTM : (timesteps, features)
        tf.keras.layers.InputLayer(input_shape=input_shape),
        tf.keras.layers.LSTM(64, return_sequences=False),
        tf.keras.layers.Dropout(0.2), # Prévention de l'overfitting
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(num_classes, activation='softmax')
    ])
    model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
    return model

def load_and_preprocess_data(filepath):
    """Charge et nettoie les données selon les règles du pare-feu"""
    print(f"📡 Chargement du dataset : {filepath}")
    if not os.path.exists(filepath):
        print(f"❌ FICHIER INTROUVABLE. Veuillez éditer DATASET_PATH à la ligne 12.")
        return None, None
        
    df = pd.read_csv(filepath)
    print(f"📊 Dataset chargé : {df.shape[0]} lignes.")
    
    # Remplacer les valeurs infinies et nulles
    df.replace([np.inf, -np.inf], 0, inplace=True)
    df.fillna(0, inplace=True)
    
    # Isoler la colonne "Label" (la cible)
    label_cols = [c for c in df.columns if c.strip().lower() == 'label']
    if not label_cols:
        print("❌ Aucune colonne 'Label' trouvée dans le dataset !")
        return None, None
    label_col = label_cols[0]
    
    # Séparation : Variables réseau (X) et Cible (y)
    y_raw = df[label_col].values
    
    # On retire les méta-données et les IP pour l'entraînement (comme dans main.py)
    drop_cols = ['Unnamed: 0', 'Flow ID', 'Source IP', ' Source IP', 'Source Port', 
                 'Destination IP', 'Destination Port', 'Timestamp', 'SimillarHTTP', label_col]
    X_raw = df.drop(columns=[c for c in drop_cols if c in df.columns])
    
    # 1. Encodage des Labels
    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)
    
    # 2. Normalisation (Scaler)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)
    
    # 3. Reshape pour LSTM => (Lignes, 1, Colonnes/Features)
    X_lstm = np.reshape(X, (X.shape[0], 1, X.shape[1]))
    
    print(f"✅ Pré-traitement terminé. Shape LSTM : {X_lstm.shape} | Classes : {len(encoder.classes_)}")
    return X_lstm, y, encoder

def run_cross_validation():
    X, y, encoder = load_and_preprocess_data(DATASET_PATH)
    if X is None:
        return
        
    num_classes = len(encoder.classes_)
    input_shape = (X.shape[1], X.shape[2])
    
    # Initialisation du découpage Stratifié
    kf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=42)
    
    fold = 1
    accuracies = []
    
    print("\n🚀 DÉMARRAGE DE LA VALIDATION CROISÉE")
    print(f"K-Folds = {N_SPLITS} | Epoques = {EPOCHS} | Batch = {BATCH_SIZE}\n")
    
    start_time = time.time()
    
    for train_index, test_index in kf.split(X, y):
        print(f"--- 🔄 Début Pli (Fold) {fold} ---")
        
        # Découpage dynamique des données
        X_train, X_test = X[train_index], X[test_index]
        y_train, y_test = y[train_index], y[test_index]
        
        # On construit un NOUVEAU modèle pur pour ne pas fuiter l'apprentissage
        model = build_lstm_model(input_shape, num_classes)
        
        # Entraînement 
        model.fit(
            X_train, y_train, 
            epochs=EPOCHS, 
            batch_size=BATCH_SIZE, 
            verbose=1 # Mettre à 0 pour rendre l'écran plus propre
        )
        
        # Évaluation
        y_pred_prob = model.predict(X_test, verbose=0)
        y_pred = np.argmax(y_pred_prob, axis=1)
        
        acc = accuracy_score(y_test, y_pred)
        accuracies.append(acc)
        
        print(f"✅ Pli {fold} terminé -> Précision : {acc * 100:.2f}%")
        print(classification_report(y_test, y_pred, target_names=[str(c) for c in encoder.classes_]))
        fold += 1

    # Rapport Final
    print("=========================================")
    print("📈 RÉSULTATS GLOBAUX DU CROSS VALIDATION")
    print("=========================================")
    print(f"Précisions par Pli : {[f'{a*100:.2f}%' for a in accuracies]}")
    print(f"Précision Moyenne Générale : {np.mean(accuracies)*100:.2f}% (+/- {np.std(accuracies)*100:.2f}%)")
    
    temps = time.time() - start_time
    print(f"⏱️ Temps total du test : {temps/60:.1f} minutes")

if __name__ == "__main__":
    run_cross_validation()
