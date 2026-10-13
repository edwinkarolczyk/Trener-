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
