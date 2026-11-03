# Config Studio Servers & Fleet Manager (`servers`) 🖥️

[![Version](https://img.shields.io/badge/Version-v1.2.1-teal.svg)](https://github.com/config-studio/config-studio-servers/releases)
[![Format](https://img.shields.io/badge/Format-.cspkg%20(MRS)-blue.svg)](https://github.com/config-studio/config-studio-plugins)
[![Security](https://img.shields.io/badge/Security-Zero--Secret%20Vault-emerald.svg)](https://github.com/config-studio/config-studio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Официальный плагин **Servers & Fleet Manager** для [Config Studio](https://github.com/config-studio/config-studio). 
Является единым центром управления инфраструктурой, объединяющим в себе инвентарь `servers.yaml`, прямое SSH/SFTP управление, встроенный удаленный агент, сканирование локальной сети (LAN Discovery) и безопасную передачу файлов.

---

## ✨ Ключевые возможности

### 1. Универсальный переключатель в шапке (Universal Fleet Switcher)
- Единая компактная кнопка со статусом активного узла, выпадающий список выбора хостов и индикация задержки (`ping ms`).
- **Гибридные действия для каждого сервера:**
  - `⚡ Агент`: прямое чтение и запись файлов через быстрый REST API агента с двухсоставной TOTP-авторизацией.
  - `📁 SFTP`: переход к удаленной файловой системе сервера через нативный SFTP ядра в сайдбаре.
  - `>_ Шелл`: мгновенный запуск интерактивной сессии SSH PTY терминала в нижней панели (Bottom Dock).

### 2. Инвентарь серверов `servers.yaml`
- Все серверы описываются в стандартизированном файле `servers.yaml`: хост, порт, пользователь, признак Canary, теги (`prod`, `staging`, `web`) и pre/post hooks.
- Встроенный редактор YAML с валидацией схемы и сохранением в 1 клик.
- Быстрая фильтрация по тегам и группам в боковой панели.

### 3. Zero-Secret Безопасность через Core Vault
- Никакие пароли, секретные ключи SSH или токены TOTP не хранятся в открытом виде в `servers.yaml`.
- Все секреты сохраняются в зашифрованном системном хранилище ядра Core Vault (`window.ConfigStudio.secrets` / OS Keychain / AES-256-GCM).
- В выпадающих списках ключей отображаются понятные имена `Title [ID]`, исключая ошибки оператора.

### 4. 1-Click Автоустановка агента (Daemon Auto-Onboarding)
- Автоматическое определение архитектуры (`linux/amd64`, `linux/arm64`) и системы инициализации (`systemctl` / `OpenRC` / `nohup`) удаленного сервера через SSH.
- Выбор кастомного порта агента (по умолчанию `8085`).
- Автоматическая загрузка бинарника `config-studio-agent` по SFTP, генерация `agent.yaml`, безопасная генерация Master/TOTP секретов и регистрация системного сервиса.

### 5. Автообнаружение в локальной сети (LAN Discovery) & 1-Click Adopt
- Быстрое параллельное сканирование локальной подсети (`192.168.x.1..254`) на наличие запущенных демонов `config-studio-agent`.
- Сопряжение обнаруженного узла во флот нажатием кнопки «Принять (Adopt)» в 1 клик.

### 6. Передача файлов на узел (Deploy to Fleet)
- Отправка открытого в редакторе файла на любой сервер флота или группу узлов с подтверждением пути назначения.

### 7. Дизайн-система `@config-studio/ui`
- Все окна приведены к эталонным размерам дизайн-системы: `.cs-fleet-modal-lg cs-fleet-modal-fixed` (720px, фиксированная высота без скачков) и `.cs-fleet-modal-md` (540px).
- Кастомные Dropdown-селекторы с индикаторами статуса серверов, бейджами типов секретов и автоматическим разворотом вверх (`openUpward`) при нехватке места.

---

## 📦 Установка

### В 1 клик из приложения (рекомендуется)
1. В Config Studio откройте **Настройки (⚙️) → Плагины → вкладка Каталог**.
2. Найдите **Флот серверов & Инвентарь (`servers`)** и нажмите **«Установить»**.

### Установка пакета `.cspkg`
1. Скачайте актуальный бинарный пакет `servers.cspkg` со страницы [Релизов](https://github.com/config-studio/config-studio-servers/releases).
2. Перетащите скачанный файл `.cspkg` в окно настроек Config Studio (вкладка «Плагины»).

---

## 📄 Лицензия

MIT License © 2026 Edvard Baldanov
