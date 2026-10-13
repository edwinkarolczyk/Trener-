# Trener 2 Lite — tablet Amazon Fire OS 5 (Android 5.1+)

Oddzielny moduł Android (pakiet `pl.edwin.trener2lite`), bez diety, Google Play, z lokalnym zapisem SQLite i dużymi elementami sterującymi. Pełny Trener 2 pozostaje nietknięty.

## Wersja 0.2.0: rdzeń treningu i historii

- Biblioteka 37 ćwiczeń pochodzi z oryginalnego `exerciseLibrary` i `v050-addon.js` Trenera 2.
- Przy nowym profilu tworzą się cztery plany fabryczne: PON, ŚR, PT i dodatkowy biceps. Usuniętych planów nie odtwarzamy automatycznie.
- Można tworzyć ćwiczenia i plany, edytować dla pozycji planu liczbę serii, cel powtórzeń/sekund i przerwę.
- Trening ma progresję opartą na ostatnim ukończonym treningu: DOŁÓŻ, ZOSTAW lub ODEJMIJ; dominujący ciężar, krok 2,5 kg, redukcja 5% przy dwóch seriach poniżej minimum. Słaba technika lub ból blokują zalecaną progresję.
- Serie zawierają masę, powtórzenia/sekundy, RIR 0–4+, technikę i ból/dyskomfort.
- Timer odpoczynku, pomijanie przerwy, pauza/wznowienie, kontynuowanie po zamknięciu programu.
- Trening kilku osób na jednym tablecie (2–8 profili): jeden plan, rotacja kolejki, indywidualne serie i ciężary, osobne historie. Dane pozostają na tablecie.
- Historia zgrupowana według ćwiczeń: wszystkie serie, czas, objętość, średni RIR, liczba serii ze słabą techniką i bólem, status przerwanego treningu.
- Osobne rekordy maksymalnych ciężarów i podsumowania liczby treningów, serii i objętości per profil.
- Kopie JSON obejmują dane v0.1.1 i rozszerzenia (historia, cele planów, RIR, przerwy, stany grup), przywracane w jednej transakcji.
- Aktualizacje podpisanego APK: powiadomienie po sprawdzeniu, przycisk instalacji, ręczne potwierdzenie Androida; kolejna instalacja nie wymaga kasowania danych.

## Niezamknięte różnice względem pełnego Trenera 2

Te funkcje **nie są jeszcze w 100% zgodne**, dlatego tej wersji nie wolno ogłaszać pełnym portem:
- brak bezpośredniego importu pełnej kopii `trener2-backup` do SQLite Lite; dotychczasowy import dotyczy kopii Lite,
- brak kompletnego planisty tygodnia `v070`, uczenia adaptacyjnej liczby serii na bazie 3 udanych treningów oraz ankiety gotowości `v059`,
- brak współpracy z drugim telefonem przez Wi-Fi/QR (tryb jednej maszyny jest dostępny),
- ćwiczenia użytkownika mają nazwę/partię i cele w planie, ale bez obrazów/filmów i zaawansowanego importu ZIP/Excel,
- test na fizycznym Amazon Fire (SR043KL) jest wymagany, aby potwierdzić rozmiary interfejsu, pamięć i instalację.

## Testowanie

- `gradle :lite:testDebugUnitTest :lite:assembleRelease`
- GitHub Actions: `Build Trener 2 Lite (Fire OS 5)` — podpis i API 22
- Test ręczny: utwórz dwóch ćwiczących, 2–3 serie obu na zmianę, pauza/wznowienie, historia osobno, eksport/import, aktualizacja 0.1.1 → 0.2.0 bez utraty danych.

Zachowuj wsteczną kompatybilność v0.1.1; nie zmieniaj gałęzi `main` dla pełnej aplikacji.
