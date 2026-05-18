import pandas as pd
import os

# Chemins des fichiers
source_path = 'data/cic_ddos/01-12/UDPLag.csv'
dest_path = 'data/UDPLag_sample.csv'

print(f"⏳ Lecture du gros fichier (157 Mo) à partir de {source_path}...")

try:
    # On lit seulement les 50 000 premières lignes
    df = pd.read_csv(source_path, nrows=50000)
    
    # On sauvegarde ce petit échantillon (environ 5 Mo)
    df.to_csv(dest_path, index=False)
    
    print(f"✅ Échantillon créé avec succès !")
    print(f"📂 Chemin : {os.path.abspath(dest_path)}")
    print(f"📊 Taille : {len(df)} lignes")
    
except Exception as e:
    print(f"❌ Erreur lors de la création : {str(e)}")
