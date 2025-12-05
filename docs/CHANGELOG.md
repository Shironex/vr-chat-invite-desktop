# Historia zmian

Wszystkie istotne zmiany w projekcie są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Projekt stosuje [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
