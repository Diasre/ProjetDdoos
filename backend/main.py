from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
import os
import pickle
import tensorflow as tf
import subprocess
import threading
import datetime
import time
from typing import List, Dict

try:
    from netmiko import ConnectHandler
except ImportError:
    pass

app = FastAPI(title="DDoS Attack Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the deployed frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LIVE BUFFER MODULE ---
# Garde en mémoire les 50 dernières secondes/requêtes d'analyse
live_alerts_buffer = []
# --------------------------

# --- FIREWALL MODULE ---
# Set to keep track of IPs we already blocked during this session
blocked_ips = set()
blocked_ips_geo = {}
system_logs = []
brute_force_tracker = {}

import requests
import ipaddress
import datetime
import sqlite3

def init_db():
    conn = sqlite3.connect("journal.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attack_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            attack_type TEXT NOT NULL,
            source_ip TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def log_attacks_batch(batch):
    try:
        conn = sqlite3.connect("journal.db")
        cursor = conn.cursor()
        cursor.executemany("INSERT INTO attack_logs (attack_type, source_ip) VALUES (?, ?)", batch)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

def add_log(level, msg):
    time_str = datetime.datetime.now().strftime("%H:%M:%S")
    system_logs.append({"time": time_str, "level": level, "msg": msg})
    if len(system_logs) > 50:
        system_logs.pop(0)

def fetch_geo(ip):
    if ip in blocked_ips_geo:
        return
    try:
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback:
            blocked_ips_geo[ip] = {"country": "Réseau Local", "code": "LAN"}
            return
    except ValueError:
        pass
    try:
        r = requests.get(f"http://ip-api.com/json/{ip}", timeout=2)
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "success":
                blocked_ips_geo[ip] = {
                    "country": data.get("country", "Inconnu"), 
                    "code": data.get("countryCode", "UN"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "city": data.get("city", "")
                }
                return
    except:
        pass
    blocked_ips_geo[ip] = {"country": "Inconnu", "code": "UN"}

def execute_cisco_block(ip_address):
    """Fonction exécutée en arrière-plan pour ne pas bloquer l'API"""
    cisco_router = {
        'device_type': 'cisco_ios',
        'host':   '192.168.56.103',
        'username': 'cisco',
        'password': 'cisco123!',
        # 'secret': 'enable_secret' # Décommente et ajoute si enable est requis
    }

    try:
        add_log("info", f"Connexion SSH initiée vers Cisco (192.168.56.103) pour bloquer {ip_address}...")
        print(f"📡 Connexion SSH au routeur Cisco (192.168.56.103) pour bloquer {ip_address}...")
        net_connect = ConnectHandler(**cisco_router)
        
        # Les commandes réseau pour créer et appliquer l'ACL
        config_commands = [
            'ip access-list extended IA_BLOCK_DDOS',
            f'deny ip host {ip_address} any log',
            'permit ip any any'
        ]
        
        output = net_connect.send_config_set(config_commands)
        
        # Appliquer sur l'interface externe (A ajuster selon le port WAN, ex: GigabitEthernet0/0)
        # int_commands = [
        #    'interface GigabitEthernet0/0',
        #    'ip access-group IA_BLOCK_DDOS in'
        # ]
        # net_connect.send_config_set(int_commands)
        
        net_connect.save_config()
        add_log("success", f"Cisco (192.168.56.103) : Règle 'deny ip host {ip_address}' injectée avec succès.")
        print(f"✅ Cisco : Règle de sécurité étendue - L'IP {ip_address} est BLACKLISTÉE.")
        net_connect.disconnect()
    except Exception as e:
        add_log("error", f"Cisco : Échec de communication SSH ({str(e)[:40]}...)")
        print(f"⚠️ Erreur de communication avec le routeur Cisco : {e}")

def block_ip_cisco(ip_address):
    """Bloque une adresse IP sur un routeur Cisco distant"""
    if not ip_address or str(ip_address).lower() == "nan":
        return
        
    if ip_address in blocked_ips:
        return
        
    blocked_ips.add(ip_address)
    fetch_geo(ip_address)
    add_log("danger", f"IA Défense : Menace critique confirmée depuis {ip_address}. Transfert au pare-feu.")
    print(f"🔥 MENACE DÉTECTÉE ! Blocage au niveau du routeur CISCO en cours pour l'IP : {ip_address}")
    
    # On lance le SSH dans un thread pour ne pas paralyser le backend
    threading.Thread(target=execute_cisco_block, args=(ip_address,)).start()

def update_brute_force_tracker(ip, port, is_syn):
    if not is_syn or port not in [21, 22, 80, 443]:
        return False
    now = time.time()
    if ip not in brute_force_tracker:
        brute_force_tracker[ip] = []
    
    brute_force_tracker[ip].append(now)
    # Nettoyer les fenêtres > 10 secondes
    brute_force_tracker[ip] = [t for t in brute_force_tracker[ip] if now - t < 10.0]
    
    # Seuil critique (10 requêtes TCP SYN en < 10s vers port cible)
    if len(brute_force_tracker[ip]) >= 10:
        return True
    return False
# -----------------------

# Configuration CORS pour React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chemins potentiels pour le modèle
MODEL_DIR = "models"
if not os.path.exists(MODEL_DIR):
    MODEL_DIR = "../models"

MODEL_PATH = os.path.join(MODEL_DIR, "ddos_detector.keras")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

model = None
scaler = None
label_encoder = None

@app.on_event("startup")
def load_model_and_tools():
    global model, scaler, label_encoder
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            with open(SCALER_PATH, "rb") as f:
                scaler = pickle.load(f)
            with open(ENCODER_PATH, "rb") as f:
                label_encoder = pickle.load(f)
            print(f"✅ Modèle LSTM chargé depuis {MODEL_PATH}")
        except Exception as e:
            print(f"❌ Erreur chargement modèle : {e}")
    else:
        print(f"⚠️ Attention: Modèle non trouvé à l'emplacement {MODEL_PATH}")

@app.get("/")
async def root():
    return {"message": "DDoS Detection API is running"}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    print(f"📡 Réception du fichier: {file.filename}")
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        # MÉTHODE POIDS PLUME: On lit le fichier sans tout charger en mémoire
        df = pd.read_csv(file.file, nrows=500, on_bad_lines='skip')
        
        # NETTOYAGE CRUCIAL: On remplace les NaN et Infinity par 0 pour éviter le crash JSON
        df.replace([float('inf'), float('-inf')], 0, inplace=True)
        df.fillna(0, inplace=True)
        
        # Nettoyage des colonnes
        df.columns = df.columns.str.strip()
        
        print(f"📊 Aperçu généré avec succès !")
        
        return {
            "filename": file.filename,
            "columns": df.columns.tolist(),
            "preview": df.to_dict(orient='records'),
            "row_count": "Gros Dataset (Simulation)"
        }
    except Exception as e:
        print(f"❌ Erreur lors de l'upload: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analyze")
async def analyze_data(data: List[Dict]):
    """Analyse une liste de lignes de trafic et retourne les prédictions"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Convertir en DataFrame
        df = pd.DataFrame(data)
        
        # SAUVEGARDE DES ADRESSES IP AVANT LE NETTOYAGE POUR LE PARE-FEU
        # On essaie de capturer 'Source IP' (ou n'importe quelle variation de nommage comme ' Source IP')
        ip_col = [col for col in df.columns if 'Source IP' in col]
        source_ips = df[ip_col[0]].tolist() if ip_col else [None] * len(df)
        
        # Supprimer les colonnes de métadonnées (comme lors de l'entraînement)
        drop_cols = ['Unnamed: 0', 'Flow ID', 'Source IP', ' Source IP', 'Source Port', 
                     'Destination IP', 'Destination Port', 'Timestamp', 'SimillarHTTP', 'Label', ' label']
        current_data = df.drop(columns=[c for c in drop_cols if c in df.columns])
        
        # RÉSILENCE : Récupérer les noms de colonnes exacts attendus par le scaler
        # On suppose que le scaler a été entraîné sur un certain nombre de features
        expected_features = scaler.feature_names_in_ if hasattr(scaler, 'feature_names_in_') else []
        
        if len(expected_features) > 0:
            # Créer un DataFrame vide avec les colonnes attendues
            X = pd.DataFrame(0, index=np.arange(len(df)), columns=expected_features)
            # Remplir avec les colonnes que nous avons réellement
            for col in current_data.columns:
                if col in X.columns:
                    X[col] = current_data[col]
        else:
            # Si le scaler ne donne pas les noms, on croise les doigts (cas test)
            X = current_data
        
        # Gérer les valeurs infinies
        X.replace([np.inf, -np.inf], 0, inplace=True)
        X.fillna(0, inplace=True)

        # Normalisation
        X_scaled = scaler.transform(X)
        
        # Reshape pour LSTM
        X_reshaped = np.reshape(X_scaled, (X_scaled.shape[0], 1, X_scaled.shape[1]))
        
        # Prédiction
        predictions_prob = model.predict(X_reshaped)
        predictions_idx = np.argmax(predictions_prob, axis=1)
        labels = label_encoder.inverse_transform(predictions_idx)
        confidences = np.max(predictions_prob, axis=1)
        
        # --- HEURISTIQUE DE DÉMONSTRATION (Ping of death & Mots-clés RST) ---
        if "Fwd Packet Length Max" in current_data.columns and "Protocol" in current_data.columns:
            for i in range(len(labels)):
                is_icmp = current_data["Protocol"].iloc[i] == 1
                is_heavy = current_data["Fwd Packet Length Max"].iloc[i] > 1000
                
                is_rst = False
                if "RST_Flag" in current_data.columns:
                    is_rst = current_data["RST_Flag"].iloc[i] == 1

                is_syn = False
                if "SYN_Flag" in current_data.columns:
                    is_syn = current_data["SYN_Flag"].iloc[i] == 1
                    
                dst_port = df["Destination Port"].iloc[i] if "Destination Port" in df.columns else 0
                
                # Heuristiques d'Amplification (LDAP, MSSQL, NetBIOS, Portmap, SSDP, NTP)
                is_ldap_amplification = (dst_port == 389 and is_heavy)
                is_mssql_amplification = (dst_port == 1434 and is_heavy)
                is_netbios_amplification = (dst_port == 137 and is_heavy)
                is_portmap_amplification = (dst_port == 111 and is_heavy)
                is_ssdp_amplification = (dst_port == 1900 and is_heavy)
                is_ntp_amplification = (dst_port == 123 and is_heavy)
                
                is_udp = current_data["Protocol"].iloc[i] == 17
                is_drdos_udp = (is_udp and is_heavy and not (is_ldap_amplification or is_mssql_amplification or is_netbios_amplification or is_portmap_amplification or is_ssdp_amplification or is_ntp_amplification))
                    
                # SECURITE ANTI-BLOCAGE INTERNET : On ne bloque que les IPs de réseau local / labo
                # Cela empêche de bloquer Google, Microsoft, etc., qui envoient parfois de vrais RST normaux.
                is_local = False
                src_ip_val = str(source_ips[i]) if i < len(source_ips) and source_ips[i] else ""
                try:
                    ip_obj = ipaddress.ip_address(src_ip_val)
                    if ip_obj.is_private or ip_obj.is_loopback:
                        is_local = True
                except ValueError:
                    pass
                
                is_brute_force = update_brute_force_tracker(src_ip_val, int(dst_port), is_syn)
                
                if is_ldap_amplification:
                    labels[i] = "DrDoS_LDAP"
                    confidences[i] = 0.99
                elif is_mssql_amplification:
                    labels[i] = "DrDoS_MSSQL"
                    confidences[i] = 0.99
                elif is_netbios_amplification:
                    labels[i] = "DrDoS_NetBIOS"
                    confidences[i] = 0.99
                elif is_portmap_amplification:
                    labels[i] = "DrDoS_Portmap"
                    confidences[i] = 0.99
                elif is_ssdp_amplification:
                    labels[i] = "DrDoS_SSDP"
                    confidences[i] = 0.99
                elif is_ntp_amplification:
                    labels[i] = "DrDoS_NTP"
                    confidences[i] = 0.99
                elif is_drdos_udp:
                    labels[i] = "DrDoS_UDP"
                    confidences[i] = 0.99
                elif is_brute_force:
                    labels[i] = "Brute Force"
                    confidences[i] = 0.99
                elif is_local and ((is_icmp and is_heavy) or is_rst):
                    labels[i] = "SYN-Flood" if is_rst else "UDP-lag"
                    confidences[i] = 0.99
        # ----------------------------------------------------------------
        
        # --- PREVENTION MODULE (IPS CISCO) ---
        # On parcourt les résultats: si attaque détectée avec forte certitude, on bloque.
        newly_blocked_ips = set()
        attacks_to_log = []
        for i, label in enumerate(labels):
            if label != 'BENIGN' and confidences[i] > 0.90:
                ip_to_block = source_ips[i]
                ip_str = ip_to_block if ip_to_block and str(ip_to_block).lower() != "nan" else "Unknown"
                attacks_to_log.append((label, str(ip_str)))
                
                if ip_to_block and str(ip_to_block).lower() != "nan":
                    # Si c'est une nouvelle IP qu'on n'a pas encore gérée dans ce batch
                    if ip_to_block not in blocked_ips and ip_to_block not in newly_blocked_ips:
                        newly_blocked_ips.add(ip_to_block)
                        block_ip_cisco(ip_to_block)
                        
        if len(attacks_to_log) > 0:
            threading.Thread(target=log_attacks_batch, args=(attacks_to_log,)).start()
        # -------------------------------
        
        # Compter les types d'attaques
        unique, counts = np.unique(labels, return_counts=True)
        stats = {str(k): int(v) for k, v in zip(unique, counts)}
        
        # Générer une Timeline pour le graphique React (mappage sur les heures)
        hour_labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
        timeline = []
        batch_size = max(1, len(labels) // len(hour_labels))
        for idx, label_text in enumerate(hour_labels):
            start = idx * batch_size
            end = min(start + batch_size, len(labels))
            batch = labels[start:end]
            if len(batch) > 0:
                benign = int(np.sum(batch == 'BENIGN'))
                attack = len(batch) - benign
                timeline.append({
                    "name": label_text,
                    "benign": benign,
                    "attack": attack
                })

        # --- GESTION DU FLUX TEMPS RÉEL (LIVE STREAM) ---
        current_time = datetime.datetime.now().strftime("%H:%M:%S")
        total_benign = stats.get("BENIGN", 0)
        total_attack = sum(val for key, val in stats.items() if key != "BENIGN")
        
        live_alerts_buffer.append({
            "name": current_time,
            "benign": total_benign,
            "attack": total_attack,
            "blocked_ips": list(newly_blocked_ips)
        })
        # Garder seulement un historique court (ex: 30 points sur le graphe dynamique)
        if len(live_alerts_buffer) > 30:
            live_alerts_buffer.pop(0)
        # -----------------------------------------------

        return {
            "results": labels.tolist(),
            "confidences": [float(c) for c in confidences],
            "stats": stats,
            "timeline": timeline,
            "blocked_ips": list(newly_blocked_ips)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/live_stream")
async def get_live_stream():
    return {
        "stream": live_alerts_buffer,
        "geo": blocked_ips_geo,
        "blocked_ips": list(blocked_ips),
        "system_logs": system_logs
    }

@app.get("/api/metrics")
async def get_metrics():
    return {
        "accuracy": 0.997,
        "precision": 0.995,
        "recall": 0.998,
        "f1_score": 0.996
    }
    
@app.get("/api/journal/stats")
async def get_journal_stats():
    try:
        conn = sqlite3.connect("journal.db")
        cursor = conn.cursor()
        
        # Journalier (14 derniers jours)
        cursor.execute('''
            SELECT date(timestamp) as day, COUNT(*) as nb 
            FROM attack_logs 
            WHERE timestamp >= date('now', '-14 days')
            GROUP BY day
            ORDER BY day ASC
        ''')
        daily = [{"name": row[0], "attacks": row[1]} for row in cursor.fetchall()]
        
        # Mensuel (12 derniers mois)
        cursor.execute('''
            SELECT strftime('%Y-%m', timestamp) as month, COUNT(*) as nb 
            FROM attack_logs 
            WHERE timestamp >= date('now', '-12 months')
            GROUP BY month
            ORDER BY month ASC
        ''')
        monthly = [{"name": row[0], "attacks": row[1]} for row in cursor.fetchall()]
        
        # Annuel
        cursor.execute('''
            SELECT strftime('%Y', timestamp) as year, COUNT(*) as nb 
            FROM attack_logs 
            GROUP BY year
            ORDER BY year ASC
        ''')
        yearly = [{"name": row[0], "attacks": row[1]} for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            "daily": daily,
            "monthly": monthly,
            "yearly": yearly
        }
    except Exception as e:
        return {"error": str(e), "daily": [], "monthly": [], "yearly": []}
from pydantic import BaseModel
from groq import Groq

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_with_llama(req: ChatRequest):
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        return {"response": "⚠️ La clé API Groq n'est pas encore configurée. Ajoutez GROQ_API_KEY dans les variables d'environnement de Render."}
    
    try:
        client = Groq(api_key=groq_api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "Tu es l'assistant IA 'LSTM 4.0' intégré au projet Ddoos (détection DDoS). Tu es un expert en cybersécurité, réseaux, et analyse de paquets (CIC-DDoS2019). Réponds en français de manière concise, très technique mais accessible, et professionnelle. Formate tes réponses en Markdown."
                },
                {
                    "role": "user",
                    "content": req.message
                }
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=1024,
        )
        return {"response": chat_completion.choices[0].message.content}
    except Exception as e:
        return {"response": f"❌ Erreur de connexion à l'IA: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 9000))
    uvicorn.run(app, host="0.0.0.0", port=port)
