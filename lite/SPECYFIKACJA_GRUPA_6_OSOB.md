# Trener 2 Lite — specyfikacja funkcjonalna 1 tablet / 1–6 osób

**Status:** zatwierdzony kierunek na podstawie 23/30 odpowiedzi; dodatkowo katalog posiadanego sprzętu i czytelny ekran Fire, szczegóły 12 pytań do doprecyzowania.  
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

## 10. Dodane wymaganie — katalog sprzętu i wykonalna progresja

**Potwierdzone co do kierunku:** użytkownik chce sam rejestrować talerze i gryfy. Przykład: **8 talerzy po 2,5 kg oraz 2 gryfy sztangielek**. Algorytm Trenera musi filtrować proponowane ciężary przez to, co można rzeczywiście zmontować. Parametry przykładu to nie zatwierdzony magazyn.

- Edytowalny katalog elementów: kategoria (talerze, gryf hantli, gryf sztangi, stałe hantle, inne), masa *jednej sztuki*, liczba sztuk, nazwa; opcjonalne średnica i kompatybilność, limit masy, miejsce montażu oraz typ potrzebnego zestawu (jedna hantla, dwie hantle, sztanga).
- Gryfy posiadają własną masę: **masa hantli = masa jej gryfu + masa wszystkich założonych talerzy**. Nie przyjmować masy gryfu 0 bez potwierdzenia.
- Rozkład talerzy na gryfie ma być symetryczny; ćwiczenia z dwiema hantlami wymagają pary identycznie obciążonych gryfów. Zapas talerzy liczyć **łącznie**, a nie osobno na każdy gryf.
- Silnik progresji pełnego Trenera 2 nadal oblicza docelowy ciężar dla *konkretnej osoby*. Warstwa sprzętu wylicza osiągalne obciążenia z magazynu i proponuje najbliższe odpowiednie, z informacją dlaczego docelowy skok nie jest wykonalny. Nie wymuszać zwiększenia ciężaru ponad bezpieczny plan.
- Jeśli brakuje odpowiednich talerzy, poinformuj „Nie można zmontować tego ciężaru — pozostaw obecny i realizuj progresję powtórzeń”. Pozwól odblokować ręczny wpis, ale wyróżnij ciężar spoza magazynu.
- Pokazuj opcjonalnie „na lewą i prawą stronę każdego gryfu” i zmianę talerzy po zmianie ćwiczącego. Katalog można edytować bez zmiany zapisanej historii.
- Wspólna sesja = wspólny sprzęt; jedna osoba wykonuje serię w danej chwili, a pozostali mogą odpoczywać równolegle. Pamięć bieżących obciążeń na gryfach jest do ustalenia.
- Testy poprawności: ujemne masy i ilości, nieparzysty niesymetryczny montaż, niewystarczające talerze, brak drugiego gryfu, mieszanie średnic, przeciążenie gryfu i przypadek dwóch osób.

**Przykład z 8 × 2,5 kg = 20 kg talerzy łącznie:** na dwóch gryfach jednocześnie maksymalny równy symetryczny rozkład to **4 talerze na gryf**, po 2 z każdej strony — zatem **10 kg talerzy + masa gryfu na pojedynczą hantlę**. Symetryczne dodanie po jednym talerzu na stronę *jednej* hantli daje przyrost **5 kg na hantlę**. Nie sugerować +2,5 kg na hantlę jako wykonalnego przy samych talerzach 2,5 kg.

## 11. Dodane wymaganie — maksymalna przejrzystość ekranu Amazon Fire

**Potwierdzone:** zachować oryginalny ciemno-czerwony motyw Trenera 2, ale układ ma być prosty i bardzo czytelny na Fire OS 5.

- Jeden główny panel aktywnej osoby: imię, ćwiczenie, serie, cel, ostatni/sugerowany ciężar, duże pole kg i przycisk **ZAPISZ SERIĘ**.
- Zwarta lista maksymalnie 6 osób poniżej/obok (zależnie od szerokości): nazwisko/imię, bieżące ćwiczenie, ukończone serie, niezależny licznik odpoczynku, status.
- Nie pokazywać sześciu pełnych formularzy na raz. Dodatkowe dane (historia, układ talerzy, wykres) po rozwinięciu/kliknięciu.
- Duże kontrolki (docelowo co najmniej około 56–64 dp), czytelne kg, sprawna numeryczna klawiatura, działanie po obróceniu ekranu i przy małej szerokości, bez poziomego przesuwania treści.
- Zielony = gotowy/postęp, żółty = odpoczynek/uwaga, czerwony = błąd/ból; zawsze z tekstem statusu.
- Ograniczenia starego WebView Fire OS 5: CSS/JS z fallbackami i test fizyczny przed wydaniem.
- Przyciski PAUZA, ZAPISZ, CZEKAJ/POMIŃ mają pozostać łatwo dostępne.

## 12. Do uzupełnienia w ankiecie

Pierwotne pominięte pytania: **14, 18, 19, 24, 26, 27, 28** — poprzednie propozycje domyślne nie są zatwierdzone.

Nowe pytania o sprzęt: **31. poziom szczegółowości katalogu; 32. masa gryfu; 33. rozkład talerzy; 34. pamięć aktualnego montażu; 35. niewykonalna sugestia progresji.**

**Stan:** specyfikacja w repozytorium, jeszcze bez implementacji tych nowych wymagań i bez wydania APK.

## 13. Aktualizacje automatyczne i okresowe testy rekordów (PR / 1RM)

**Aktualizacje — zachować obecne działanie:** `LiteFullActivity.onCreate` wywołuje `LiteUpdater.check(false)`; `LiteUpdater` sprawdza manifest przy otwarciu aplikacji, z odstępem co najmniej 12 godzin, pokazuje ofertę nowej wersji i instaluje dopiero po potwierdzeniu. Zachować weryfikację SHA-256 i podpisu, istniejący pakiet i dane. Sprawdzanie w tle przy zamkniętej aplikacji NIE jest obecnie wdrożone — nie deklarować go.

**Nowa propozycja użytkownika:** test maksymalnego ciężaru np. na ławce co jakiś czas. Dodać opcjonalny program rekordów dla każdej osoby i każdego ćwiczenia.

- Oddzielić `rzeczywisty 1RM` (jedno rzeczywiście ukończone poprawne powtórzenie) od `szacowany e1RM` (obliczony z wielopowtórzeniowych serii). Nigdy nie przedstawiać estymacji jako zmierzonego maksa.
- Osobne rekordy `participantId + exerciseId + wariant sprzętu`, data, kg, powtórzenia, forma, uwagi, warunki asekuracji. Przy hantlach doprecyzować jednostkę: masa jednej hantli czy łącznie.
- e1RM można aktualizować po zwykłym treningu; dla serii wielopowtórzeniowych użyć jawnego, ograniczonego zakresu wiarygodności (np. 2–10 powtórzeń). Historia trendu i ostatni rekord w panelu osobistym.
- Co zadany okres (propozycja: co 6–8 tygodni, nie zatwierdzono) pokazywać dyskretną opcję „Sprawdź rekord?”, z przyciskiem **Pomiń**. Brak przymusu testu, bez wpływu na zwykłą progresję.
- Test rzeczywistego maksimum na ławce nie startuje automatycznie, wymaga świadomego wyboru i asekuranta. Wstępna rozgrzewka, wzrastające serie przygotowawcze, przerwy i prawo przerwania; przy bólu lub złej technice nie proponować kolejnej cięższej próby. Sugerować szacowany e1RM jako mniej ryzykowną alternatywę.
- Proponowany ciężar rekordu musi być **fizycznie osiągalny z zarejestrowanych talerzy i gryfów**; nie przekraczać zgodności i ograniczeń sprzętowych.
- Rekord należy do osoby, nie całej grupy. Można zaznaczyć uczestnika i ćwiczenie oraz sprawdzić wcześniejsze próby.
- Przy testach regresji upewnić się, że próbne / rozgrzewkowe serie nie deformują reguł doboru zwykłej objętości treningowej i że odrębny PR przechodzi przez kopię zapasową oraz import bez duplikacji.
- W aktualnej wersji wykryte są już historyczne rekordy **największego użytego ciężaru w serii** w `app.js` i wykresy `v061-progress-charts.js`, ale nie są one równoznaczne z dedykowanym testem 1RM.

**Do rozstrzygnięcia:** częstotliwość przypomnień i czy testy rzeczywiste 1RM mają być włączone domyślnie czy opcjonalnie na życzenie.

## 14. Decyzja i wdrożenie Lite 0.3.1 — wybór dwóch testów rekordu

Użytkownik zdecydował: **oba tryby mają być dostępne do wyboru**, a Lite ma co jakiś czas pytać o sprawdzenie rekordu.

- **Szacowany rekord e1RM** z wcześniejszych zwykłych serii — wzór Epleya, zakres 1–10 powtórzeń; jedno powtórzenie = wykonany ciężar, lecz etykieta e1RM jest jedynie analizą, dopóki użytkownik nie zapisze rzeczywistego PR.
- **Test rzeczywistego 1RM** — użytkownik uruchamia sam, zapisuje ciężar dopiero po pomyślnej próbie i potwierdza asekurację / technikę / brak bólu. Historia testów oddzielona od zwykłych treningów.
- Przypomnienie **co 8 tygodni** domyślnie; wybór 4/6/8 tygodni albo bez przypomnień; przycisk odroczenia na 7 dni. Działa osobno dla każdej osoby z zapisanej grupy, bez przerywania aktywnego treningu.
- W tej iteracji przypomnienie jest wewnątrz aplikacji i pojawia się po jej otwarciu. **Nie ma powiadomienia Android przy zamkniętej aplikacji.**
- Zasady instalacji Lite bez zmian: weryfikacja nowej wersji przy uruchomieniu (limit co 12 h), informacja z listą zmian i zatwierdzenie pobrania.
- Kod: `lite/scripts/lite-pr-core.js` + `lite/scripts/lite-pr.js`, dodane do wygenerowanego WebView przez `lite/scripts/build-parity-assets.cjs`. Testy w `lite/tests/pr-core.test.cjs`.
- Brak walidacji realnie dostępnych talerzy/gryfów w tej funkcji do czasu realizacji katalogu sprzętu. Nie wolno twierdzić, że już filtruje wykonalne próby.

**Status:** funkcja dodana do kodu gałęzi Lite, wymaga pozytywnych testów CI i rzeczywistego sprawdzenia na Fire OS 5 przed uznaniem za stabilną.

## 15. Etap 02 — stan implementacji Lite 0.3.3

- W kopii oryginalnego silnika `v086-one-phone.js` na potrzeby Lite zwiększono limit z 4 do 6 uczestników.
- `lite-group-core.js` prowadzi niezależne pozycje w różnych planach, różne liczby serii, niezależny odpoczynek i sprawiedliwy wybór gotowej osoby.
- Dopasowanie ciężaru do zapisanej historii odbywa się po trwałym identyfikatorze uczestnika, nie numerze osoby w bieżącej kolejce.
- Użytkownik może wybrać wspólny lub indywidualny plan i sesyjne cele serii/powtórzeń, pominąć kolejkę lub ćwiczenie jednej osoby.
- Checkpoint sesji obejmuje plany, pozycje, zapisane serie, pominięcia, odpoczynek i identyfikatory. Starszy snapshot `v086` ma ścieżkę wstecznej zgodności.
- **Nie rozwiązuje jeszcze** automatycznej tygodniowej rotacji planów osób, pełnego adaptacyjnego modelu objętości/RIR/deload, ani doboru ciężaru z posiadanych talerzy (następne etapy).
- Konieczne są testy rzeczywistego WebView i 6-osobowej sesji na Fire OS 5; zielone CI dowodzi kompilacji i testów automatycznych, nie wszystkich interakcji.

## 16. Etap 03 — stan kodu Lite 0.3.4

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
