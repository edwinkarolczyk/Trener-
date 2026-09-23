# Trener 2 — 0.8.9.3: kontrola na dwóch telefonach

Instaluj APK **jako aktualizację**, nie odinstalowuj starszej wersji. Najpierw wyeksportuj kopię. Test automatyczny symuluje focus i widget, ale nie zastępuje ręcznego sprawdzenia Android WebView, klawiatury i widgetów.

1. **Przebieg treningu i klawiatura:** Start → wybierz plan → rozpocznij trening; edytuj kg i powtórzenia przy otwartej klawiaturze, przewijaj w dół/górę i przełącz ćwiczenie. Pole nie powinno tracić fokusu, klawiatura nie powinna się chować sama, ekran nie powinien skakać po zmianie rozmiaru.
2. **Plan:** pozostaw rozwiniętą listę treningów przez 10 sekund, ręcznie wybierz drugi plan; weryfikuj brak migania, brak zmiany wyboru po przejściu do Diety i z powrotem.
3. **Widget treningu:** ustaw widget na pulpicie; start, nowa seria, następne ćwiczenie, pauza, wznowienie i zakończenie powinny aktualizować dane; sprawdź też po zablokowaniu i odblokowaniu telefonu.
4. **Widget posiłku:** dodaj posiłek ze składników; widget dzienny powinien pokazać sumę tylko raz. Edycja gramów powinna przeliczyć kcal/B/W/T i widget. Zmiana wybranego w aplikacji dnia nie może przenieść wczorajszego bilansu na dzisiejszy widget.
5. **Wspólny trening:** telefon A 0.8.9.3, telefon B 0.8.9.2: połączenie musi zostać odrzucone. Dwa telefony 0.8.9.3: połącz, rozpocznij, rozłącz Wi-Fi, połącz ponownie, dokończ; w historii powinny zostać zapisane serie każdego uczestnika.
6. **Dieta historyczna:** wybierz wczoraj, dodaj zapisany zestaw i zduplikuj posiłek; oba powinny zostać w otwartym dniu. Woda z wczoraj powinna być odczytana z historii; brak zapisu jest pokazany jako „—”.
7. **Kopie:** zrób zdjęcie postępu, dodaj wpisy treningów i posiłków, ustaw cel i wodę, wyeksportuj JSON. Sprawdź obecność `storage["trainer3.photos"]` i `nativeHydration`; import na osobnym środowisku testowym powinien odtworzyć zdjęcie i dawne daty wody. Nie używaj produkcyjnych danych do testu nadpisywania.

W przypadku niepowodzenia wyślij: wersję, model telefonu, Android, krótkie wideo lub screen oraz log diagnostyczny z godziny problemu. Nie czyść danych ani nie odinstalowuj aplikacji.
