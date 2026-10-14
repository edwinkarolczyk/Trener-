# Trener 2 Lite — specyfikacja funkcjonalna 1 tablet / 1–6 osób

**Status:** zaakceptowany kierunek na podstawie 23 z 30 odpowiedzi użytkownika, 7 odpowiedzi pozostaje niezatwierdzonych.  
**Gałąź robocza:** `feature/trener2-lite-fire5`, bez zmian na `main`.  
**Wersja referencyjna przed zmianami:** Lite 0.3.0.  
**Urządzenie docelowe:** Amazon Fire OS 5, Android 5.0+ (API 21); aplikacja offline, jeden tablet.

## 1. Warunki nienegocjowalne

- Trening, plany, ćwiczenia, historia i logika progresji mają bazować na oryginalnym silniku pełnego Trenera 2, a nie niezależnym zamienniku.
- Oryginalny ciemny/czerwony motyw Trenera 2. Jedyna oczekiwana zmiana motywu: większe, czytelne przyciski i pola dotykowe; nie tworzyć alternatywnego wyglądu.
- 1–6 uczestników **na jednym tablecie**, offline; tryb drugiego telefonu i LAN nie jest przedmiotem tego etapu.
- Wspólna sesja jest kontenerem na oddzielne, w pełni identyfikowane profile. Historia, progresja, RIR, rekordy, odpoczynek i cele są osobne dla każdej osoby.
- Nie kasować ani nie nadpisywać dotychczasowych danych podczas aktualizacji lub importu; najpierw kopia, podgląd, walidacja i niedestrukcyjne scalenie.
- Brak modułów diety, wody i przepisów w Lite.

## 2. Zatwierdzone decyzje (23/30)

| Nr | Wymaganie |
|---|---|
| 1 | Maksymalnie 6 osób jednocześnie. |
| 2 | Wybór zapisanej grupy albo dowolnej kombinacji uczestników przed sesją. |
| 3 | Na starcie wybór: plan wspólny albo plany indywidualne. |
| 4 | Automatyczna kolejka wybiera osobę gotową po przerwie. |
| 5 | Dla niegotowej osoby operator wybiera: CZEKAJ / POMIŃ KOLEJKĘ. |
| 6 | Główny widok pokazuje wszystkie osoby, serie i przerwy. |
| 7 | Grafik wspólny i grafik indywidualny. |
| 8 | Pominięcie ćwiczenia wyłącznie dla jednej osoby. |
| 9 | Ten sam plan bazowy; Trener może zaproponować dodatkowe serie indywidualnie. |
| 10 | Zakres powtórzeń indywidualny. |
| 11 | Modyfikacje planu podczas sesji dotyczą tylko tej sesji. |
| 12 | Cała biblioteka Trenera 2, własne ćwiczenia oraz import Excel i ZIP. |
| 13 | Ciężar sugerowany jest wpisywany automatycznie, ale edytowalny. |
| 15 | Adaptacyjne sugestie progresji na podstawie kilku ostatnich sesji. |
| 16 | Przy stagnacji Trener sugeruje też zmianę serii/ćwiczenia. |
| 17 | Deload wyłącznie jako propozycja do zatwierdzenia. |
| 20 | Poprzednie wyniki, porównanie i wykres z kilku sesji. |
| 21 | Osobny timer odpoczynku na uczestnika. |
| 22 | Koniec przerwy: kolor i dźwięk, wibracja opcjonalna. |
| 23 | Jeden wspólny sprzęt. |
| 25 | Po wyłączeniu tabletu automatycznie wznowić od ostatniej zapisanej serii. |
| 29 | Import kompletnej kopii Trenera 2 albo wybranej osoby bez kasowania danych. |
| 30 | Oryginalny motyw Trenera 2, tylko większe przyciski. |

## 3. Zasady sesji i model danych

- `participantId` = trwała tożsamość osoby, niezależna od kolejności, imienia i tego, kto trzyma tablet.
- `sessionId` = identyfikator sesji grupowej; `personSessionId` = odrębny wynik jednej osoby.
- Każdy zapis serii ma unikatowe `setId`, osobę, ćwiczenie, numer serii, datę, rzeczywisty ciężar, powtórzenia/czas, opcjonalne RIR, jakość i ból.
- Plan na czas sesji to snapshot: kopia planu bazowego plus indywidualne cele i doraźne wyjątki. Edycja w trakcie nie zmienia automatycznie planu tygodniowego.
- Przerwy są niezależne, `readyAt` osobne; kolejka operuje na parze `participantId + exerciseId`. Nie zakłada, że wszyscy są na tym samym ćwiczeniu.
- Sprzęt wspólny: maksymalnie jedna osoba wykonuje serię w danej chwili; przerwy mogą biec równolegle. Zmiana obciążenia nie miesza historii.
- Kolejność ma być sprawiedliwa: wybór spośród osób gotowych, bez głodzenia któregoś uczestnika. Jeśli nikt nie jest gotowy, pokaż najbliższy timer; bez automatycznego zapisania serii.
- POMIŃ KOLEJKĘ przenosi uczestnika na później, nie kasuje jego serii ani ćwiczenia. POMIŃ ĆWICZENIE oznacza jawny wyjątek tylko u wskazanej osoby.
- Po każdej zapisanej serii natychmiast utrwal snapshot całej kolejki, timerów, osób i wyników. Wznowienie idempotentne bez duplikatów.

## 4. Indywidualna progresja — szczegółowe zasady do implementacji

Algorytm ocenia osobno `participantId + exerciseId + wariant sprzętu`, nie grupę.

1. Dla sugerowanego ciężaru wykorzystaj 3–5 ostatnich **ukończonych** sesji danej osoby (proponowana analiza; dokładny próg zostanie zatwierdzony przy wdrożeniu). Oddziel serię roboczą od rozgrzewkowej.
2. Jeżeli wielokrotnie osiągnięto docelowy zakres powtórzeń przy dobrej technice, bez bólu i z odpowiednim RIR — zaproponuj dodanie najbliższego dozwolonego skoku ciężaru.
3. Przy częściowym powodzeniu lub braku wystarczających danych — pozostaw ciężar i jasno wskaż przyczynę.
4. Przy powtarzalnej porażce — zaproponuj redukcję ciężaru, z uwzględnieniem techniki, RIR i zmęczenia.
5. Po trzech sesjach stagnacji — zaproponuj zmianę zakresu powtórzeń, serii lub wariantu ćwiczenia. Nie zmieniaj planu bez akceptacji.
6. Dodatkowa seria może zostać zaproponowana na podstawie kilku jakościowo dobrych sesji. Zmiana dotyczy wskazanej osoby, nie całej grupy. Zachować logikę oryginalnego `v0642-adaptive-volume.js`.
7. Deload ma być sugestią, nie automatycznym wykonaniem; przykładowo lżejszy ciężar/objętość na jeden mikrocykl, po akceptacji.
8. W polu ciężaru pokazuj wartość sugerowaną i ostatnio użytą, automatycznie wpisz sugestię, zezwól na zmianę. Zapisuj zawsze **faktycznie wykonaną** wartość.

Do czasu zatwierdzenia pytań 14/18/19/24 nie zamykać zachowania skoków, wymagania RIR, reakcji na ból i podpowiedzi przełożenia obciążenia na wspólnym sprzęcie.

## 5. Ekran w oryginalnym motywie

- Zachować paletę i komponenty pełnego Trenera 2; tylko większa typografia, pola i cele dotykowe dla Fire.
- Główna karta aktywnego ćwiczącego: imię, ćwiczenie, numer serii, cel, ciężar sugerowany, ciężar poprzedni, zapis serii.
- Pod kartą przewijalna lista wszystkich uczestników: imię, bieżące ćwiczenie, serie, indywidualny timer, status GOTOWY / ĆWICZY / ODPOCZYWA / ZAKOŃCZYŁ / POMINIĘTO.
- Nie pokazywać sześciu pełnych formularzy wpisywania ciężaru jednocześnie na małym ekranie.
- Zmiany kolorów pełnią funkcję sygnałów, nie zmieniają motywu: zielony = gotowe/postęp, żółty = odpoczynek/ostrzeżenie, czerwony = błąd/ból, ciemne tło pozostaje.
- Dostęp do historii każdej osoby bez kończenia sesji i bez utraty danych w bieżącym formularzu.

## 6. Siedem nieudzielonych odpowiedzi — propozycje, NIE ZATWIERDZONE

| Nr | Proponowany domyślny wybór |
|---|---|
| 14 | Krok ciężaru per osoba i ćwiczenie; wybór 0,5 / 1 / 2,5 / 5 kg plus własny. |
| 18 | RIR opcjonalny po każdej serii; brak RIR nie jest równy domyślnie „dobremu wynikowi”. |
| 19 | Ból lub słaba technika blokują zwiększenie ciężaru; proponuj wariant bezpieczniejszy zamiast diagnozy medycznej. |
| 24 | Pokaż ostatni i sugerowany ciężar danej osoby, opcjonalnie obciążenie do zmiany na sztandze. |
| 26 | Automatyczny zapis przerwanej sesji, możliwość kontynuacji; bez usuwania serii. |
| 27 | Statystyki indywidualne i grupowe; porównanie osób jako opcja, nie domyślna rywalizacja. |
| 28 | Rekordy, objętość, wykresy, estymacja 1RM jako oszacowanie, analiza stagnacji i propozycje. |

## 7. Wykryte rozbieżności w Lite 0.3.0 (na podstawie kodu)

- `app/src/main/assets/v086-one-phone.js`: interfejs i walidacja limitują **2–4 osoby**. To nie spełnia limitu 6.
- Ten sam moduł rozpoczyna jedną sesję z `getPlan(planSelect.value)` i `state.plan` dla wszystkich. Nie obsługuje planów osobnych dla poszczególnych osób.
- Kolejka wybiera gotową osobę dla **jednego wspólnego ćwiczenia**, nie pary osoba/ćwiczenie z różnych planów. Częściowo odpowiada na pkt 4, ale nie realizuje pkt 3 i 8.
- Funkcja `total(ex)` używa jednej liczby serii z obiektu ćwiczenia dla wszystkich. Nie ma osobnego celu serii na osobę.
- `v059-readiness.js` używa jednego zestawu pól gotowości na start, nie 6 niezależnych ocen.
- `v094-exercise-ui.js` deklaruje, że **import ZIP i filmy nie są wdrożone**. Import Excel/ZIP wymaga odrębnego etapu, również przy wspólnej bibliotece.
- `backup-addon.js` przy standardowym imporcie zapisuje wartości `trainer3.history` z pliku w miejsce obecnych. Dla wymogu niedestrukcyjnego łączenia trzeba zbudować osobny kreator podglądu i scalania; nie uznawać aktualnej ścieżki za bezpieczny merge.
- Dane starszego Lite nadal istnieją w SQLite; nowy ekran Lite 0.3.0 migruje je do `trainer3.history`, ale nie ma dowodu z testu fizycznego Fire, że wszystkie przypadki migracji są poprawne.
- Wygenerowany silnik i motyw pełnego Trenera 2 nie oznaczają, że wszystkie natywne integracje i dynamiczne widoki są zgodne ze starym WebView Fire OS 5.

## 8. Etapy wdrożenia (kolejność obowiązkowa)

### ETAP 0 — audyt i zabezpieczenie danych, P0
- Reprodukcyjne testy Lite 0.3.0 na docelowym Fire/WebView, raport błędów JS, stan nieprzeniesionych danych.
- Kopia starej SQLite, nowej historii JS, planów, zdjęć i ustawień z możliwością przywrócenia.
- Import JSON: podgląd, wybór osób, bezpieczne scalenie po trwałym ID, wykrywanie duplikatów oraz transakcja/rollback.
- Test przejścia ze starszych wersji Lite bez utraty treningów i bez usunięcia aplikacji.

### ETAP 1 — sesja 1–6 osób, P0
- Zapis grup i wybór uczestników; trwałe profile i indywidualne cele.
- Jeden plan lub różne plany w jednej sesji; per-osoba pomijanie ćwiczenia.
- Kolejka po gotowości, wspólny sprzęt, sprawiedliwy wybór, CZEKAJ/POMIŃ KOLEJKĘ.
- Niezależne liczniki i zapis każdego przejścia; wznowienie po wymuszonym zamknięciu.
- Testy 2/3/4/5/6 uczestników z mieszanymi planami, krótkimi odpoczynkami, pauzą i restartem.

### ETAP 2 — progresja indywidualna, P0/P1
- Trwałe łączenie historii po profile+exercise, brak mieszania ciężarów.
- Sugerowany ciężar automatycznie w polu, ręczna korekta, objaśnienie decyzji.
- Trend ostatnich sesji, RIR/technika/ból, stagnacja, opcjonalny deload, dodatkowe serie po zatwierdzeniu.
- Testy regresyjne ciężarów i skoków, brak przypadkowej progresji innych osób.

### ETAP 3 — grafiki, biblioteka i import, P1
- Tydzień wspólny i indywidualny z wyjątkami obowiązującymi tylko w bieżącej sesji.
- Pełna biblioteka wspólna z Trenerem 2 i własne ćwiczenia.
- Import Excel i ZIP ze zdjęciami: mapowanie kolumn, podgląd, walidacja mediów, deduplikacja.
- Bez zakładania, że import ZIP/Excel istnieje już w pełnym Trenerze 2 — tę funkcję trzeba rzeczywiście stworzyć.

### ETAP 4 — historia, statystyki i UX, P1
- Każda osoba: seria po serii, rekordy, wykresy, objętość i trend kilku sesji.
- Widok grupowy + podgląd poszczególnych osób.
- Oryginalny motyw i wygodne dotykowe sterowanie na małym tablecie.
- Dźwięki, kolor i opcjonalna wibracja końca przerwy.

### ETAP 5 — stabilizacja / wydanie, P0
- Testy realnej sesji 6 osób, mieszanego planu i wspólnego sprzętu.
- Kontrolowane zabicie procesu po serii 1/2/ostatniej i wznowienie bez duplikacji.
- Import pełnej kopii, import jednej osoby, aktualizacja z Lite 0.2/0.3; porównanie sumy serii i historii przed/po.
- Test zgodności JavaScript, CSS i plików na Fire OS 5, ciągła praca offline.
- Podpisany APK/CI, a zgodność 1:1 ogłaszać dopiero po testach funkcjonalnych.

## 9. Kryteria odbioru

- **6 osób** mogą uczestniczyć w jednej sesji na jednym tablecie i zakończyć ją z sześcioma osobnymi historiami.
- Osoba A i B mogą wykonywać to samo ćwiczenie z różnymi ciężarami/zakresami/seriami; propozycja progresji dla A nie zmienia B.
- Mieszane plany nie blokują kolejki, a POMIŃ KOLEJKĘ/POMIŃ ĆWICZENIE nie usuwają wyników innych osób.
- Po wyłączeniu tabletu ostatnia zatwierdzona seria zostaje zachowana dokładnie raz.
- Import pliku nie usuwa już obecnych treningów; przy konflikcie użytkownik dostaje podgląd, a nie cichą zamianę.
- Brak zmian w `main`, brak modułów dietetycznych i brak własnego zastępczego motywu.

**Stan dokumentu:** specyfikacja i priorytety, nie deklaracja wdrożenia. Użytkownik nie odpowiedział jeszcze na pytania 14, 18, 19, 24, 26, 27, 28.
