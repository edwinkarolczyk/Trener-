# Trener 2 Lite 0.4.0 — zatwierdzona specyfikacja i plan wdrożenia

Stan dokumentu: 2026-10-14 — 42/42 decyzji zatwierdzone. **Plan, nie raport wykonanych zmian.**
Baza produkcyjna / punkt odniesienia: Lite 0.3.9 (użytkownik potwierdził instalację i działanie).
Repo: `edwinkarolczyk/Trener-`. Gałąź robocza **WYŁĄCZNIE** `feature/trener2-lite-fire5`; nie zmieniać `main`.
Urządzenie docelowe: Amazon Fire 7 (7. generacja / 2017), Fire OS 5.7.1.0 (Android 5.1.1/API 22), stary WebView.
Cel: usunąć nadmiar UI bez utraty danych i możliwości treningu 1–6 osób.

## 42 decyzje użytkownika — źródło prawdy

### Pierwsza grupa: 1–12
1. Połączyć starą „Kopię treningów” i nową „Bezpieczną kopię i przywracanie” w jedną sekcję z bezpiecznym importem z podglądem i scalaniem.
2. Ukryć sekcję „Połączenie z partnerem / Dwa telefony” w Ustawieniach.
3. Ukryć przypomnienia o treningu (nie kasować zapisanych ustawień).
4. Stary formularz „Gryf 1 / Gryf 2” ma pozostać ukryty; zachować nowy katalog „Mój sprzęt”.
5. Ukryć zbędne przyciski GitHub; zachować diagnostykę/logi i mechanizm aktualizacji.
6. Wybór profili bezpośrednio na ekranie Start.
7. Kompaktowy Start; opcje zaawansowane pod „Więcej opcji”.
8. Osobna zakładka „Moje ćwiczenia” z biblioteką/importem; Plan pozostaje planem.
9. Historia zwarta, tylko jeden rozwinięty wpis jednocześnie.
10. Zachować pełne statystyki/Postępy.
11. Zdjęcia i szczegółowe opisy techniki w rozwijanych szczegółach treningu.
12. Ustawienia w rozwijanych kategoriach.

### Druga grupa: 13–42
13. Po uruchomieniu zawsze Start.
14. Uczestnicy w Start: zdjęcie/awatar + imię.
15. W Start przycisk „+ Dodaj osobę”.
16. Ostatni trening na Start tylko po rozwinięciu.
17. Niedokończona sesja: duży przycisk „WZNÓW” u góry.
18. Powitanie/instrukcje ukryte po pierwszym uruchomieniu.
19. Osoby oczekujące na kolej: duże osobne kafelki wszystkich.
20. Po zapisie serii automatycznie przełączyć na gotową osobę (bez resetowania indywidualnego odpoczynku).
21. Duże, niezależne liczniki odpoczynku wszystkich osób.
22. „POMIŃ KOLEJKĘ” i „POMIŃ ĆWICZENIE” stale widoczne.
23. RIR, technika i odczuwany ból widoczne obok ciężaru i powtórzeń.
24. Dźwięk i wibracja końca odpoczynku, niezależnie konfigurowalne/wyłączalne.
25. Plan dobierany automatycznie według dnia tygodnia, z możliwością ręcznej korekty.
26. Osobny plan tygodniowy dla każdej osoby.
27. Biblioteka: miniaturka + nazwa + partia mięśniowa.
28. Domyślnie pokazać ćwiczenia możliwe z zadeklarowanym sprzętem; „Pokaż wszystkie”. Jeśli sprzęt nie jest zdefiniowany, pokazać wszystkie ćwiczenia.
29. Po wejściu w ćwiczenie pełna karta ze wszystkimi danymi.
30. Zachować obsługę krótkich filmów instruktażowych.
31. Po wejściu w Historię najpierw wybór profilu.
32. Dwa widoki Historii: „Moje treningi” wybranego profilu i „Wspólne treningi” (jedna sesja grupowa rozwijana na osoby, bez duplikowania zapisów).
33. Zwinięty wpis historii: data, plan, czas, liczba serii.
34. Wyszukiwanie Historii po dacie, osobie i ćwiczeniu; dodatkowe filtry rozwijane.
35. Kolorowe oznaczenie PR przy ćwiczeniu.
36. Postępy otwierają podsumowanie wszystkich osób, z filtrem osoby.
37. Pięć rozwijanych kategorii Ustawień: Użytkownicy, Sprzęt, Kopie, Aktualizacje, Diagnostyka.
38. Aktualizacje w Ustawieniach + nieinwazyjna informacja o nowej wersji.
39. Lista zmian dostępna na żądanie.
40. Jeden przycisk „Eksportuj diagnostykę”.
41. Opcja „Nie wygaszaj ekranu podczas treningu” w Ustawieniach.
42. Układ głównie pionowy podczas treningu; zachować czytelność po obrocie.

## Bezwzględne warunki bezpieczeństwa

- Nie usuwać, nie resetować i nie nadpisywać lokalnych profili, trwałych identyfikatorów, historii, rekordów, planów, zdjęć, filmów, ćwiczeń własnych, ustawień sprzętu, ani archiwalnych danych nieobjętych nowym UI.
- Imię powiązane z rozpoczętą historią pozostaje zablokowane. Nie budować nowych profili podczas migracji z powodu zmiany widoku.
- Działający eksport/import kopii JSON i scalenie bez utraty dotychczasowych danych; test przypadków konfliktu, przerwanego importu i pustej pamięci.
- Nie modyfikować pełnego Trenera 2 na `main`. Nie wprowadzać nowych funkcji wymagających wyższej wersji Androida niż Fire OS 5.
- Nie zmieniać kodu pakowania/podpisu APK bez przyczyny: instalacja 0.3.9 została potwierdzona na Fire 7.
- Małe zmiany i powtarzalne testy; przed publikacją zachować możliwość powrotu do 0.3.9 i odtworzenia danych z zewnętrznej kopii.

## Fakty z analizy obecnego kodu (2026-10-14)

- `app/src/main/assets/index.html` zawiera `#start`, `#setup`, `#training`, `#history`, `#progress` i nawigację, w której nadal znajdują się wspólne dla pełnego Trenera elementy Dieta/Przepisy.
- `lite/scripts/build-parity-assets.cjs` generuje Lite ze wspólnych zasobów, usuwa niektóre moduły i dokłada `lite-profile-ui.js`, `lite-fire-ui.js`; zmian Lite UI dokonywać w warstwie Lite / transformacji, a nie bezpośrednio w `main`.
- `lite/scripts/lite-profile-ui.js` już przechowuje stałe profile i identyfikatory, przełącza grupę 1–6 osób, blokuje zmianę nazwy po historii; obecnie kieruje wybór osoby do Ustawień.
- `lite/scripts/lite-fire-ui.js` i `lite/scripts/lite-fire.css` obsługują panel treningu Fire, roster, liczniki i technikę; zachować spójność z silnikiem kolejki.
- `lite/scripts/lite-data-manager.js` realizuje bezpieczny import z podglądem, merge i rollbackiem; nie zastępować go prostym importem starego UI.
- `lite/build.gradle`: aktualna wersja Lite 0.3.9; versionCode=13, targetSdk=28. Podbić dopiero wraz z testowanym wydaniem.

## Prace: etapy, atomowe zmiany i kryteria odbioru

### Etap 0 — siatka bezpieczeństwa i testy regresji (P0)
1. Zidentyfikować klucze danych/localStorage/SQLite, eksport JSON i kopię zdjęć.
2. Test migracji danych z 0.3.9 do przyszłej 0.4.0 oraz brak modyfikacji profilowych ID/rekordów.
3. Test pełnej kopii, importu z preview, konfliktów i rollbacku.
4. Zabezpieczyć test przypadków 1/2/3/6 uczestników; nie tworzyć wydania z utratą progresu.
**Odbiór:** wszystkie testy bez utraty danych oraz potwierdzenie integralności kopii.

### Etap 1 — Start i profile
1. Zamiast skoku do Ustawień umożliwić zaznaczenie osób bezpośrednio na Start; użyć istniejącego `TrenerLiteProfiles.select/list` i trwałych ID.
2. Dodać awatary/zdjęcia w kartach osób, dodawanie nowej osoby z Start oraz opis postępu.
3. „WZNÓW” tylko gdy istnieje aktywna nieukończona sesja; nie tworzyć nowej sesji przy wznowieniu.
4. Domyślny ekran Start; powitanie jeden raz; „Więcej opcji”; ostatnia sesja na żądanie.
**Odbiór:** 1–6 osób; selekcja i uruchomienie z właściwymi ID; przerwanie/wznowienie; ponowne uruchomienie aplikacji.

### Etap 2 — Trening grupowy i czytelność Fire
1. Wszystkie osoby duże kafelki, duże liczniki indywidualne, bez zgadywania kto odpoczywa.
2. Automatyczna kolejka do gotowej osoby, oba przyciski pomijania zawsze widoczne.
3. RIR/ból/technika przy parametrach serii, zdjęcia i dłuższe opisy schowane w `details`.
4. Dźwięk/wibracja odpoczynku z opcją wyłączenia; zapobieganie podwójnym sygnałom.
**Odbiór:** brak przeskakiwania między profilami, niezależne przerwy przy 6 osobach, brak duplikatów serii.

### Etap 3 — Plan i „Moje ćwiczenia”
1. Osobne kalendarze tygodniowe/proponowany plan wg dnia dla każdego trwałego ID.
2. Nowa zakładka Moje ćwiczenia, miniatury, pełna karta, krótkie filmy, import Excel/ZIP, filtry sprzętu i „Pokaż wszystkie”.
**Odbiór:** brak zmiany starszych planów i własnych ćwiczeń; import bez duplikowania; pusty sprzęt nie ukrywa biblioteki.

### Etap 4 — Historia i Postępy
1. Dwa tryby Moje/Wspólne, osoba wybierana przy wejściu w Historię, zwarta lista/tylko jeden rozwinięty wpis, PR przy ćwiczeniu.
2. Wyszukiwarka data/osoba/ćwiczenie; pełne statystyki z domyślnym podsumowaniem wszystkich osób.
**Odbiór:** wspólne sesje nie duplikują historii; PR poprawne dla właściwego uczestnika.

### Etap 5 — Ustawienia i redukcja UI
1. Jedna sekcja kopii z bezpiecznym importem, pięć rozwijanych kategorii.
2. Ukryć dwa telefony, przypomnienia i stare fikcyjne gryfy bez kasowania ustawień.
3. Ukryć techniczne przyciski GitHub; jeden eksport diagnostyki; aktualizacje i lista zmian na żądanie.
4. Opcja wyłączania wygaszania ekranu; ustawienia sygnałów; nie wprowadzać niekompatybilnych UI API.
**Odbiór:** wszystkie funkcje zachowane mimo ukrywania, przywracanie danych i aktualizator działają.

### Etap 6 — wydanie i weryfikacja
1. CI/testy jednostkowe/integracyjne, kompilacja i podpis; minSdk zgodny z API 22; v1 podpis do wsparcia Fire 5.
2. Nowy APK z kompletną nazwą i versionCode > 13; sprawdzenie SHA-256 i manifestu wydania.
3. Test ręczny na Fire 7: aktualizacja bez deinstalacji, trening 1–6, eksport/import, zdjęcia, rotacja, wygaszanie, urządzenie offline.
4. Opublikować link APK i listę zmian dopiero po udanym CI; status jawnie rozróżniać CI od testu fizycznego tabletu.

## Status realizacji
- [x] Wymagania i wszystkie 42 decyzje użytkownika
- [x] Podstawowe rozpoznanie modułów i gałęzi Lite
- [ ] Etap 0 — testy ochrony danych
- [ ] Etap 1 — Start i profile
- [ ] Etap 2 — trening grupowy
- [ ] Etap 3 — Plan i Moje ćwiczenia
- [ ] Etap 4 — Historia/Postępy
- [ ] Etap 5 — Ustawienia
- [ ] Etap 6 — CI, podpisany APK, test na Fire
- [ ] Lite 0.4.0 gotowy do instalacji

**Następne konkretne zadanie:** Etap 0, potem Etap 1. Nie podbijać wersji na sam plan.
