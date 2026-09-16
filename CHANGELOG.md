# Zmiany

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
