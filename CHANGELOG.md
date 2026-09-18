# Zmiany

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