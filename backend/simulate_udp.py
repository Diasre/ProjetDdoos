import threading
import time
import random
import requests

API_ENDPOINT = "http://127.0.0.1:9000/api/analyze"
NUM_THREADS = 15

print("=========================================")
print("[!] SIMULATEUR D'INONDATION UDP (DrDoS_UDP)")
print("=========================================")
print("Ce script simule une attaque de type UDP Flood massive sur des ports aléatoires.")
print("L'injection se fait directement dans l'API du système DDoS en contournant Windows.")
print("-----------------------------------------")

# On demande l'IP à l'utilisateur
spoofed_input = input("Entrez l'adresse IP pirate (ex: 8.8.4.4) \n[Par défaut: 8.8.4.4]: ")
SPOOFED_IP = spoofed_input.strip() if spoofed_input.strip() else "8.8.4.4"

print(f"\nCible de l'inondation : Ports UDP Aléatoires")
print("Génération des paquets sur-dimensionnés en cours...")
time.sleep(1)

def simulate_udp_attack(thread_id):
    """
    Simule une extraction de flux réseaux massifs et l'envoie en HTTP POST vers l'API.
    """
    for i in range(15): # 15 requêtes massives par thread
        src_port = random.randint(1024, 65535)
        # On choisit un port de destination aléatoire mais on évite les ports que l'on a déjà classés spécifiquement.
        dst_port = random.choice([p for p in range(1024, 65535) if p not in (389, 1434, 137, 111, 1900, 123)])
        
        # Le secret de l'heuristique UDP Générique : Protocol UDP (17) + Grande taille sans port spécifique
        fake_packet = {
            "Source IP": SPOOFED_IP,
            "Destination IP": "127.0.0.1",
            "Source Port": src_port,
            "Destination Port": dst_port,
            "Protocol": 17, # UDP
            "Total Length of Fwd Packets": 8000, 
            "Fwd Packet Length Max": 1400, # <--- Très gros paquet
            "Flow Bytes/s": 480000, 
            "RST_Flag": 0,
            "SYN_Flag": 0, 
        }
        
        try:
            requests.post(API_ENDPOINT, json=[fake_packet])
            print(f"[Thread-{thread_id}] Paquet UDP (Inondation) injecté ! Source: {SPOOFED_IP} -> Port: {dst_port}")
        except:
            pass
        time.sleep(0.02) # Pilonnage rapide

print("\n🚀 Lancement de la simulation UDP Flood dans 3 secondes...")
time.sleep(3)

threads = []
for i in range(NUM_THREADS):
    t = threading.Thread(target=simulate_udp_attack, args=(i,))
    threads.append(t)
    t.start()
    
for t in threads:
    t.join()

print("\n[V] Bombardement UDP terminé.")
print("Vérifiez le tableau de bord React ! L'alerte GRIS (Slate) DrDoS_UDP a du s'activer !")
