# Trener 2 — wersjonowanie

Od linii 0.8 testowe APK używają czytelnego numeru wersji bez sufiksów typu `beta.2`.

- `0.8` — baza danej linii funkcjonalnej.
- `0.8.1`, `0.8.2` — zauważalna funkcja lub większa zmiana.
- `0.8.1.1`, `0.8.1.2` — mały fix bez istotnej zmiany funkcjonalnej.
- `versionCode` Androida rośnie przy każdym publikowanym APK, także przy małym fixie.

Kanał testowy jest rozpoznawany przez konfigurację buildu i prerelease GitHub, a nie przez dopisywanie `-beta` do wersji widocznej użytkownikowi.

## Gałęzie od 0.8.2.12

- `main` jest aktualną bazą roboczą Trenera 2 i powinien zawsze przechodzić testy oraz kompilację.
- Małe, bezpieczne poprawki mogą trafiać bezpośrednio na `main`.
- Większe funkcje i przebudowy powstają na osobnych gałęziach `feature/...` utworzonych z aktualnego `main`, a potem są scalane po testach.
- `beta/0.7.0` pozostaje jako gałąź historyczna dotychczasowej linii rozwojowej; po promocji 0.8.2.12 nie jest już bazą nowych prac.

## Zgodność wsteczna od 0.8.2.12

Zgodność wsteczna jest obowiązkową zasadą projektu.

- Aktualizacja nie może kasować ani unieważniać istniejącej historii treningów, progresu, planów, Diety, zdjęć, ustawień ani innych danych użytkownika.
- Migracje danych mają być addytywne: nowe pola dostają wartości domyślne, a starsze rekordy pozostają odczytywalne.
- Import ma nadal przyjmować starsze backupy `trainer2.*` / `trainer3.*`; nowe wersje formatu muszą być migrowane zamiast odrzucane bez potrzeby.
- Zmiana protokołu wspólnego treningu nie może opierać zgodności wyłącznie na numerze `versionName`. Przy przebudowie trybu wspólnego zostanie wprowadzony osobny `protocolVersion`.
- Dla danych lokalnych i backupów należy utrzymywać jawne wersje schematu i migracje, gdy struktura faktycznie się zmienia.
