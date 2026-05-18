import threading
import time
import random
import requests

API_ENDPOINT = "http://127.0.0.1:9000/api/analyze"
TARGET_PORT = 389  # Port LDAP par défaut (CLDAP)
NUM_THREADS = 15

print("=========================================")
print("[!] SIMULATEUR D'AMPLIFICATION LDAP (DrDoS)")
print("=========================================")
print("Ce script simule une attaque d'amplification massive vers le Port UDP 389.")
print("L'injection se fait directement dans l'API du système DDoS en contournant Windows.")
print("-----------------------------------------")

# On demande l'IP à l'utilisateur (on simule que ça vient de Chine par exemple)
spoofed_input = input("Entrez l'adresse IP pirate (ex: 114.114.114.114 pour la Chine) \n[Par défaut: 114.114.114.114]: ")
SPOOFED_IP = spoofed_input.strip() if spoofed_input.strip() else "114.114.114.114"

print(f"\nCible de l'amplification LDAP : Port UDP {TARGET_PORT}")
print("Génération des paquets sur-dimensionnés en cours...")
time.sleep(1)

def simulate_ldap_attack(thread_id):
    """
    Simule une extraction de flux réseaux massifs et l'envoie en HTTP POST vers l'API.
    """
    for i in range(15): # 15 requêtes massives par thread
        src_port = random.randint(1024, 65535)
        
        # Le secret de l'heuristique LDAP : Port 389 + Taille > 1000 (is_heavy)
        fake_packet = {
            "Source IP": SPOOFED_IP,
            "Destination IP": "127.0.0.1",
            "Source Port": src_port,
            "Destination Port": TARGET_PORT,
            "Protocol": 17, # UDP
            "Total Length of Fwd Packets": 5000, 
            "Fwd Packet Length Max": 1200, # <--- Plus grand que 1000 pour déclencher 'is_heavy'
            "Flow Bytes/s": 400000, 
            "RST_Flag": 0,
            "SYN_Flag": 0, 
        }
        
        try:
            requests.post(API_ENDPOINT, json=[fake_packet])
            print(f"[Thread-{thread_id}] Paquet géant (LDAP Amplifié) injecté ! Source: {SPOOFED_IP}")
        except:
            pass
        time.sleep(0.02) # Pilonnage ultra rapide

print("\n🚀 Lancement de la simulation DrDoS (LDAP) dans 3 secondes...")
time.sleep(3)

threads = []
for i in range(NUM_THREADS):
    t = threading.Thread(target=simulate_ldap_attack, args=(i,))
    threads.append(t)
    t.start()
    
for t in threads:
    t.join()

print("\n[V] Bombardement LDAP terminé.")
print("Vérifiez le tableau de bord React ! L'alerte ORANGE DrDoS_LDAP devrait saturer les statistiques !")
