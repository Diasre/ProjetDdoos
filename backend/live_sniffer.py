import os
import time
import requests
import threading
from scapy.all import sniff, IP, TCP, UDP

# Configuration
# Mettez ici l'URL de votre backend déployé, ou définissez la variable d'environnement DDOS_API_URL
API_ENDPOINT = os.environ.get("DDOS_API_URL", "http://127.0.0.1:9000") + "/api/analyze"
BATCH_SIZE = 5   # Rabaissé à 5 pour une réaction quasi-instantanée (5 secondes avec un Ping lent)
ENABLE_CONSOLE = True

packet_buffer = []
buffer_lock = threading.Lock()

def process_packet(packet):
    """
    Intercepte un paquet réseau et le transforme en format lisible par notre API.
    Avertissement : Une vraie extraction type CICFlowMeter est très lourde.
    Ici on simule l'extraction des 'Features' basiques.
    """
    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        protocol = packet[IP].proto
        length = len(packet)
        
        src_port = 0
        dst_port = 0
        flags = ""
        
        if TCP in packet:
            src_port = packet[TCP].sport
            dst_port = packet[TCP].dport
            flags = str(packet[TCP].flags)
        elif UDP in packet:
            src_port = packet[UDP].sport
            dst_port = packet[UDP].dport
            
        # Simuler un format proche du Dataset CIC-DDoS2019
        row = {
            "Source IP": src_ip,
            "Destination IP": dst_ip,
            "Source Port": src_port,
            "Destination Port": dst_port,
            "Protocol": protocol,
            "Total Length of Fwd Packets": length, # Approximation
            "Fwd Packet Length Max": length,
            "Flow Bytes/s": length * 10, # Fake
            "RST_Flag": 1 if 'R' in flags else 0,
            "SYN_Flag": 1 if 'S' in flags else 0,
        }
        
        with buffer_lock:
            packet_buffer.append(row)
            
        if len(packet_buffer) >= BATCH_SIZE:
            send_batch()

def send_batch():
    global packet_buffer
    with buffer_lock:
        if not packet_buffer:
            return
        batch_to_send = packet_buffer.copy()
        packet_buffer.clear()
        
    try:
        response = requests.post(API_ENDPOINT, json=batch_to_send)
        if ENABLE_CONSOLE:
            res_data = response.json()
            if res_data.get('blocked_ips'):
                print(f"🚨 ALERTES TEMPS REEL ! IPs bloquées par le backend : {res_data['blocked_ips']}")
            else:
                print(f"✅ Batch de {len(batch_to_send)} paquets scanné : BENIGN")
    except Exception as e:
        if ENABLE_CONSOLE:
            print(f"⚠️ Erreur de communication avec l'API Backend: {e}")

from scapy.arch.windows import get_windows_if_list

print("=========================================")
print("🛡️ DDoS GUARD - CAPTEUR TEMPS RÉEL (SCAPY)")
print("=========================================")
print(f"Envoi par lot de {BATCH_SIZE} paquets...")
print("Note: Ce script doit être lancé en Administrateur.")
print("\n📡 Démarrage de l'écoute multifaisceaux sur TOUTES les cartes réseaux :")

def sniff_on_interface(iface_name):
    try:
        sniff(iface=iface_name, prn=process_packet, store=False)
    except Exception:
        pass

# Récupérer les noms lisibles des interfaces sous Windows
interfaces = [i["name"] for i in get_windows_if_list() if "name" in i]
# On s'assure d'écouter aussi sur l'interface par défaut et VirtualBox et Loopback
interfaces.append(None) 
interfaces.append("VirtualBox Host-Only Ethernet Adapter")
interfaces.append("Software Loopback Interface 1")
interfaces.append("Loopback Pseudo-Interface 1")
# Nettoyer les doublons
interfaces = list(set(interfaces))

for iface in interfaces:
    print(f" - Déploiement sur : {iface if iface else 'Interface Par Défaut'}")
    t = threading.Thread(target=sniff_on_interface, args=(iface,), daemon=True)
    t.start()

print("\n✅ Capteur actif. En attente d'intrusion...")

# Garder le thread principal en vie
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Capteur arrêté.")
