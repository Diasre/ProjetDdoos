import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import pickle
import os

# 1. Charger les données (On prend un échantillon car le fichier est gros)
data_path = "data/cic_ddos/01-12/UDPLag.csv"
if not os.path.exists(data_path):
    print(f"Erreur: Le fichier {data_path} n'existe pas.")
    exit()

print("Chargement des données...")
# On charge 150 000 lignes pour avoir un bon échantillon
df = pd.read_csv(data_path, nrows=150000)

# Nettoyage des noms de colonnes (supprimer les espaces au début/fin)
df.columns = df.columns.str.strip()

# 2. Préparation des données (Preprocessing)
# Supprimer les colonnes inutiles pour l'apprentissage
drop_cols = ['Unnamed: 0', 'Flow ID', 'Source IP', 'Source Port', 
             'Destination IP', 'Destination Port', 'Timestamp', 'SimillarHTTP']
df = df.drop(columns=[c for c in drop_cols if c in df.columns])

# Gérer les valeurs infinies et manquantes
df.replace([np.inf, -np.inf], np.nan, inplace=True)
df.dropna(inplace=True)

# Séparer X et y
X = df.drop('Label', axis=1)
y = df['Label']

# Encoder les labels (BENIGN, UDP-lag, etc.)
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)
num_classes = len(label_encoder.classes_)
print(f"Classes détectées : {label_encoder.classes_}")

# Normalisation
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Reshape pour LSTM : [samples, timesteps, features]
X_reshaped = np.reshape(X_scaled, (X_scaled.shape[0], 1, X_scaled.shape[1]))

# Diviser en train / test
X_train, X_test, y_train, y_test = train_test_split(X_reshaped, y_encoded, test_size=0.2, random_state=42)

# 3. Création du modèle LSTM
print("Construction du modèle LSTM haute performance...")
model = Sequential([
    LSTM(128, input_shape=(1, X.shape[1]), return_sequences=True),
    Dropout(0.3),
    LSTM(64, return_sequences=False),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dense(num_classes, activation='softmax')
])

model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# 4. Entraînement avec Early Stopping (prévention d'Overfitting)
print("Début de l'entraînement sur les données réelles avec Early Stopping...")

# L'Early Stopping arrête l'entraînement si la perte (loss) de validation ne s'améliore
# plus après 3 époques d'affilée. Il restaure ensuite les meilleurs poids trouvés.
early_stopping = EarlyStopping(
    monitor='val_loss',       # On surveille l'erreur sur les données de test/validation
    patience=3,               # Nombre d'époques à attendre avant d'arrêter
    restore_best_weights=True,# Garder le meilleur modèle (et non le dernier)
    verbose=1
)

# On peut augmenter 'epochs' (ex: 30) car EarlyStopping l'arrêtera au moment optimal
model.fit(
    X_train, y_train, 
    epochs=30, 
    batch_size=64, 
    validation_data=(X_test, y_test),
    callbacks=[early_stopping]
)

# 5. Sauvegarde
os.makedirs("models", exist_ok=True)
# Suppression de l'extension .h5 obsolète pour le format natif Keras
model.save("models/ddos_detector.keras")
with open("models/scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)
with open("models/label_encoder.pkl", "wb") as f:
    pickle.dump(label_encoder, f)

print("\n--- ✅ Modèle et accessoires sauvegardés dans /models/ ---")
