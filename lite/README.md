# Trener 2 Lite — tablet Amazon Fire OS 5 / Android 5.0+

Wersja 0.3.0 naprawia błąd architektoniczny wersji 0.1–0.2: zamiast niezależnej imitacji Trenera 2, Lite buduje swój interfejs i logikę z tych samych plików źródłowych co pełny Trener 2 na gałęzi głównej.

## Co jest wspólne z pełnym Trenerem 2

- Oryginalne `app.js`, `feature-loader.js` i skrypty treningowe z `app/src/main/assets`; te same algorytmy treningów, planów i historii.
- Oryginalny `style.css` (czarny / grafitowy / czerwony) bez wymyślania nowego motywu.
- Progresja, planista tygodniowy, trening kilku osób na jednym tablecie, biblioteka ćwiczeń, własne ćwiczenia, historia, RIR, przerwy, rekordy — ładowane z oryginalnych plików.
- `lite-tablet.css` zwiększa kontrolki pod obsługę dotykową, nie przedefiniowuje funkcjonalności.
- Pominięte są moduły diety, produktów żywieniowych, wody, przepisów i ich widoczne zakładki.

## Kompatybilność i dane

- Android `minSdk 21` — cel: Android 5.0+, w tym Fire OS 5.
- Babel + core-js tłumaczą nową składnię i polyfillują funkcje JavaScript dla starego WebView.
- Lite ma oddzielny pakiet `pl.edwin.trener2lite`, ale podpisuje APK trwałym certyfikatem poprzednich wersji Lite.
- Dotychczasowa baza `trener_lite.db` 0.1/0.2 pozostaje na urządzeniu. Przy pierwszym otwarciu nowy ekran kopiuje historię sesji (w tym jakość, RIR i ból) do formatu `trainer3.history`; oryginały SQLite nie są usuwane.
- Z Ustawień można ponownie otworzyć poprzedni natywny ekran Lite, żeby zweryfikować dane.
- Eksport/import pełnej kopii treningowej JSON, z pominięciem danych dietetycznych.
- Przycisk ręcznego sprawdzania aktualizacji i powiadomienia o podpisanym APK.

## Zasady testów i ograniczenia

1. CI powinno potwierdzić wygenerowanie źródeł pełnego silnika, poprawną składnię, testy regresyjne i podpisane APK dla API 21.
2. Konieczny jest test na fizycznym Amazon Fire: otwarcie zakładek, trening solo, wspólny tryb jednego tabletu, historia, planowanie tygodniowe, import pełnej kopii, restart w czasie serii i zachowanie danych po aktualizacji.
3. Tryb wspólnego treningu na **dwóch urządzeniach przez LAN/QR** wymaga osobnego natywnego mostka; nie deklarować pełnej zgodności tego trybu w Lite.
4. Starszy Android WebView może różnić się obsługą CSS i niektórych API. Nie nazywać tej wersji potwierdzonym portem 1:1 przed testem runtime.

## Budowa

```sh
cd lite
npm install --no-save --no-package-lock --ignore-scripts @babel/core @babel/preset-env core-js-bundle
cd ..
gradle :lite:testDebugUnitTest :lite:assembleRelease
```

Źródłem wspólnego kodu pozostaje `app/src/main/assets`; narzędzie `lite/scripts/build-parity-assets.cjs` podczas budowy transpiluje kopię bez zmieniania pełnej aplikacji. Wydania publikowane przez `.github/workflows/build-lite.yml`. Nie modyfikować `main` podczas prac nad Lite.

## Rekordy siłowe Lite 0.3.1

- W zakładce **Postępy** jest wybór uczestnika i ćwiczenia oraz dwie akcje: **Szacowany maks (e1RM)** i **Test rzeczywistego 1RM**.
- e1RM wykorzystuje własną historię uczestnika (wzór Epleya dla 2–10 powtórzeń). To szacunek, nie zarejestrowany rekord. Pojedyncze powtórzenie daje rzeczywistą wartość z treningu, ale jako osobny pomiar PR trzeba je świadomie zapisać.
- Test rzeczywistego 1RM zapisuje się **dopiero po udanej próbie**, z potwierdzeniem poprawnej techniki, braku bólu i niezbędnej asekuracji, zwłaszcza na ławce. Dane rekordu są odrębne od zwykłych serii i nie zmieniają ich historii ani algorytmu progresji.
- Domyślnie aplikacja pyta o możliwość sprawdzenia rekordu **co 8 tygodni** dla poszczególnych osób. Można wybrać 4 / 6 / 8 tygodni albo wyłączyć przypomnienia. Opcja **Przypomnij za 7 dni** nie uruchamia testu i nie kasuje wyników.
- Przypomnienia są pokazywane w aplikacji na ekranie Start, **nie** jako alarm systemowy przy wyłączonej aplikacji. Podczas treningu nie zasłaniają zapisu serii.
- Informacja o weryfikacji wykonalności ciężaru z własnymi talerzami/gryfami to odrębny etap — w tej wersji nie ma jeszcze algorytmu montażu talerzy.
- Nowe dane rekordu mają klucz `trainer3.lite.pr.v1` i są zbierane w dotychczasowej kopii treningowej JSON. Aktualizacja nie usuwa wcześniejszych profili ani serii.
- Testy: `node --test lite/tests/pr-core.test.cjs`; dodatkowo walidacja składni przetranspilowanego kodu w CI.

## Etap 01: ochrona danych — Lite 0.3.2

**Wdrożone do gałęzi Lite, kontrola na fizycznym Fire OS 5 pozostaje wymagana:**

- Odczyt starej bazy `trener_lite.db` przez `LiteLegacyExport` w trybie **READONLY**; brak dopisywania tabel i brak zależności od obecności wszystkich tabel rozszerzeń.
- Automatyczna, idempotentna migracja starej historii SQLite do historii wspólnego silnika. Nowy znacznik sukcesu dopiero po bezpiecznym zapisie; przy błędzie można ponowić, a stara baza pozostaje nietknięta.
- Eksport JSON obejmuje wartości `trainer3.*`/`trainer2.*` z historią, zdjęciami, planami i rekordami, oraz oryginalne tabele starego Lite w `legacyLite` (o ile plik bazy istnieje). Kopia zawiera osobne pola danych, ale jest jednym plikiem.
- Import przez Android **nigdy nie uruchamia teraz domyślnego nadpisującego `TrenerBackup.nativeImport`**: otwiera podgląd `TrenerLiteData.previewImport`, pokazuje liczbę nowych/zdublowanych/konfliktujących rekordów i wymaga potwierdzenia.
- Wybór: **Cała kopia** lub **Tylko jedna osoba** (gdy kopia ma identyfikatory uczestników). Import wybranej osoby oddziela wyłącznie jej serie i nie przenosi cudzych.
- Historia i rekordy są scalane po stałych identyfikatorach; przy tym samym ID i innej treści bieżący wpis wygrywa, konflikt jest liczony. Brak cichego nadpisania.
- Istniejące ustawienia i plany pozostają niezmienione; import dodaje brakujące klucze i wybrane listy. Jeśli obydwie kopie mają różne plany pod jednym kluczem, import **nie połączy automatycznie konfliktujących definicji**, ale pokaże liczbę pominiętych kluczy.
- Zapis kilku kluczy ma rollback w przypadku błędu pamięci; jeśli system odmówi również przywrócenia danych, wyświetlany jest jawny komunikat krytyczny. Nie jest to atomowa transakcja SQLite: przed importem nadal zaleca się eksport.
- Usunięto `slice(0,100)` z najważniejszych ścieżek zapisu historii Lite; nie ograniczamy historii do ostatnich 100 sesji przy normalnym zapisie.
- Import zablokowany, gdy aktywny jest ekran treningu; dieta i woda celowo wyłączone.
- Testy: `node --test lite/tests/data-safety.test.cjs lite/tests/pr-core.test.cjs`, składnia WebView po transpilacji i testy Android Gradle z CI.

**Ograniczenia:** pojedynczy JSON ma limit 12 MB; rozmiar lokalnego WebView może ograniczać ilość zdjęć. Brak fizycznego testu na Amazon Fire, dlatego nie ogłaszać pełnej zgodności z jego WebView. Podczas eksportu wykonaj kopię poza urządzeniem; do wydania stabilnego potrzebne są testy importu na faktycznym tablecie.
