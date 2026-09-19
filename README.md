# Trener 2

**Idea by Edwin**

Osobna aplikacja treningowa Android rozwijana w repozytorium `edwinkarolczyk/Trener-`.

## Stan 0.4.2

- nowe czerwono-czarne logo z hantlem jako ikona aplikacji i ekran uruchamiania,
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
- gospodarz tworzy sesję i otrzymuje kod QR oraz 6-cyfrowy kod zapasowy,
- drugi użytkownik jest w interfejsie nazwany `Kumpel z siłowni`,
- Kumpel z siłowni może dołączyć przez zeskanowanie QR bez przepisywania IP i kodu,
- ręczne IP + kod pozostają jako awaryjna metoda połączenia,
- oba telefony widzą postęp obu osób na żywo,
- każdy telefon prowadzi własne ciężary, serie, przerwy i progresję,
- historia wspólnego treningu zapisuje, który użytkownik był właścicielem danego telefonu,
- po krótkim zerwaniu Wi-Fi trening działa lokalnie; po ponownym dołączeniu brakujące serie partnera są dosyłane.

## Jak połączyć dwa telefony

1. Oba telefony muszą być w tej samej sieci Wi-Fi albo jeden może udostępnić hotspot.
2. Na telefonie gospodarza: `Ustawienia -> Dwa telefony -> Utwórz sesję`.
3. Gospodarz pokazuje wygenerowany kod QR.
4. Na telefonie `Kumpel z siłowni` wybierz `Zeskanuj QR` i zeskanuj kod gospodarza.
5. Aplikacja sama uzupełni IP i kod oraz rozpocznie łączenie.
6. Jeśli QR nie zadziała, nadal można wpisać IP gospodarza i 6-cyfrowy kod ręcznie.
7. Gospodarz wybiera plan i uruchamia trening. Kumpel z siłowni otrzymuje ten sam plan automatycznie.
8. Każdy wpisuje swoje serie na swoim telefonie.

Połączenie działa wyłącznie w sieci lokalnej i nie wymaga Internetu. Sesja jest chroniona kodem, ale transport nie jest szyfrowany, dlatego funkcja jest przeznaczona do zaufanej sieci domowej / prywatnego hotspotu.

## Dieta

Moduł jest obecnie tylko zaprojektowany wizualnie. Kalorie, białko, tłuszcze i węglowodany są celowo nieaktywne — liczenie kalorii zostanie dodane później.

## Prywatność

Historia, masa ciała i zdjęcia sylwetki pozostają lokalnie na urządzeniu. Zdjęcia nie są przesyłane podczas synchronizacji Wi-Fi, na GitHub ani do chmury. Wspólna sesja przesyła jedynie dane treningowe potrzebne do pokazania bieżącego postępu.


## Baza żywności (0.8.3)

Dieta → „Znajdź produkt po nazwie”: wpisz np. „kurczak”, „jajko” albo „ryż” i naciśnij SZUKAJ.
Wyszukiwarka pokazuje własne produkty oraz wyniki Open Food Facts. Aby włączyć USDA
(żywność bez kodu kreskowego), pobierz indywidualny darmowy klucz z
https://fdc.nal.usda.gov/api-key-signup i wpisz go w sekcji „USDA — produkty bez kodów”.
Klucz jest przechowywany lokalnie na urządzeniu i nie trafia do eksportu kopii.
Wybierz produkt, sprawdź wartości na 100 g, ustaw ilość w g, szt. lub ml.
Dla sztuk należy podać wagę jednej sztuki; dla ml — g/ml, bo nie wszystkie płyny
ważą tyle samo. „WSTAW DO POSIŁKU” przepisuje dane do istniejącego formularza;
„DODAJ POSIŁEK” zapisuje wpis. Można zapisać własny produkt, np. domowe puree.
Aby poprawić już zapisany posiłek, użyj ikony ✎ w jego wierszu.
Dane Open Food Facts są społecznościowe (ODbL) i mogą być niepełne.

Test manualny: wyszukanie i zapis własnego produktu offline, wybór OFF online,
wyszukiwanie USDA z kluczem i błędnym kluczem, 200 g / 3 szt. / 250 ml,
edycja i usunięcie posiłku, ponowne uruchomienie, eksport/import oraz skan EAN.
