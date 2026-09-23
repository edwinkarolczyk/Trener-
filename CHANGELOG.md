## 0.9.1 — przepisy połączone z Trenerem 2

- Zachowano 50 przepisów i jadłospis na 30 dni (3 lub 4 posiłki).
- Dodano instrukcje przygotowania i wyjaśnienie gramatury surowych składników.
- Przepisy pozostają osobnym modułem; cele i historia Diety nie są automatycznie nadpisywane.
- Zgodność aktualizacji i zapisów starszych wydań podlega testom przed udostępnieniem.

## 0.9.0 (feature preview) — odrębna zakładka Przepisy

- Osobna zakładka obok Diety, kalkulator zapotrzebowania, 50 bazowych przepisów i przykładowy 30-dniowy plan na 3 lub 4 posiłki.
- Odizolowany klucz danych `trainer2.recipes.v1`; bez modyfikacji historii, celów Diety, treningów ani widgetów.
- Szacunki kalorii oparte na BMR Mifflina i deklarowanej aktywności; proporcje dopasowywane do wybranego celu. Informacja o niepewności i obserwacji trendu masy.
- Wymagane testy aplikacji na telefonie i weryfikacja gramatur oraz makro przed udostępnieniem APK; `main` i zamrożona gałąź 0.8.9.5 pozostają bez zmian.

## 0.8.9.5 (beta) — stabilizacja ergonomii telefonu

- Większe i czytelniejsze pola kg/powtórzeń, etykiety i kafelki postępu serii; wyraźny fokus aktualnie edytowanego pola.
- Dolny panel zegarów i postępu nie zasłania pól podczas wpisywania wyniku; po wyjściu z pól wraca.
- Android dostosowuje wysokość aktywności do otwartej klawiatury, aby pola nie były zasłaniane (w obu aktywnościach).
- Przyciski zapisu, instrukcji i sterowania treningiem mają większe cele dotykowe, bez ponownego blokowania przewijania.
- Dieta: większe cele dotykowe posiłków, wygodniejsze formularze w wysuwanym panelu, czytelniejsze nazwy i wartości; cztery paski pozostają.
- Bez nowych modułów, zmiany zapisu, migracji, przeliczania kalorii ani zmian protokołu wspólnego treningu. `main` bez zmian.
- Test regresji ergonomii i wszystkie dotychczasowe testy w procesie APK; pełna walidacja dotykowa na telefonie pozostaje obowiązkowa.

## 0.8.9.4 (beta) — stabilizacja zapisu Diety

- Usunięto automatyczne obcinanie starszych posiłków po 1500 wpisach i zakupów po 300 wpisach.
- Wszystkie ścieżki zapisu Diety (zwykły posiłek, kreator składników, duplikowanie) zachowują pełną historię.
- Nieudany zapis nie czyści formularza posiłku ani nie zgłasza sukcesu; dotychczasowe dane pozostają zapisane.
- Test regresji sprawdza 1602 posiłki, 322 zakupy i błąd zapełnionego magazynu danych.
- Import kopii zapasowej nie pozostawia mieszanego stanu danych po błędzie w połowie zapisu: przywraca poprzednie wartości albo jawnie zgłasza problem z przywróceniem.
- Puste i nieprawidłowe kopie są odrzucane przed zapisem; test regresji sprawdza wycofanie zmian, prawidłowy import i brak restartu po błędzie.
- Schemat danych pozostaje v1, klucz `trainer3.diet.v076` bez zmian, `main` bez zmian.
- Przed zakończeniem stabilizacji wymagane są jeszcze testy praktyczne na telefonie, szczególnie aktualizacji, Diety i wspólnego treningu.

## 0.8.9.3 (beta) — wspólny motyw kolorystyczny Diety

- Dieta korzysta z tych samych czarnych i antracytowych teł, obramowań i czerwonych przycisków co pozostałe zakładki Trenera 2.
- Ujednolicono panel dodawania posiłku, zaznaczoną kartę panelu, wodę, kafelki posiłków i przycisk „Dodaj posiłek”.
- Zachowano cztery odróżnialne kolory pasków makro oraz układ widoku Diety.
- Bez zmian danych, obliczeń, historii, importu, migracji i schematu zapisów; `main` bez zmian.

## 0.8.9.2 (beta) — wspólna nawigacja, zachowane dane

- Przywrócono klasyczny nagłówek TRENER 2 i sześć górnych zakładek w całej aplikacji, również w Diecie.
- Usunięto oddzielny dolny pasek Diety. Nowe karty bilansu, cztery paski makro, woda, posiłki i kreator nadal działają.
- Zachowano identyfikator aplikacji, klucz `trainer3.diet.v076`, schemat danych diety, historię, gramatury, ustawienia i istniejące kopie zapasowe.
- Zmiana dotyczy wyłącznie gałęzi beta; bez zmian w `main`.

## 0.8.9.1 (beta) — stonowana kolorystyka Diety

- Grafitowe tło i karty, subtelniejsze obramowania oraz spójny kontrast tekstu.
- Cztery stałe, mniej jaskrawe kolory makro: kalorie #5BCB7A, białko #63A8F8, węglowodany #E6BE55, tłuszcz #EE915C.
- Woda #58BEDC, spokojniejszy badge pozostałych kalorii oraz czerwony stan przekroczenia.
- Dolna nawigacja ma jednobarwne ikony liniowe i stonowany aktywny element.
- Bez zmiany danych diety, gramatury, obliczeń, układu ani czterech pasków przy każdym posiłku.
- Tylko gałąź beta; bez zmian w main.

## 0.8.9.0 (beta) — Dieta według zatwierdzonego projektu

- Przebudowany ekran Diety: bilans dzienny, cztery wskaźniki makro, woda, chronologiczne posiłki i duży przycisk dodawania.
- Każdy posiłek ma zawsze widoczne cztery kolorowe paski: kcal, białko, węglowodany i tłuszcz względem celu dnia.
- Szczegóły składników pod posiłkiem, menu dotykiem/przytrzymaniem, edycja, duplikowanie, ulubione i usuwanie.
- Przesuwanie posiłków z zapisem kolejności wybranego dnia; sortowanie chronologiczne, od najnowszych i wg kalorii.
- Jeden wysuwany panel z wyszukiwarką, ostatnimi, ulubionymi, kreatorem składników oraz skanerem kodów.
- Cele, historia, lista zakupów i nawodnienie w pomocniczym panelu, bez usuwania ich danych.
- Dolna nawigacja wyłącznie w Dietcie; pozostałe ekrany zachowują dotychczasowe zakładki.
- Miniatury produktów z Open Food Facts wyłącznie z oficjalnego hosta i zastępcza ikonka dla pozostałych wpisów.
- Testy regresji sumowania posiłków, 4 pasków, sortowania, nieustawionego celu i zdjęć.
- Gałąź `main` bez zmian. Zachowano istniejący format danych diety i kopie zapasowe.

## 0.8.8.5 (beta)

- Wiersze posiłków pokazują cztery paski: kcal, białko, węglowodany i tłuszcz względem indywidualnych celów dnia; brak celu nie jest pokazywany jako 0%.
- Złożony posiłek zapisuje składniki i sumuje wartości tylko raz; edycja gramów poszczególnych składników przelicza kcal i makro.
- Po wybraniu produktu z bazy można zmienić gramaturę na formularzu posiłku, zachowując przeliczenie z wartości na 100 g.
- Poprawiono zapis tekstowej porcji w pojedynczym posiłku; zachowano starsze wpisy.
- Dodano testy sumowania składników i przeliczania gramatury.

## 0.8.8.1
- Naprawa systemowego „Nie można wczytać widżetu” na części launcherów (zgłoszenie: Xiaomi). W czterech kaflach „Kalorie i makro” zastąpiono widoki Space bezpiecznymi dla Android RemoteViews elementami TextView.
- Pozostają układ 2×2, cele, wartości oraz paski makro. Zapis danych diety i innych widgetów bez zmian.
- Dodano test wszystkich klas widoków w układzie widgetu: dozwolone wyłącznie LinearLayout, TextView i ProgressBar.
- Nie odinstalowywać aplikacji ani nie czyścić jej danych; jeśli launcher zachowa błędną instancję widgetu, usunąć wyłącznie widget z pulpitu i dodać go ponownie.
- Wersja 0.8.8.1, versionCode 75.

## 0.8.8
- Oddzielono dwa widgety Androida: duży „Kalorie i makro” i mały „Woda”. Nie trzeba tworzyć kolejnego widgetu wody w samej aplikacji.
- „Kalorie i makro” odtwarza bilans dnia z Diety: cztery kafle 2×2 (kalorie, białko, węglowodany, tłuszcze), wartości, cele, pozostałą ilość lub przekroczenie i zielone paski. Pokazuje lokalną datę i tryb: Utrzymanie / Redukcja / Masa. Kliknięcie otwiera Dietę.
- „Woda” ma osobny stan i przyciski +100 / +250 / +500 ml. Kliknięcie przycisku aktualizuje nawodnienie bez uruchamiania aplikacji; dotknięcie tła otwiera Dietę.
- Synchronizacja Androida obejmuje komplet czterech makr i cele, nie tylko kalorie/białko. Aktualizacja po zapisie, edycji/usunięciu posiłku, zmianie celu i na nowy dzień; poza aplikacją systemowy widget odświeża się także okresowo i po zmianie daty.
- Dotychczasowa dieta, historia i konfiguracja wody zachowane. Istniejący diet widget zmienia wygląd na makro, osobny widget wody dodaje się przez ekran główny Androida.
- Wersja 0.8.8, versionCode 74.

## 0.8.7.1
- Naprawa sytuacji „telefon wykryty, ale połączenie na porcie TCP nie działa”: gniazdo powiązania i transferu używa właściwej trasy Wi-Fi zamiast domyślnej trasy danych komórkowych, gdy adres należy do sieci Wi-Fi.
- Usługi mDNS/NSD reklamują lokalny adres IPv4 telefonu i nadal zachowują oryginalny adres zwrócony przez Androida; próba TCP obejmuje oba adresy, jeżeli się różnią.
- Ponowne włączenie „Szukaj telefonów” uruchamia świeży nasłuch i ogłoszenie usługi na nowym porcie, zamiast trzymać stary adres po przełączeniu Wi-Fi/hotspotu.
- Po błędzie przycisk „POŁĄCZ” jest aktywny ponownie. Dodano ekran „Nie łączy? Diagnostyka połączenia” z lokalnym adresem Wi-Fi, celem/portem, źródłem połączenia i możliwością skopiowania raportu. Log starej sesji treningowej nie obejmuje tego osobnego kanału powiązania profili.
- Uporządkowano przestarzałą wzmiankę o ręcznym pliku JSON na ekranie wspólnego treningu. Powiązania i historie pozostają bez migracji ani resetowania danych.
- Wersja 0.8.7.1, versionCode 73.

## 0.8.7
- Nowe, opcjonalne wykrywanie innych Trenerów 2 w tej samej sieci Wi-Fi lub na hotspocie (Android NSD/mDNS); brak skanowania QR, ręcznego IP i wpisywania imion przy kolejnych treningach.
- Powiązanie profili za zgodą obu telefonów: dwa ekrany pokazują ten sam sześciocyfrowy kod do porównania (bez przepisywania), identyfikator profilu nie zależy od wyświetlanego imienia.
- W zakładce Start tryb „Wspólny 2–4 • jeden telefon” wybiera zapamiętanych uczestników z listy, zamiast wpisywać imiona ponownie. Nowy profil z pobliskiego telefonu dodaje się po powiązaniu; osoba bez telefonu pozostaje opcją ręczną.
- Po zakończeniu wspólnego treningu pojawia się przycisk „WYŚLIJ WYNIKI” lub „PÓŹNIEJ”; wysyłkę można też zlecić w Historii. Wyniki oczekują lokalnie, jeśli drugi telefon jest offline, i podejmują wysyłkę ponownie po wykryciu go w sieci.
- Osobny kanał sieciowy od trwającej sesji Wi-Fi; wyniki szyfrowane AES-GCM kluczem z jednorazowego powiązania ECDH i przypięte do sesji + uczestnika. Odbiorca potwierdza zapis; ponowne dostarczenie nie duplikuje treningu.
- Dane do ręcznego JSON pozostają w szczegółach jako awaryjna metoda. Sekrety parowania są przechowywane w prywatnej pamięci Androida, nie w eksporcie treningów; po przeniesieniu aplikacji może być konieczne ponowne powiązanie.
- Automatyczne wykrywanie wymaga działającej aplikacji na obu telefonach, wspólnej sieci lokalnej i uprzedniego włączenia funkcji. Sieci z izolacją urządzeń mogą blokować mDNS.
- Ochrona przed przypisaniem wyników innej osoby do profilu właściciela telefonu, także przy transferze w odwrotną stronę.
- Wersja 0.8.7, versionCode 72.

## 0.8.6
- Widget Diety Android: przycisk +100 ml obok +250 ml. Osobny PendingIntent i istniejący HydrationStore, dzięki czemu aktualizacja wody działa bez otwierania aplikacji.
- Nowy niezależny tryb „WSPÓLNY 2–4 • JEDEN TELEFON” bez Wi-Fi i bez roli HOST/GOŚĆ.
- Stabilny identyfikator każdego uczestnika, osobny ciężar, powtórzenia i liczba serii; wspólna kolejka z odpoczynkiem per osoba i przejściem do następnego ćwiczenia, gdy wszyscy ukończą aktualne.
- Zapis niedokończonej sesji i opcja wznowienia; zapisane serie przypięte do participantId i sessionId.
- Po treningu w Historii eksport wyniku konkretnej osoby do JSON, import na jej telefonie z jawnym potwierdzeniem powiązania tożsamości oraz ochroną przed ponownym dodaniem tej samej sesji.
- Przesłanie pliku to import po treningu, nie synchronizacja na żywo. Historie innych osób nie nadpisują historii właściciela telefonu.
- Wersja 0.8.6, versionCode 71.

## 0.8.5.1
- W Diecie dodano szybkie +100 ml wody obok +250, +330 i +500 ml.
- W powiadomieniu treningowym ŁYK WODY dodano +100 ml obok istniejących +150 i +250 ml.
- Użyto dotychczasowego mechanizmu zapisu nawodnienia, bez zmian formatu danych.
- Trening 2–4 osób na jednym telefonie pozostaje osobnym zadaniem: bieżący lokalny tryb obsługuje dwie osoby, natomiast pełna kolejka 2–4 należy do trybu sieciowego.
- Wersja 0.8.5.1, versionCode 70.

## 0.8.5
- Zamiast strzałek ↑/↓ w Diecie: uchwyt ⠿. Przytrzymaj go 1 sekundę, po czym przeciągnij i puść; podnoszenie kafla, płynne rozsuwanie innych kart i autoscroll przy brzegu ekranu.
- Mechanizm dotyczy kafli wszystkich sześciu głównych zakładek, bez przeciągania pomiędzy zakładkami; każda przechowuje osobną kolejność i stan zwinięcia.
- W czasie aktywnego treningu przestawianie kafli jest wyłączone na każdym ekranie. Przeciąganie działa wyłącznie z osobnego uchwytu, nie z pól treningowych czy nazwy sekcji.
- Migracja wcześniejszej kolejności Diety 0.8.4, zachowanie poprzednich posiłków, skanera i pozostałych danych; układ zapisuje się pod trainer3.cardLayout.v085 i jest objęty kopią.
- Wersja 0.8.5, versionCode 69.

## 0.8.4
- Polskie zapytania do USDA dla popularnych składników i pomocnicze polskie etykiety z zachowaniem pełnej nazwy oryginalnej.
- Przy odpowiedzi OFF 502/503/504 jednokrotne ponowienie zapytania i czytelny komunikat; wyniki USDA oraz własne produkty nadal dostępne.
- Karty Diety zwijane po kliknięciu nazwy; przyciski góra/dół zmieniają ich kolejność; układ zapisywany lokalnie i w kopii danych.
- Długa lista wyników ma niezależne przewijanie.
- Wersja 0.8.4, versionCode 68.

## 0.8.3
- dodano wyszukiwanie po nazwie w Diecie, łączące własną bazę produktów z Open Food Facts i opcjonalną USDA FoodData Central,
- wyszukiwanie online działa przez natywny, asynchroniczny moduł HTTP Androida; czas oczekiwania i wielkość odpowiedzi są ograniczone,
- USDA wymaga indywidualnego darmowego klucza API wpisanego na telefonie; klucz nie trafia do repozytorium ani eksportowanej kopii,
- dodano przeliczanie g/szt./ml z masą jednej sztuki lub gęstością g/ml zamiast domyślnego, błędnego przelicznika dla wszystkich płynów,
- można zapisać i usunąć własne produkty oraz poprawić kcal i makro / 100 g; własne produkty są objęte eksportem/importem danych,
- nowe produkty wstawiają przeliczone wartości do istniejącego formularza Diety bez zmiany formatu poprzednich posiłków,
- dodano edycję zapisanych posiłków, zachowując ich identyfikator, datę i historię; szybkie dodawanie nie nadpisuje edytowanej porcji,
- skaner EAN/UPC i dotychczasowe dane działają jak dotychczas; wersja 0.8.3, versionCode 67.

# Zmiany

## 0.8.2.12
- naprawiono miganie czerwonego przycisku GOŚCIA między `ZAKOŃCZ` i `POPROŚ O ZAKOŃCZENIE`; podczas wspólnego treningu ma jedną stałą etykietę `ZAKOŃCZ WSPÓLNY TRENING`,
- przycisk `ZAKOŃCZ WSPÓLNY TRENING` GOŚCIA zawsze trafia do `FINISH_REQUEST` i wymaga decyzji HOSTA,
- stary handler `v0635-duo-profile-finish` nie może już lokalnie zakończyć treningu GOŚCIA ani wysłać `DONE` po naciśnięciu wspólnego zakończenia,
- bazowy `app.js` nie może wysłać `LEAVE` ani zamknąć wspólnej sesji GOŚCIA ze zwykłej ścieżki STOP/finish; `LEAVE` pozostaje wyłącznie dla osobnego `OPUŚĆ WSPÓLNY TRENING`,
- `v074-safe-finish` przekazuje wspólny STOP GOŚCIA bezpośrednio do autoryzacji HOSTA przed uruchomieniem starszych handlerów,
- usunięto drugi renderer tekstu zielonego przycisku zapisu serii z `v070-beta-queue`; stan przycisku jest wyświetlany wyłącznie przez `v071-shared-ui-authority`, co usuwa miganie `CZEKAJ — <osoba>` ↔ `CZEKAJ NA SWOJĄ KOLEJ`,
- black box zapisuje dodatkowo `LEGACY_GUEST_STOP_REDIRECTED`, `BASE_GUEST_STOP_REDIRECTED` i `BASE_GUEST_FINISH_BLOCKED`, jeśli stara ścieżka próbuje przejąć zakończenie,
- wersja podniesiona do `0.8.2.12`, `versionCode 66`.

## 0.8.2.11
- GOŚĆ ma jednoznacznie rozdzielone akcje: `POPROŚ O ZAKOŃCZENIE` oraz `OPUŚĆ WSPÓLNY TRENING`,
- komunikat `LEAVE` może zostać wysłany wyłącznie z dedykowanego przycisku opuszczenia; ścieżka `ZAKOŃCZ` nie może już wywołać `LEAVE`,
- black box zapisuje `STOP_BUTTON_CAPTURED`, `GUEST_FINISH_CLICK`, pokazanie i wynik potwierdzenia GOŚCIA oraz `HOST_FINISH_MODAL_SHOWN`,
- HOST w tle dostaje ważne systemowe powiadomienie, gdy GOŚĆ prosi o zakończenie wspólnego treningu,
- zmiana ćwiczenia podczas aktywnego treningu pokazuje pełnoekranowy alert `NOWE ĆWICZENIE` z nazwą nowego ćwiczenia, mocnym sygnałem i wibracją,
- gdy aplikacja jest w tle, zmiana ćwiczenia generuje systemowe powiadomienie wysokiego priorytetu,
- black box zapisuje `EXERCISE_ALERT_SHOWN` wraz z poprzednim i nowym ćwiczeniem,
- `WYŚLIJ WSPÓLNY LOG MAILEM` scala wszystkie fragmenty black boxa należące do tego samego `sessionId`,
- scalony log ma `schemaVersion 2`, `completeSessionExport=true`, listę fragmentów, łączną liczbę zdarzeń i pełną chronologię sesji,
- wersja podniesiona do `0.8.2.11`, `versionCode 65`.

## 0.8.2.10
- przycisk `POMIŃ PRZERWĘ` działa również podczas wspólnego treningu,
- pominięcie przerwy w trybie wspólnym jest autorytatywne: GOŚĆ wysyła żądanie do HOSTA, a HOST aktualizuje `readyAt` uczestnika i rozsyła nowy stan kolejki,
- HOST weryfikuje `deviceId` uczestnika przed zaakceptowaniem żądania pominięcia przerwy,
- można pominąć własną przerwę także wtedy, gdy aktualnie ćwiczy inna osoba; uczestnik staje się wcześniej gotowy do następnego wyboru przez kolejkę,
- stały pasek `TWÓJ ODPOCZYNEK` pokazuje rzeczywisty czas własnej przerwy z kolejki HOSTA zamiast lokalnego `restEnd`,
- gdy własna przerwa nie trwa, cały kafelek `TWÓJ ODPOCZYNEK` znika zamiast stale pokazywać `GOTOWY`,
- dolny układ automatycznie zwija pustą kolumnę po ukryciu kafelka odpoczynku,
- wersja podniesiona do `0.8.2.10`, `versionCode 64`.

## 0.8.2.9
- HOST utrzymuje natywny high-performance `WifiLock` oraz częściowy CPU `WakeLock` przez cały czas hostowania sesji; blokady są zwalniane po rozłączeniu, przejściu do roli GOŚCIA i zamknięciu aplikacji,
- black box dopisuje stan blokad HOSTA do diagnostyki natywnej, aby było widać czy `WifiLock` i `WakeLock` były faktycznie aktywne,
- po `NETWORK_RESTORED` HOST czeka 2 sekundy na stabilny lokalny IP przed ponownym postawieniem serwera,
- jeśli po recovery HOST nadal nie ma żadnego partnera, watchdog po 12 sekundach ponownie stawia serwer na tym samym kodzie; kolejne oczekiwanie jest ponownie kontrolowane,
- black box zapisuje `HOST_IP_STABILITY_WAIT`, `HOST_IP_STABLE`, `HOST_IP_STABILITY_ABORT` i `HOST_NO_PEER_RESTART`,
- GOŚĆ nie może już sam zakończyć wspólnego treningu wszystkim: `ZAKOŃCZ` pyta `Wysłać prośbę do HOSTA o zakończenie wspólnego treningu?`,
- HOST dostaje duży modal `<imię> chce zakończyć wspólny trening.` z akcjami `ZAKOŃCZ DLA WSZYSTKICH` i `ODRZUĆ`,
- po odrzuceniu GOŚĆ dostaje komunikat `HOST odrzucił prośbę — ćwiczymy dalej 😄`,
- po akceptacji tylko HOST uruchamia autorytatywne zakończenie wspólnej sesji; GOŚĆ ma awaryjny lokalny fallback dopiero po otrzymaniu akceptacji HOSTA,
- GOŚĆ ma osobny przycisk `OPUŚĆ WSPÓLNY TRENING`; opuszczenie zapisuje jego wykonane serie lokalnie, usuwa go z kolejki i nie kończy treningu pozostałym osobom,
- przy 2–4 osobach komunikat `LEAVE` oznacza uczestnika jako `opuścił trening` i kolejka HOSTA przechodzi dalej bez blokowania sesji,
- wersja podniesiona do `0.8.2.9`, `versionCode 63`.

## 0.8.2.8
- w Historii przy diagnostyce wspólnej sesji przycisk `KOPIUJ WSPÓLNĄ SESJĘ` został zastąpiony przez `WYŚLIJ WSPÓLNY LOG MAILEM`,
- jednym kliknięciem aplikacja przygotowuje wiadomość mailową i dołącza pełny black box jako plik JSON,
- temat i treść maila identyfikują źródło logu: `Telefon 1/2/3/4`, rolę HOST/GOŚĆ, nazwę uczestnika, model telefonu, wersję aplikacji, lokalny IP, deviceId i sessionId,
- te same metadane są zapisywane w załączniku pod polem `exportedFrom`, więc log pozostaje jednoznaczny także po zapisaniu poza aplikacją,
- załącznik jest udostępniany bez nowych uprawnień do pamięci i bez odczytywania numeru SIM,
- retry pierwszego dołączania jest teraz uzbrajane również na natywnym statusie `connecting`, niezależnie od tego, czy wejście uruchomiono przyciskiem, QR czy inną ścieżką UI,
- black box zapisuje `INITIAL_JOIN_ARMED` oraz `SHARED_LOG_EMAIL_OPENED`,
- wersja podniesiona do `0.8.2.8`, `versionCode 62`.

## 0.8.2.7
- pierwsze dołączanie GOŚCIA ponawia połączenie również wtedy, gdy nigdy wcześniej nie było stanu `CONNECTED`,
- błędy chwilowe takie jak `EHOSTUNREACH`, timeout lub chwilowy brak trasy uruchamiają automatyczne próby 1 s → 2 s → 5 s → 10 s,
- pierwsze dołączanie jest ograniczone do czterech automatycznych ponowień po próbie użytkownika, aby aplikacja nie próbowała bez końca,
- po wyczerpaniu prób aplikacja pokazuje czytelny komunikat, że HOST jest niedostępny i należy sprawdzić IP/Wi‑Fi/status gospodarza,
- jeśli GOŚĆ straci własne Wi‑Fi podczas pierwszego dołączania, próby są wznawiane po powrocie lokalnego adresu IP,
- retry nie uruchamia się dla błędnego kodu, pełnej sesji, niezgodnej wersji, wykrycia różnych sieci ani braku Wi‑Fi/hotspotu,
- black box zapisuje `INITIAL_JOIN_RETRY_BEGIN`, `INITIAL_JOIN_RETRY_SCHEDULED` i `INITIAL_JOIN_RETRIES_EXHAUSTED`,
- wersja podniesiona do `0.8.2.7`, `versionCode 61`.

## 0.8.2.6
- reconnect GOŚCIA działa również w lobby po pierwszym udanym połączeniu, jeszcze przed rozpoczęciem treningu,
- po chwilowym zaniku Wi‑Fi aplikacja nie porzuca wspólnej sesji tylko zachowuje rolę, kod i dane potrzebne do ponownego połączenia,
- HOST wykrywa utratę lokalnego adresu IP jako osobny stan `BRAK SIECI` zamiast pozostawać w pozornym `waiting`,
- po powrocie poprawnego adresu IP HOST automatycznie stawia serwer ponownie na tym samym kodzie sesji i aktualizuje widoczny adres,
- GOŚĆ po powrocie własnej sieci automatycznie wraca do sekwencji reconnectu 1 s → 2 s → 5 s → 10 s,
- `disconnected_peer` natychmiast ustawia `connected=false`, dzięki czemu UI i black box nie pokazują już sprzecznego stanu,
- black box zapisuje `NETWORK_LOST`, `NETWORK_RESTORED`, `NETWORK_IP_CHANGED` i `HOST_RESTART_AFTER_NETWORK` wraz z diagnostyką natywnego transportu,
- stan nagłówka rozróżnia `BRAK SIECI`, `PRZYWRACAM…` i `RECONNECT…`,
- wersja podniesiona do `0.8.2.6`, `versionCode 60`.

## 0.8.2.5
- dodany pełny `black box` wspólnego treningu: połączenie, role HOST/GOŚĆ, wersje, sessionId, plan i hash planu, kolejka, serie, snapshoty, resync, przejścia aplikacji w tło oraz przyczyny rozłączeń,
- black box przechowuje automatycznie do 10 ostatnich wspólnych sesji i do 1500 zdarzeń na sesję, z dodatkowym limitem około 2,5 MB; najstarsze dane są nadpisywane automatycznie,
- natywna warstwa TCP zapisuje `EOF`, `SOCKET_EXCEPTION`, `IO_ERROR`, `WRITE_ERROR` i `MANUAL` wraz z peerem, liczbą wiadomości oraz czasem ostatniego RX/TX,
- heartbeat host–guest działa co 3 s; brak odpowiedzi przez około 9 s albo błąd wysłania heartbeat uruchamia reconnect,
- GOŚĆ po utracie HOSTA przechodzi w stan `WSPÓLNY TRENING WSTRZYMANY — RECONNECT…`; wykonane serie i sessionId zostają zachowane,
- automatyczny reconnect używa sekwencji 1 s → 2 s → 5 s → 10 s, a kolejne próby podczas aktywnego treningu są wykonywane co 10 s,
- po odzyskaniu połączenia wykonywany jest pełny resync stanu zamiast rozpoczynania treningu od początku,
- HOST po utracie uczestnika pozostaje serwerem i czeka na jego ponowne dołączenie; black box notuje także brak heartbeat konkretnego uczestnika,
- status `WIFI connected` jest logowany dopiero po aktualizacji stanu `connected=true`, więc log nie pokazuje już sprzecznego `connected / connecting false`,
- nagłówek wspólnej sesji pokazuje stan `RECONNECT…`,
- w Historii przy logach dostępne jest `KOPIUJ WSPÓLNĄ SESJĘ`; zwykłe `KOPIUJ LOGI` dołącza również najnowszy black box,
- identyczne cykliczne snapshoty/resynci są deduplikowane, aby diagnostyka nie zapychała pamięci i nie obciążała UI,
- wersja podniesiona do `0.8.2.5`, `versionCode 59`.

## 0.8.2.4
- nazwa aplikacji pod ikoną launchera jest stała: `Trener 2`; numer wersji nie jest już częścią nazwy aplikacji,
- wersja każdego uczestnika wspólnej sesji jest renderowana bezpośrednio w jego karcie,
- usunięto osobny timer dopisujący wersje uczestników co 250 ms, który powodował miganie wersji HOSTA,
- lista uczestników nie jest ponownie podmieniana w DOM, jeśli jej zawartość faktycznie się nie zmieniła,
- wersja podniesiona do `0.8.2.4`, `versionCode 58`.

## 0.8.2.3
- poprawiono możliwe zawieszanie WebView po wejściu w pola `Ciężar [kg]` / `Powtórzenia` podczas wspólnego treningu,
- usunięto sprzężenie zwrotne `MutationObserver → patch UI → MutationObserver` z warstwy wspólnego treningu,
- podczas wpisywania wartości pola `kg/powt.` warstwy wspólnego i kompaktowego UI nie przebudowują ekranu w tle,
- usunięto zbędne odświeżanie kompaktowego widoku bezpośrednio na każdy `resize` wywołany klawiaturą ekranową,
- w zakładce `Historia` dodano kartę `Logi aplikacji` z przyciskami `KOPIUJ LOGI` i `WYCZYŚĆ LOGI`,
- logi zapisują błędy JS, nieobsłużone Promise, statusy Wi‑Fi, focus pól kg/powt., zmiany viewportu oraz wykryte zatrzymania pętli UI (`UI_STALL`),
- kopiowanie logów korzysta z natywnego schowka Androida,
- wersja podniesiona do `0.8.2.3`, `versionCode 57`.

## 0.8.2.2
- po utworzeniu sesji jako gospodarz panel dołączania jest ukrywany; gospodarz widzi tylko własną sesję i przycisk rozłączenia,
- przy nagłówku `TRENER 2` pojawia się zielony status `HOST` oraz stan `CZEKA NA PARTNERA` / `POŁĄCZONO`,
- ekran połączenia pokazuje dokładny komunikat błędu zamiast samego `Błąd`,
- odrzucenie telefonu z inną wersją kończy teraz także połączenie transportowe; host wraca do oczekiwania zamiast pozostawać w pozornym stanie połączenia,
- gospodarz i gość dostają czytelny komunikat z obiema wersjami aplikacji przy niezgodności,
- usunięto konflikt napisu przycisku trybu wspólnego: pozostaje stale `WSPÓLNY 2–4`,
- stara warstwa UI nie nadpisuje już statusu osoby i odpoczynku podczas aktywnej wspólnej kolejki, dzięki czemu nie powinny migać napisy typu `EDWIN — ODPOCZYWA` / `ODPOCZYNEK`,
- wersja podniesiona do `0.8.2.2`, `versionCode 56`.

## 0.8.2.1
- dwa paski postępu są przypięte w nieruchomym panelu nad `Czas treningu` i `Twój odpoczynek`,
- podczas Twojej aktywnej serii ekran jest utrzymywany włączony; telefon nie powinien sam wygasić ekranu,
- podczas odpoczynku lub oczekiwania na swoją kolej ekran może się wygasić,
- po końcu odpoczynku w treningu solo telefon jest automatycznie wybudzany,
- we wspólnym treningu telefon jest wybudzany po przejściu kolejki hosta na tego uczestnika,
- podczas aktywnego treningu aplikacja utrzymuje lekki częściowy wake lock CPU, aby timer i synchronizacja mogły wybudzić ekran po przerwie,
- ekran treningu może zostać pokazany nad ekranem blokady, ale aplikacja nie omija systemowego PIN-u/hasła,
- raport testowy zapisuje ostatnią serię również wtedy, gdy ta seria natychmiast kończy trening,
- ręczne pominięcie odpoczynku jest zapisywane jako `REST_SKIP`, a nie `REST_END`,
- punkt `PROBLEM` zapisuje dodatkowo pozycję przewinięcia i wartości obu pasków postępu,
- wersja podniesiona do `0.8.2.1`, `versionCode 55`.

## 0.8.2
- wspólny trening wymaga teraz dokładnie tej samej wersji Trener 2 na wszystkich telefonach; niezgodna wersja jest odrzucana przed rozpoczęciem sesji,
- lista uczestników pokazuje wersję aplikacji i jej zgodność,
- dodana ochrona błędów warstwy synchronizacji wspólnego treningu z lokalnym raportem ostatnich błędów,
- plan gospodarza jest jawnie pokazany jako plan wspólnej sesji; lokalny plan gościa nie jest nadpisywany,
- dodane dwa paski podczas treningu: `POSTĘP SERII` oraz `POSTĘP TRENINGU`, liczone dla bieżącego użytkownika,
- w trybie wspólnym paski uwzględniają indywidualne dodatkowe serie,
- wzmocnione ograniczenia szerokości elementów wspólnego treningu, aby uniknąć ucinania boków interfejsu,
- wersja podniesiona do `0.8.2`, `versionCode 54`.

## 0.7.9 Beta
- dodane gesty lewo/prawo między głównymi zakładkami poza aktywnym treningiem,
- gest rozpoczęty na polu, przycisku, menu lub innym elemencie interaktywnym jest ignorowany, żeby nie przeszkadzać w wpisywaniu i klikaniu,
- podczas aktywnego treningu gesty nie zmieniają stanu treningu; przewijają tylko bezpieczne karty pomocnicze `Seria`, `Ostatnie serie`, `Jak wykonać`, `Nawodnienie`,
- pola `kg` i `powtórzenia/sekundy` mają lokalny autosave przypięty do bieżącego ćwiczenia, serii i uczestnika; po zgaszeniu ekranu lub przejściu aplikacji w tło wpisane wartości nie powinny znikać,
- dodany lokalny raport sesji beta z chronologią: start, zapis serii, początek/koniec przerwy, pauza/wznowienie, zmiana ćwiczenia/serii, stan sieci, nawodnienie, przejście aplikacji w tło i zakończenie,
- raport rejestruje również błędy JavaScript i nieobsłużone błędy asynchroniczne podczas aktywnego treningu,
- w ekranie treningu jest `⚑ PROBLEM`, który zapisuje dokładny punkt czasu wraz z ekranem, ćwiczeniem, serią, wpisanymi polami i stanem synchronizacji,
- ostatni raport jest widoczny w Historii i można go skopiować jako JSON do analizy po treningu,
- aplikacja przechowuje lokalnie maksymalnie 20 ostatnich raportów testowych, bez wysyłania ich do chmury,
- wersja podniesiona do `0.7.9-beta`, `versionCode 46`.

## 0.7.8 Beta
- dodany moduł `Nawodnienie` w Diecie z własnym celem dziennym i paskiem postępu,
- szybkie porcje wody: `+250 ml`, `+330 ml`, `+500 ml` oraz cofnięcie `−250 ml`,
- historia nawodnienia pokazuje ostatnie 7 dni,
- przypomnienia o wodzie można ustawić co 60 / 90 / 120 minut z ciszą nocną,
- powiadomienie Androida ma akcję `+250 ml`, która dopisuje wodę bez otwierania aplikacji,
- podczas treningu pojawia się `ŁYK WODY` według wybranej częstotliwości, z szybkim `+150 ml` i `+250 ml`,
- widget Androida pokazuje nawodnienie i ma szybkie `+250 ml`,
- ustawienia oraz alarmy nawodnienia wracają po restarcie telefonu,
- wersja podniesiona do `0.7.8-beta`, `versionCode 45`.

## 0.7.7 Beta
- Dieta ma sekcję `Ostatnie` z maksymalnie 10 ostatnio używanymi pozycjami bez duplikatów,
- dodane `Ulubione` z szybkim ponownym dodaniem posiłku jednym przyciskiem,
- ręczny wpis może zapamiętać porcję / ilość, np. `150 g`, `2 szt.` albo `1 porcja`,
- szybkie dodanie zachowuje ostatnią nazwę, typ, kcal, makro i porcję,
- dodany natywny widget Androida 4×2 pokazujący dzisiejsze kcal i białko względem celu,
- widget odświeża się po zmianach Diety i po dotknięciu otwiera bezpośrednio zakładkę `Dieta`,
- dodany wspólny system dźwięków i wibracji: zapis serii, koniec przerwy i zakończenie treningu,
- w Ustawieniach można osobno wyłączyć dźwięk, wibracje i wybrane typy sygnałów oraz ustawić głośność,
- istniejąca wibracja końca przerwy respektuje teraz ustawienie użytkownika i nie jest dublowana,
- wersja podniesiona do `0.7.7-beta`, `versionCode 44`.

## 0.7.6 Beta
- zakładka `Dieta` przestała być makietą i działa jako lokalny dziennik kalorii oraz makro,
- można ustawić własny cel: redukcja / utrzymanie / masa oraz dzienne kcal, białko, węglowodany i tłuszcze,
- dodawanie posiłku zapisuje nazwę, typ, kalorie i makro dla wybranego dnia,
- jeśli kalorie nie są wpisane, aplikacja potrafi policzyć je z makro według 4/4/9,
- bilans dnia pokazuje zjedzone wartości, cel, ile zostało oraz przekroczenie celu,
- dodane przechodzenie między dniami, lista posiłków i usuwanie błędnego wpisu,
- dodana historia ostatnich 7 dni z kcal, białkiem i liczbą posiłków,
- dodana prosta lista zakupów z oznaczaniem produktów jako kupione i czyszczeniem kupionych,
- dane diety zapisują się pod `trainer3.diet.v076`, więc są obejmowane istniejącym eksportem/importem kopii `trainer3.*`,
- wersja podniesiona do `0.7.6-beta`, `versionCode 43`.

## 0.7.5 Beta
- naprawiony wybór zdjęć sylwetki w Androidowym WebView: `Dodaj zdjęcie` otwiera teraz natywny wybór pliku/galerii i zwraca wybrane zdjęcie do aplikacji,
- włączony dostęp WebView do `content://`, dzięki czemu wybrane zdjęcie może zostać odczytane i zapisane lokalnie,
- usunięty duplikat czasu treningu u góry ekranu; podczas treningu obowiązuje stały dolny pasek `CZAS TRENINGU` + `TWÓJ ODPOCZYNEK`,
- menu `⋮` w Historii jest ustawione po prawej stronie karty i nie wychodzi już poza lewą krawędź ekranu,
- kliknięcie poza menu Historii automatycznie je zamyka,
- przycisk `STOP` został doprecyzowany do `ZAKOŃCZ`; pozostaje osobną akcją od `PLAN / WYJDŹ`,
- `ZAKOŃCZ` zapisuje wykonane serie i wraca do `Start`, natomiast `PLAN / WYJDŹ` zapisuje i przechodzi do `Plan`,
- wersja podniesiona do `0.7.5-beta`, `versionCode 42`.

## 0.7.4 Beta
- STOP działa przez nową warstwę `safe finish` i nie może zostać zablokowany przez błąd Wi‑Fi ani starszy handler ekranu treningu,
- ręczne zakończenie zawsze próbuje najpierw zachować checkpoint i własne wykonane serie, a potem kończy lokalnie niezależnie od odpowiedzi drugiego telefonu,
- po STOP aplikacja wraca do głównego widoku `Start`, a po `PLAN / WYJDŹ` kończy trening i otwiera `Plan`,
- podczas aktywnego treningu stały dolny pasek ma dodatkowy przycisk `PLAN / WYJDŹ`, więc użytkownik nie może zostać uwięziony na ekranie treningu,
- normalne zakończenie ostatniej serii również wymusza posprzątanie stanu treningu i powrót do `Start`,
- dodany awaryjny zapis historii, gdy starsza funkcja kończenia rzuci wyjątek po drodze,
- statusy są porządkowane do kolejności `Użytkownik — status`, np. `Edwin — odpoczywa`,
- wersja podniesiona do `0.7.4-beta`, `versionCode 41`.

## 0.7.3 Beta
- dodany osobny automatyczny kanał aktualizacji dla wersji beta,
- beta sprawdza najnowszy prerelease, pobiera podpisane APK i weryfikuje SHA-256,
- po pobraniu aplikacja otwiera systemowy instalator Androida,
- workflow publikuje każdą kolejną betę jako prerelease bez ruszania stabilnego `main`,
- wersja podniesiona do `0.7.3-beta`, `versionCode 40`.

## 0.7.2 Beta
- nowy planer tygodnia jest jedynym widokiem planowania; stary blok `TWÓJ TYDZIEŃ` jest ukryty,
- przy pierwszym uruchomieniu 0.7.2 dotychczasowy tygodniowy rozkład z `trainer3.schedule.v050` jest migrowany do `trainer3.weekPlan.v070`,
- po migracji nowy planer jest źródłem prawdy, a stary klucz jest utrzymywany tylko jako zgodnościowe lustro dla starszych modułów,
- ekran Start dostaje dzisiejszy plan z nowego planera, więc komunikat `DZIŚ` i wybór treningu nie rozjeżdżają się z kalendarzem,
- stare nazwy planów z nazwą dnia nie są używane w nowym planerze,
- nagłówkowy licznik `00:00` nie jest już pokazywany poza aktywnym treningiem,
- podczas treningu na dole ekranu jest stały pasek `CZAS TRENINGU` + `TWÓJ ODPOCZYNEK`, a reszta ekranu pozostaje przewijalna,
- stały pasek pokazuje `GOTOWY`, `PAUZA` albo bieżące odliczanie przerwy i zachowuje możliwość `POMIŃ`,
- wersja podniesiona do `0.7.2-beta`, `versionCode 39`.

## 0.7.1 Beta
- wspólny trening ma jedno źródło prawdy dla interfejsu: kolejkę hosta z `TrenerBeta070`,
- stare lokalne komunikaty typu `TRENUJE NA 2. TELEFONIE` nie sterują już statusem podczas aktywnej sesji wspólnej,
- oba telefony pokazują ten sam stan uczestników: `ĆWICZY TERAZ`, `CZEKA`, `ODPOCZYWA`, `ĆWICZENIE ZAKOŃCZONE — CZEKA`,
- karty uczestników pokazują jawnie `Wykonano X/Y`, żeby nie mylić wykonanych serii z numerem następnej serii,
- panel kolejki został zmniejszony i nie dubluje pełnej listy uczestników,
- duży dolny komunikat oczekiwania został usunięty; dolny panel pokazuje tylko własny odpoczynek, gdy faktycznie trwa,
- przycisk zapisu serii wynika z kolejki hosta i nie może jednocześnie mówić `ĆWICZY TERAZ` oraz `CZEKAJ NA SWOJĄ KOLEJ`,
- po zapisie serii pole powtórzeń jest czyszczone, a ciężar może pozostać do następnej serii,
- etykieta `ZOSTAŁO` została doprecyzowana do `DO KOŃCA`,
- wersja podniesiona do `0.7.1-beta`, `versionCode 38`.

## 0.7.0 Beta.3
- wspólny trening ma dodatkową kontrolę jakości synchronizacji: `SYNC OK`, `SYNC OPÓŹNIONY`, `BRAK SYNC` i `OFFLINE`,
- gość blokuje zapis nowej serii, gdy nie ma świeżego stanu od hosta, zamiast dalej rozjeżdżać trening,
- po odzyskaniu połączenia gość automatycznie prosi hosta o pełny stan sesji,
- host odpowiada pełnym snapshotem kolejki, rekordów, serii dodatkowych i uczestników,
- jeśli telefon gościa odzyska starszy lub wyższy lokalny `rev`, stan hosta nadal ma pierwszeństwo jako źródło prawdy,
- niepotwierdzona seria jest ponawiana po problemie z Wi‑Fi bez tworzenia duplikatu,
- checkpoint kolejki zapisuje również serię oczekującą na ACK; po restarcie aplikacji taka seria wraca i może zostać dosynchronizowana,
- STOP działa lokalnie nawet wtedy, gdy wysłanie komunikatu przez Wi‑Fi rzuci błąd,
- naturalne zakończenie wspólnego treningu również ma lokalny fallback, jeśli sieć zawiedzie podczas FINISH.

## 0.7.0 Beta.2
- uproszczony ekran Plan: TYDZIEŃ / MOJE TRENINGI / ĆWICZENIA, bez pokazywania wszystkich kreatorów naraz,
- edycja dnia otwiera tylko potrzebne opcje: Wolne, Gotowy trening, Partie albo Ćwiczenia,
- nazwy gotowych treningów nie są już przywiązane do konkretnego dnia tygodnia,
- stary rozbudowany widok planu jest ukryty za nowym prostym interfejsem,
- dodany trwały `participantId` oparty na dotychczasowym `deviceId`, niezależny od roboczego numeru osoby w sesji,
- nowe i istniejące wpisy historii są oznaczane `schemaVersion` i trwałą tożsamością uczestnika,
- pojedynczy trening można usunąć przez menu `⋮`, z krótkim `Cofnij`,
- usunięcie historii przelicza dane pochodne Trenera z pozostałych treningów zamiast zostawiać stare wyuczone serie,
- osobne akcje: `Usuń całą historię treningów` oraz `Reset rekomendacji Trenera`, bez kasowania profilu, planów i masy ciała,
- backup nadal używa formatu `trener2-backup` i neutralnego magazynu `trainer3.*`; dodane są tylko `schemaVersion`, `participantId` i metadane zgodności,
- importer nadal przyjmuje starsze kopie i zachowuje nieznane klucze `trainer2.*` / `trainer3.*`.

## 0.7.0 Beta
- nowy wspólny trening 2–4 osoby na jednym wspólnym stanowisku: w danej chwili ćwiczy tylko jedna osoba,
- host jest źródłem prawdy dla kolejki, ćwiczenia i numeru serii,
- zapis serii gościa działa jako żądanie → potwierdzenie hosta → przejście kolejki dalej,
- każdy uczestnik zachowuje własny ciężar, liczbę serii, wynik i historię,
- wszyscy pozostają na tym samym ćwiczeniu do czasu zakończenia wymaganych serii przez całą grupę,
- różna liczba serii i dodatkowe serie są obsługiwane per osoba,
- indywidualny odpoczynek jest respektowany przez kolejkę,
- bezpieczny STOP hosta kończy sesję lokalnie również przy problemie z drugim telefonem,
- opuszczenie sesji przez gościa usuwa go z kolejki bez blokowania pozostałych,
- pełny stan kolejki jest zapisywany lokalnie i odzyskiwany po restarcie,
- zachowany crash-safe checkpoint i historia z 0.6.4.3,
- dodany plan tygodnia: każdy dzień można układać partiami mięśniowymi albo konkretnymi ćwiczeniami,
- zapisane plany dni pojawiają się na ekranie Start,
- osobny workflow beta buduje podpisane APK bez publikowania go jako stabilnej aktualizacji.

## 0.6.4.3
- zapis awaryjny aktywnego treningu po każdej serii i okresowo podczas sesji,
- odzyskiwanie niedokończonego treningu po restarcie aplikacji lub telefonu,
- własny trening we wspólnej sesji trafia do historii natychmiast po ostatniej serii,
- zabezpieczenie przed podwójnym zapisem tej samej sesji,
- okresowy resync wspólnej sesji między telefonami oraz próba ponownego uruchomienia połączenia po odzyskaniu.

## 0.4.2
- nowe logo Trener 2 z czerwono-czarnym hantlem i motywem krwi,
- logo ustawione jako ikona aplikacji Android,
- to samo logo użyte na ekranie startowym podczas uruchamiania,
- zachowany branding `Trener 2 — Idea by Edwin`.

## 0.4.1
- branding `Trener 2 — Idea by Edwin`,
- drugi użytkownik nazwany `Kumpel z siłowni`,
- dołączanie do wspólnej sesji przez kod QR,
- QR zawiera lokalne IP gospodarza i 6-cyfrowy kod sesji,
- po zeskanowaniu dane połączenia uzupełniają się automatycznie,
- ręczne IP + kod nadal działają jako zapasowa metoda,
- dodane skanowanie QR aparatem w Androidzie.

## 0.4.0
- wspólna sesja dwóch telefonów po lokalnym Wi-Fi / hotspocie,
- osobne ciężary, serie, przerwy i progresja każdej osoby,
- synchronizacja bieżącego postępu i brakujących serii po ponownym połączeniu.

## 0.3.0
- osobne repozytorium Trener,
- tryb solo / 2 osoby,
- start, pauza, wznowienie i stop,
- historia i postępy,
- lokalne zdjęcia sylwetki,
- trening mieszany,
- powiadomienia treningowe,
- pusty projekt modułu Dieta,
- eksport / import danych.