# Historia zmian

Wszystkie istotne zmiany w projekcie są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Projekt stosuje [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.3] - 2025-12-05

### Zmienione
- Nazwa użytkownika który wysyła zaproszenia do Webhook Discord wyświetlana jako **pogrubione** pole zamiast stopki

---

## [1.2.2] - 2025-12-05

### Zmienione
- Przeniesiono przycisk "Monitor instancji" obok "Zapraszanie" w nawigacji

---

## [1.2.1] - 2025-12-05

### Zmienione
- Ustawienia tray (w tle) domyślnie wyłączone przy pierwszej instalacji
- Usunięto nieużywane komponenty
- Przeniesienie ustawień zapraszania / instancji do głównych ustawień

### Naprawione
- Naprawiono przewijanie w modalu ustawień na mniejszych oknach

---

## [1.2.0] - 2025-12-05

### Dodane
- **Monitor instancji** - nowa funkcja do śledzenia aktywności na instancji VRChat
  - Monitorowanie dołączeń i wyjść graczy z instancji
  - Śledzenie zmian świata/instancji
  - Osobny webhook Discord dla powiadomień o instancji
  - Dziennik aktywności z filtrowaniem (dołączenia/wyjścia/światy/system)
  - Statystyki: liczba dołączeń, wyjść, zmian świata
  - Wyświetlanie aktualnego świata
  - Nie wymaga logowania do VRChat API
- Nowy przycisk "Monitor instancji" w nawigacji
- Tłumaczenia PL/EN dla monitora instancji
- **Scentralizowane ustawienia** - nowy modal ustawień z zakładkami
  - Wszystkie ustawienia w jednym miejscu (język, motyw, VRChat, tray, limity, webhooki)
  - Zakładki: Ogólne, Aplikacja, Zapraszanie, Monitor
  - Przycisk "Zapisz ustawienia" do zatwierdzenia zmian
  - Wszystkie ustawienia zapisywane w electron-store (nie localStorage)

### Zmienione
- Usunięto przycisk ustawień z panelu zapraszania (ustawienia teraz w nawigacji)
- Usunięto osobny widok ustawień webhooka z monitora instancji

### Naprawione
- Poprawione parsowanie nazwy świata z logów VRChat (obsługa końcówek linii Windows)
- Automatyczne wykrywanie aktualnego świata przy starcie monitorowania
- Naprawiono fałszywe powiadomienia "opuścił instancję" przy zmianie świata przez użytkownika
- Poprawiona ścieżka do ikony aplikacji w konfiguracji buildera

---

## [1.1.0] - 2025-12-05

### Dodane
- Pokazanie operatora w webhookach Discord - stopka pokazuje nazwę zalogowanego użytkownika VRChat ("Wysłane przez {{nazwa}}")
- Automatyczne ustawianie operatora przy logowaniu, weryfikacji 2FA i przywracaniu sesji
- Czyszczenie operatora przy wylogowaniu

---

## [1.0.0] - 2025-01-XX

### Dodane
- Automatyczne zapraszanie graczy do grupy VRChat
- Monitorowanie logów VRChat w czasie rzeczywistym
- Logowanie z obsługą 2FA (TOTP/Email)
- Powiadomienia Discord przez webhooki
- Konfigurowalne limity zapytań API
- Obsługa języka polskiego i angielskiego
- Tryb jasny/ciemny/systemowy

---

## Szablon wydania

```markdown
## [X.X.X] - RRRR-MM-DD

### Dodane
- Nowe funkcje

### Zmienione
- Zmiany w istniejących funkcjach

### Naprawione
- Poprawki błędów

### Bezpieczeństwo
- Poprawki bezpieczeństwa
```
