'use strict';
/* Geräte-Vorschlagsliste. Typen je Hersteller; Namen und Einstellungen sind nach dem Hinzufügen frei editierbar. */
const GROUPS=['Brust','Rücken','Schultern','Bizeps','Trizeps','Beine','Gesäß','Waden','Bauch'];
const BRANDS=['Prime Fitness','Hammer Strength','Cybex','Nautilus','Technogym','Life Fitness','Gym80','Matrix','Panatta','Precor','Hoist','Freemotion'];
// [Name, Gruppe, isolateral, Einstellungsfelder, Hammer-Strength-Iso-Lateral-Variante]
const BASE=[
['Brustpresse','Brust',0,'Sitzhöhe,Rückenlehne,Griffposition',1],
['Schrägbankpresse','Brust',0,'Sitzhöhe,Rückenlehne,Griffposition',1],
['Negativ-Brustpresse','Brust',0,'Sitzhöhe,Griffposition',1],
['Butterfly','Brust',0,'Sitzhöhe,Armposition,Bewegungsradius,Polstereinstellung'],
['Latzug','Rücken',0,'Sitzhöhe,Oberschenkelpolster,Griffposition',1],
['Rudermaschine','Rücken',0,'Sitzhöhe,Brustpolster,Griffposition',1],
['High Row','Rücken',0,'Sitzhöhe,Brustpolster,Griffposition',1],
['Low Row','Rücken',0,'Sitzhöhe,Brustpolster,Griffposition',1],
['Pullover','Rücken',0,'Sitzhöhe,Startposition'],
['Rückenstrecker','Rücken',0,'Polsterposition,Rückenlehne'],
['Schulterpresse','Schultern',0,'Sitzhöhe,Rückenlehne,Griffposition',1],
['Seitheben','Schultern',0,'Sitzhöhe,Armposition'],
['Reverse Butterfly','Schultern',0,'Sitzhöhe,Armposition,Brustpolster'],
['Bizepscurl','Bizeps',0,'Sitzhöhe,Armpolster'],
['Preacher Curl','Bizeps',0,'Sitzhöhe,Armpolster'],
['Trizepsmaschine','Trizeps',0,'Sitzhöhe,Armposition'],
['Dip-Maschine','Trizeps',0,'Sitzhöhe,Griffposition'],
['Beinpresse','Beine',0,'Sitzhöhe,Rückenlehne,Fußposition',1],
['Hack Squat','Beine',0,'Schulterpolster,Fußposition'],
['Belt Squat','Beine',0,'Gurtlänge,Fußposition'],
['Beinstrecker','Beine',0,'Sitzhöhe,Rückenlehne,Schienbeinpolster'],
['Beinbeuger sitzend','Beine',0,'Sitzhöhe,Rückenlehne,Polster'],
['Beinbeuger liegend','Beine',0,'Polster,Startposition'],
['Adduktoren','Beine',0,'Sitzhöhe,Startposition'],
['Abduktoren','Gesäß',0,'Sitzhöhe,Startposition'],
['Glute Press','Gesäß',0,'Sitzhöhe,Fußposition'],
['Glute Kickback','Gesäß',0,'Polsterposition'],
['Wadenheben sitzend','Waden',0,'Sitzhöhe,Polster'],
['Wadenheben stehend','Waden',0,'Schulterpolster'],
['Bauchmaschine','Bauch',0,'Sitzhöhe,Widerstand,Griffposition'],
['Rotary Torso','Bauch',0,'Sitzhöhe,Startposition']
];
// Ohne Hersteller: Kabel, freie Gewichte, Körpergewicht, einseitige Varianten
const GENERAL=[
['Kabel Trizepsdrücken','Trizeps',0],['Kabel Trizepsdrücken einarmig','Trizeps',1],['Kabel Bizepscurl einarmig','Bizeps',1],['Kabel Fly','Brust',0],['Kabelrudern','Rücken',0],['Kabel Seitheben einarmig','Schultern',1],['Face Pull','Schultern',0],
['Smith-Maschine Kniebeuge','Beine',0],['Smith-Maschine Schrägbankdrücken','Brust',0],
['Langhantel Bankdrücken','Brust',0],['Langhantel Kniebeuge','Beine',0],['Kreuzheben','Rücken',0],['Rumänisches Kreuzheben','Beine',0],['Langhantel Rudern','Rücken',0],
['Kurzhantel Bankdrücken','Brust',0],['Kurzhantel Schulterdrücken','Schultern',0],['Kurzhantel Seitheben','Schultern',0],['Kurzhantel Rudern einarmig','Rücken',1],['Kurzhantel Bizepscurl einarmig','Bizeps',1],['Hammercurls','Bizeps',0],
['Klimmzüge','Rücken',0],['Dips','Trizeps',0],['Ausfallschritte Kurzhanteln','Beine',0],['Bulgarian Split Squat','Beine',1],
['Beinpresse einbeinig','Beine',1],['Beinbeuger einbeinig','Beine',1],['Beinstrecker einbeinig','Beine',1],['Wadenheben einbeinig','Waden',1],['Hip Thrust','Gesäß',0],['Plank / Bauch Körpergewicht','Bauch',0]
];
const CATALOG=(()=>{let n=0;const out=[];
  BRANDS.forEach(b=>BASE.forEach(([name,group,iso,keys,hs])=>{const hm=b==='Hammer Strength'&&hs;
    out.push({id:'c'+(n++),brand:b,name:(hm?'Iso-Lateral ':'')+name,group,iso:(hm||iso)?1:0,keys:keys?keys.split(','):[]})}));
  GENERAL.forEach(([name,group,iso])=>out.push({id:'c'+(n++),brand:'Allgemein',name,group,iso,keys:[]}));
  return out})();
