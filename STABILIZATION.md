# Trener 2 — stabilizacja aktualnej bety 0.8.9.4

Stan: **feature freeze / testy praktyczne otwarte**. Gałąź robocza: `beta/0.8.9.4-stabilization-data`. Gałąź `main` bez zmian.

## Co sprawdzono automatycznie

- Kontrola składni JS i regresje starego schematu Diety `trainer3.diet.v076`.
- Dane historyczne: 1602 posiłki i 322 pozycje zakupów bez cichego usuwania najstarszych.
- Brak fałszywego potwierdzenia i czyszczenia formularza po nieudanym zapisie.
- Import kopii: wycofanie częściowych zmian po błędzie, odrzucenie pustej/uszkodzonej zawartości.
- Obecne testy makro, gramatury, widgetów, synchronizacji i wyboru treningu są częścią builda beta.

**Zielony build nie zastępuje testu na telefonie ani dwóch telefonach.**

## Testy na urządzeniu, wymagane przed uznaniem wersji za ustabilizowaną

- [ ] Aktualizacja z 0.8.9.3 do 0.8.9.4 bez odinstalowania i bez utraty danych.
- [ ] Zakładki: spójne kolory, ten sam nagłówek i nawigacja w Diecie i reszcie aplikacji.
- [ ] Dieta: zapis, edycja, usuwanie, duplikat, gramatura składników, cztery paski i historia po restarcie.
- [ ] Posiłki na wybrany dzień: chronologia, przesuwanie, przejście wstecz i naprzód bez zmiany danych.
- [ ] Formularz z klawiaturą Androida: dostęp do pól i przycisku Zapisz, bez zasłaniania i blokady przewijania.
- [ ] Widżety kalorii i wody po aktualizacji oraz restarcie telefonu.
- [ ] Solo: zmiana treningu, zapis serii, pauza, zakończenie i historia bez migania/resetowania widoku.
- [ ] Dwa telefony z tą samą wersją: połączenie, rozłączenie, ponowne połączenie i zapis historii obu osób.
- [ ] Eksport kopii przed aktualizacją oraz kontrolny import i weryfikacja zachowanych treningów i posiłków.

Do czasu ukończenia testów rzeczywistych status pozostaje **beta — stabilizacja w toku**, nie Stable.

---

## Archiwum: wcześniejsza stabilizacja 0.6.1

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
