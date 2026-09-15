# Trener 2 — stabilizacja po v0.6.1

## Punkt bazowy

Stabilna baza funkcjonalna: **v0.6.1** (`versionCode 22`).

Od tego punktu obowiązuje **feature freeze**: nie dodajemy nowych modułów ani dużych zmian UI, dopóki poniższe testy i poprawki stabilizacyjne nie zostaną zamknięte.

## Zasady stabilizacji

1. Priorytet: błędy, utrata danych, zgodność Androida, aktualizacje, QR/Wi-Fi, zapis treningu i migracje.
2. Nie zmieniamy formatu istniejących danych bez migracji wstecznej.
3. Każda poprawka musi przejść testy automatyczne i build podpisanego APK.
4. Poprawki stabilizacyjne oznaczamy jako `0.6.1.x` oraz zwiększamy `versionCode`.
5. Nie publikujemy nowej funkcji podczas stabilizacji bez jawnej decyzji o zakończeniu feature freeze.
6. Test na fizycznym telefonie jest wymagany dla funkcji zależnych od Androida: QR, powiadomienia, aktualizator, instalacja aktualizacji i Wi-Fi.

## Zakres funkcjonalny zamrożony w v0.6.1

- prowadzenie treningu solo i dwóch osób;
- osobne statusy/przerwy dwóch osób;
- zapisywanie serii po wykonaniu;
- grafiki i instrukcje ćwiczeń;
- RIR, ocena techniki i ból/dyskomfort;
- rekomendacja progresji po serii;
- gotowość przed treningiem i autoregulacja;
- dwa gryfy, konfiguracja talerzy i kalkulator obciążenia;
- historia, masa ciała i wykresy progresu;
- kopia/import danych;
- przypomnienia;
- lokalne połączenie dwóch telefonów przez Wi-Fi/hotspot;
- QR do parowania;
- sprawdzanie i pobieranie aktualizacji;
- stały podpis release APK.

## Checklista testów stabilizacyjnych

- [ ] Aktualizacja ze starszej zainstalowanej wersji do v0.6.1 bez utraty danych.
- [ ] `Ustawienia → Aktualizacje` pokazują prawidłowo wersję lokalną i najnowszą.
- [ ] Start aplikacji bez crasha na telefonie docelowym.
- [ ] Trening solo: zapis serii, przerwa, pauza, stop i historia.
- [ ] Trening 2 osoby na jednym telefonie: kolejność i osobne przerwy.
- [ ] Dwa telefony: host, dołączenie, QR, synchronizacja serii i ponowne połączenie.
- [ ] RIR/technika/ból zapisują się do historii i nie blokują starej historii.
- [ ] Gotowość zmienia rekomendację bez uszkodzenia planu.
- [ ] Kalkulator talerzy daje poprawne obciążenie dla obu gryfów.
- [ ] Wykresy działają przy pustej historii, jednym pomiarze i wielu treningach.
- [ ] Eksport/import zachowuje ustawienia, treningi, gotowość i sprzęt.
- [ ] Powiadomienia działają po ponownym uruchomieniu telefonu/aplikacji.
- [ ] Instalacja podpisanego APK działa jako aktualizacja, bez konieczności odinstalowania.

## Kryterium zakończenia stabilizacji

Stabilizację uznajemy za zakończoną dopiero po przejściu pełnej checklisty na fizycznym telefonie oraz po braku błędów krytycznych w normalnym użyciu treningowym. Do tego momentu rozwój funkcji pozostaje zamrożony.
