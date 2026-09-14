# Trener 2

Osobna aplikacja treningowa Android rozwijana w repozytorium `edwinkarolczyk/Trener-`.

## Stan 0.4.0

- tryb solo i trening dla 2 osób na jednym telefonie,
- START / PAUZA / WZNÓW / STOP,
- automatyczne przerwy zależne od ćwiczenia,
- zapis ciężaru, powtórzeń, czasu i objętości,
- logika progresji: dołóż / zostaw / odejmij ciężar,
- plan PON / ŚR / PT + dodatkowy biceps,
- kreator treningu mieszanego z biblioteki ćwiczeń,
- historia treningów,
- ekran Postępy: masa ciała, rekordy, serie i objętość,
- lokalne zdjęcia sylwetki,
- przypomnienia treningowe Android z wyborem dni i godziny,
- eksport / import historii i ustawień do JSON,
- wspólna sesja dwóch telefonów po lokalnym Wi-Fi / hotspocie,
- gospodarz tworzy sesję i otrzymuje 6-cyfrowy kod,
- partner dołącza po IP gospodarza i kodzie,
- oba telefony widzą postęp obu osób na żywo,
- każdy telefon prowadzi własne ciężary, serie, przerwy i progresję,
- historia wspólnego treningu zapisuje, który użytkownik był właścicielem danego telefonu,
- po krótkim zerwaniu Wi-Fi trening działa lokalnie; po ponownym dołączeniu brakujące serie partnera są dosyłane.

## Jak połączyć dwa telefony

1. Oba telefony muszą być w tej samej sieci Wi-Fi albo jeden może udostępnić hotspot.
2. Na telefonie gospodarza: `Ustawienia -> Dwa telefony -> Utwórz sesję`.
3. Na drugim telefonie wpisz IP gospodarza i 6-cyfrowy kod, następnie wybierz `Dołącz`.
4. Gospodarz wybiera plan i uruchamia trening. Partner otrzymuje ten sam plan automatycznie.
5. Każdy wpisuje swoje serie na swoim telefonie.

Połączenie działa wyłącznie w sieci lokalnej i nie wymaga Internetu. Sesja jest chroniona kodem, ale transport nie jest szyfrowany, dlatego funkcja jest przeznaczona do zaufanej sieci domowej / prywatnego hotspotu.

## Dieta

Moduł jest obecnie tylko zaprojektowany wizualnie. Kalorie, białko, tłuszcze i węglowodany są celowo nieaktywne — liczenie kalorii zostanie dodane później.

## Prywatność

Historia, masa ciała i zdjęcia sylwetki pozostają lokalnie na urządzeniu. Zdjęcia nie są przesyłane podczas synchronizacji Wi-Fi, na GitHub ani do chmury. Wspólna sesja przesyła jedynie dane treningowe potrzebne do pokazania bieżącego postępu.
