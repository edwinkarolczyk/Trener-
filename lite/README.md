# Trener 2 Lite – Amazon Fire OS 5 / Android 5.1+

Oddzielna aplikacja treningowa bez diety, usług Google Play, Internetu, WebView i reklam.

- Identyfikator pakietu: `pl.edwin.trener2lite` (nie nadpisuje pełnego Trenera 2).
- Minimum: API 22, Android 5.1; szczególnie Amazon Fire OS 5.
- Interfejs dotykowy dla tabletu: duże przyciski, pola do wpisywania kg/powtórzeń, tryb pionowy i poziomy.
- Oddzielne profile, plany, ćwiczenia, historia, obciążenia, zapisywanie każdej serii bez Internetu.
- JSON: ręczny eksport i odtworzenie. Import zastępuje obecne dane po potwierdzeniu – najpierw wykonaj kopię.
- Wersja źródłowa 0.1.0. Wymaga testu na fizycznym Amazon SR043KL przed oznaczeniem jako zgodna.

Budowa: `gradle :lite:assembleDebug`; APK: `lite/build/outputs/apk/debug/lite-debug.apk`.
Dostępny workflow `Build Trener 2 Lite` dla osobnej gałęzi.

Nie modyfikuj konfiguracji `app` ani danych głównego Trenera 2.
