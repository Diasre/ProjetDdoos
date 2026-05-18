import threading
import time
import random
import requests

API_ENDPOINT = "http://127.0.0.1:9000/api/analyze"
TARGET_PORT = 1434  # Port MS-SQL Resolution Service
NUM_THREADS = 15

print("=========================================")
print("[!] SIMULATEUR D'AMPLIFICATION MSSQL (DrDoS)")
print("=========================================")
print("Ce script simule une attaque d'amplification vers le Port UDP 1434 (MS-SQL).")
print("L'injection se fait directement dans l'API du système DDoS en contournant Windows.")
print("-----------------------------------------")

# On demande l'IP à l'utilisateur
spoofed_input = input("Entrez l'adresse IP pirate (ex: 82.165.2.143 pour l'Allemagne) \n[Par défaut: 82.165.2.143]: ")
SPOOFED_IP = spoofed_input.strip() if spoofed_input.strip() else "82.165.2.143"

print(f"\nCible de l'amplification MSSQL : Port UDP {TARGET_PORT}")
print("Génération des paquets sur-dimensionnés en cours...")
time.sleep(1)

def simulate_mssql_attack(thread_id):
    """
    Simule une extraction de flux réseaux massifs et l'envoie en HTTP POST vers l'API.
    """
    for i in range(15): # 15 requêtes massives par thread
        src_port = random.randint(1024, 65535)
        
        # Le secret de l'heuristique MSSQL : Port 1434 + Protocol UDP (17) + Grande taille
        fake_packet = {
            "Source IP": SPOOFED_IP,
            "Destination IP": "127.0.0.1",
            "Source Port": src_port,
            "Destination Port": TARGET_PORT,
            "Protocol": 17, # UDP
            "Total Length of Fwd Packets": 8000, 
            "Fwd Packet Length Max": 1400, # <--- Très gros paquet (supérieur à 1000)
            "Flow Bytes/s": 500000, 
            "RST_Flag": 0,
            "SYN_Flag": 0, 
        }
        
        try:
            requests.post(API_ENDPOINT, json=[fake_packet])
            print(f"[Thread-{thread_id}] Paquet géant (MSSQL Amplifié) injecté ! Source: {SPOOFED_IP}")
        except:
            pass
        time.sleep(0.02) # Pilonnage rapide

print("\n🚀 Lancement de la simulation DrDoS (MSSQL) dans 3 secondes...")
time.sleep(3)

threads = []
for i in range(NUM_THREADS):
    t = threading.Thread(target=simulate_mssql_attack, args=(i,))
    threads.append(t)
    t.start()
    
for t in threads:
    t.join()

print("\n[V] Bombardement MSSQL terminé.")
print("Vérifiez le tableau de bord React ! L'alerte BLEUE DrDoS_MSSQL a du s'activer !")
