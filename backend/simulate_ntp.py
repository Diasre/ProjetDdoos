import threading
import time
import random
import requests

API_ENDPOINT = "http://127.0.0.1:9000/api/analyze"
TARGET_PORT = 123  # Port NTP (Network Time Protocol)
NUM_THREADS = 15

print("=========================================")
print("[!] SIMULATEUR D'AMPLIFICATION NTP (DrDoS)")
print("=========================================")
print("Ce script simule une attaque d'amplification vers le Port UDP 123 (NTP).")
print("L'injection se fait directement dans l'API du système DDoS en contournant Windows.")
print("-----------------------------------------")

# On demande l'IP à l'utilisateur
spoofed_input = input("Entrez l'adresse IP pirate (ex: 213.136.8.188 pour la Russie) \n[Par défaut: 213.136.8.188]: ")
SPOOFED_IP = spoofed_input.strip() if spoofed_input.strip() else "213.136.8.188"

print(f"\nCible de l'amplification NTP : Port UDP {TARGET_PORT}")
print("Génération des paquets sur-dimensionnés en cours...")
time.sleep(1)

def simulate_ntp_attack(thread_id):
    """
    Simule une extraction de flux réseaux massifs et l'envoie en HTTP POST vers l'API.
    """
    for i in range(15): # 15 requêtes massives par thread
        src_port = random.randint(1024, 65535)
        
        # Le secret de l'heuristique NTP : Port 123 + Protocol UDP (17) + Grande taille
        fake_packet = {
            "Source IP": SPOOFED_IP,
            "Destination IP": "127.0.0.1",
            "Source Port": src_port,
            "Destination Port": TARGET_PORT,
            "Protocol": 17, # UDP
            "Total Length of Fwd Packets": 6000, 
            "Fwd Packet Length Max": 1250, # <--- Très gros paquet
            "Flow Bytes/s": 420000, 
            "RST_Flag": 0,
            "SYN_Flag": 0, 
        }
        
        try:
            requests.post(API_ENDPOINT, json=[fake_packet])
            print(f"[Thread-{thread_id}] Paquet géant (NTP Amplifié) injecté ! Source: {SPOOFED_IP}")
        except:
            pass
        time.sleep(0.02) # Pilonnage rapide

print("\n🚀 Lancement de la simulation DrDoS (NTP) dans 3 secondes...")
time.sleep(3)

threads = []
for i in range(NUM_THREADS):
    t = threading.Thread(target=simulate_ntp_attack, args=(i,))
    threads.append(t)
    t.start()
    
for t in threads:
    t.join()

print("\n[V] Bombardement NTP terminé.")
print("Vérifiez le tableau de bord React ! L'alerte ROSE (Pink) DrDoS_NTP a du s'activer !")
