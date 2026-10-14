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

## Etap 02 — trening maksymalnie 6 osób (Lite 0.3.3)

- Dla Lite kopiowany jest **oryginalny moduł Trenera 2** `v086-one-phone.js`, a `patch-group-six.cjs` modyfikuje wyłącznie kopię w APK; pełny Trener 2 i gałąź `main` są nietknięte.
- Zapisywana grupa 2–6 uczestników; stałe identyfikatory, osobne serie i historia.
- Na rozpoczęciu wybór **wspólnego planu** lub **oddzielnych planów** dla uczestników. Indywidualny plan można wybrać pod rozwijaną sekcją uczestnika; można też ustawić indywidualny cel powtórzeń/serii na bieżącą sesję.
- Osobny indeks ćwiczenia i osobny odpoczynek dla każdej osoby, wybór następnej gotowej osoby, możliwość pominięcia kolejki albo pominięcia ćwiczenia tylko jednej osoby.
- Ciężary zapisują się z `participantId`; sugestie ciężaru są pobierane z historii wyłącznie tej osoby. To podstawowe reguły pełnego Trenera (dodaj/zostaw/zmniejsz), a nie kompletny nowy algorytm adaptacyjny z RIR i deloadem.
- Zapis stanu grupowej sesji (plany, ukończone serie, liczniki, pominięcia) i wznowienie po restarcie; wcześniejsze snapshoty wspólnego treningu pozostają obsługiwane.
- Ekran aktualnie ćwiczącej osoby oraz przewijalna lista statusu pozostałych; ciemno-czerwony motyw zachowany. Układ i czytelność na fizycznym Fire nadal wymagają potwierdzenia.
- **Nie jest wdrożony** osobny kalendarz tygodniowy każdej osoby ani automatyczne sugestie dodatkowych serii / deload (osobne etapy). Nie ma jeszcze katalogu rzeczywistych talerzy i gryfów.
- Testy: `node --test lite/tests/group-six.test.cjs` oraz regresje dotychczasowych funkcji.

## Etap 03 — realny katalog obciążeń (Lite 0.3.4)

**Gdzie:** Ustawienia → **Mój sprzęt → Gryfy i talerze** oraz panel **Mój sprzęt → Dobór obciążenia** przy zapisywaniu serii.

- Użytkownik dodaje dowolną liczbę rodzajów talerzy oraz gryfów z ich masą w kg i **liczbą pojedynczych sztuk**. Dla gryfu można określić rodzaj (gryf hantli / gryf sztangi / hantla stała), masę jednej sztuki, liczbę sztuk, opcjonalną średnicę mocowania i maksymalne obciążenie.
- **Pusty katalog przy instalacji**: nie wstawiamy domyślnie fikcyjnych 20-kilogramowych sztang ani wymyślonych talerzy.
- Wspólne zasoby wszystkich osób na tablecie. Jedna sztangielka wymaga symetrycznych talerzy w parach (2 sztuki), dwie sztangielki jednocześnie wymagają **4 identycznych talerzy** na jeden krok z obciążeniem po jednej sztuce z każdej strony każdego gryfu.
- Automatyczny kalkulator uwzględnia masę gryfu, liczbę gryfów, skończony zapas talerzy, symetrię, opcjonalnie ich średnicę oraz deklarowaną nośność gryfu. Jest wspólny dla całej grupy, ale **wynik podawany jest na jedną hantlę**, a nie jako suma obu.
- Po wyborze ćwiczenia można zaznaczyć „jedna sztangielka”, „dwie sztangielki”, „sztanga”, „jedna lub dwie hantle stałe”, a także konkretny gryf. Wybór jest zapamiętywany per ćwiczenie.
- Jeśli progresja sugeruje niewykonalny cel, kalkulator wybiera **najwyższy fizycznie osiągalny ciężar, który nie przekracza zalecanego**, albo nie wstawia automatycznie ciężaru i pokazuje ostrzeżenie. Użytkownik może ręcznie wpisać inną wartość, ale panel ją weryfikuje.
- Dokładna instrukcja montażu: rodzaj/masa/liczba talerzy **na każdą stronę gryfu** oraz maksymalna wykonalna masa. Przy braku podanej średnicy lub nośności wyświetlane jest ostrzeżenie — kalkulator nie zastępuje oceny bezpieczeństwa realnego sprzętu.
- Dla przykładu 8 talerzy × 2,5 kg i 2 gryfy po 2 kg: maksymalnie 12 kg na jedną hantlę, po 2 talerze 2,5 kg na każdej stronie, i możliwe skoki 5 kg na hantlę, nie 2,5 kg.
- W pełnym Trenerze 2 nie zmieniamy modułu `v060-equipment.js`; w pakiecie Lite 0.3.4 został wyłączony, ponieważ jego dwa domyślne zestawy sztang mogły sugerować sprzęt, którego użytkownik nie posiada. Oryginalne dane `trainer3.equipment.v060` pozostają nienaruszone.
- Katalog Lite zapisany pod `trainer3.lite.inventory.v034`, powiązania z ćwiczeniem pod `trainer3.lite.inventory.exercise.v034`; oba klucze należą do kompletnej kopii JSON. Import z etapu 01 nie nadpisuje istniejącego katalogu przy konflikcie.

**Świadome ograniczenia:** brak magazynu „co aktualnie jest nakręcone na gryfach” i automatycznego śledzenia ich bieżącego położenia. Program oblicza instrukcję jak złożyć ciężar od zera, nie operację przełożenia w czasie rzeczywistym. Weryfikacja kompatybilności średnic/nośności jest wiarygodna wyłącznie po podaniu tych danych. Przed odbiorem produkcyjnym wymagany test działania na rzeczywistym Amazon Fire OS 5.
