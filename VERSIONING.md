# Trener 2 — wersjonowanie

Od linii 0.8 testowe APK używają czytelnego numeru wersji bez sufiksów typu `beta.2`.

- `0.8` — baza danej linii funkcjonalnej.
- `0.8.1`, `0.8.2` — zauważalna funkcja lub większa zmiana.
- `0.8.1.1`, `0.8.1.2` — mały fix bez istotnej zmiany funkcjonalnej.
- `versionCode` Androida rośnie przy każdym publikowanym APK, także przy małym fixie.

Kanał testowy jest rozpoznawany przez konfigurację buildu i prerelease GitHub, a nie przez dopisywanie `-beta` do wersji widocznej użytkownikowi.
