# logbook

Fitness-App als PWA. Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Kein Server, keine Konten, keine Cloud, kein Supabase.

## 1. ZIP entpacken
Windows: Rechtsklick auf die ZIP, "Alle extrahieren". Mac: Doppelklick. iPhone: Dateien-App, ZIP antippen.
Du bekommst einen Ordner `logbook` mit `index.html`, `sw.js`, `manifest.json`, `css/`, `js/`, `icons/`.

## 2. Auf GitHub hochladen
1. Auf github.com anmelden, oben rechts "+" > "New repository". Name z. B. `logbook`, Sichtbarkeit "Public", "Create repository".
2. "uploading an existing file" anklicken.
3. Den **Inhalt** des Ordners hineinziehen (nicht den Ordner selbst): `index.html` muss direkt im Hauptverzeichnis liegen. Die Ordner `css`, `js`, `icons` mitziehen.
4. "Commit changes".

## 3. GitHub Pages aktivieren
Repository > Settings > Pages > Source: "Deploy from a branch" > Branch `main`, Ordner `/ (root)` > Save.
Nach 1-2 Minuten erscheint oben die Adresse `https://DEINNAME.github.io/logbook/`.

## 4. iPhone
Adresse in **Safari** öffnen > Teilen-Symbol > "Zum Home-Bildschirm" > "Hinzufügen".

## 5. Android
Adresse in **Chrome** öffnen > Menü (drei Punkte) > "App installieren" bzw. "Zum Startbildschirm hinzufügen".

## 6. Backups
- Einstellungen > "Backup herunterladen (JSON)" speichert alle Profile, Pläne, Trainings, Geräteeinstellungen, Ernährung, Messwerte und das Design.
- Auf dem iPhone ist "Backup teilen / in Dateien sichern" am bequemsten (In Dateien sichern, AirDrop, iCloud Drive).
- Wiederherstellen: Einstellungen > Datei wählen. Die Datei wird zuerst geprüft und zusammengefasst. Erst nach zwei Bestätigungen werden die aktuellen Daten ersetzt; vorher wird eine Sicherung des aktuellen Stands angeboten.
- Fehlerhafte Dateien werden abgelehnt, ohne vorhandene Daten anzutasten.

**Wichtig:** Die Daten werden nicht zwischen Geräten synchronisiert. Bei Gerätewechsel oder wenn du Browser-/Websitedaten löschst, brauchst du dein Backup. Mach regelmäßig eins, z. B. einmal pro Woche.

## Updates
Neue Dateien ins Repository hochladen. Die App lädt die neue Version beim nächsten Öffnen (ggf. einmal schließen und neu öffnen). Trainingsdaten liegen in IndexedDB und sind von App-Updates nicht betroffen. Bei Änderungen am Datenformat gibt es eine Versionsnummer im Backup (aktuell 1).

## Geräte und Übungen auswählen
Training > Reiter "Geräte & Übungen": Hersteller (Prime Fitness, Hammer Strength, Cybex, Nautilus, Technogym, Life Fitness, Gym80, Matrix, Panatta, Precor, Hoist, Freemotion), Muskelgruppe und Suche kombinieren, dann "+ Plan" für den gewählten Trainingstag. Im Plan ersetzt "Austauschen" eine Übung durch ein anderes Gerät (die alte Übung bleibt in der Historie unverändert). Eigene Geräte legst du unten in der Liste an. Sie sind im Backup enthalten. Die Liste ist eine Vorschlagsliste: Namen und Geräteeinstellungen kannst du nach dem Hinzufügen frei ändern.
