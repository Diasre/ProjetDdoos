import threading
import time
import random
import requests

API_ENDPOINT = "http://127.0.0.1:9000/api/analyze"
TARGET_PORT = 22  
NUM_THREADS = 15

print("=========================================")
print("[!] SIMULATEUR DE FORCE BRUTE (INJECTION API)")
print("=========================================")
print("Sous Windows, falsifier une adresse IP externe sur l'interface Loopback")
print("est bloqué par le noyau du système (mesure de sécurité).")
print("Nous allons donc injecter le trafic falsifié directement dans l'API du système DDoS !")
print("-----------------------------------------")

# On demande l'IP à l'utilisateur
spoofed_input = input("Entrez l'adresse IP pirate à simuler (ex: 95.173.136.70 pour la Russie) \n[Par défaut: 185.150.100.23]: ")
SPOOFED_IP = spoofed_input.strip() if spoofed_input.strip() else "185.150.100.23"

print(f"\nCible du Bruteforce : Port {TARGET_PORT}")
print("Préparation de l'assaut en cours...")
time.sleep(1)

def simulate_connection_attempt(thread_id):
    """
    Simule une extraction Scapy et l'envoie en HTTP POST vers l'API.
    """
    for i in range(10): # 10 requêtes par thread
        src_port = random.randint(1024, 65535)
        # Format attendu par l'API
        fake_packet = {
            "Source IP": SPOOFED_IP,
            "Destination IP": "127.0.0.1",
            "Source Port": src_port,
            "Destination Port": TARGET_PORT,
            "Protocol": 6, # TCP
            "Total Length of Fwd Packets": 40, 
            "Fwd Packet Length Max": 40,
            "Flow Bytes/s": 400, 
            "RST_Flag": 0,
            "SYN_Flag": 1, # <--- C'est le flag de connexion initial
        }
        
        try:
            requests.post(API_ENDPOINT, json=[fake_packet])
            print(f"[Thread-{thread_id}] Paquet SYN injecté depuis {SPOOFED_IP}:{src_port}")
        except:
            pass
        time.sleep(0.05) 

print("\n🚀 Lancement de l'attaque simulée dans 3 secondes...")
time.sleep(3)

threads = []
for i in range(NUM_THREADS):
    t = threading.Thread(target=simulate_connection_attempt, args=(i,))
    threads.append(t)
    t.start()
    
for t in threads:
    t.join()

print("\n[V] Attaque simulée terminée.")
print("Vérifiez le tableau de bord React ! L'IP devrait être localisée et bloquée en Force Brute.")
