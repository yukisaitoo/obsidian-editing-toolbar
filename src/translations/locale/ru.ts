// Русский

import type { CommandName } from "src/settings/defaultCommands";

import type { en } from "src/translations/en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "Перетащите сюда",
  add: "Добавить",
  addSeparator: "Добавить разделитель",
  addSubmenu: "Добавить подменю",
  addCommandOntoEditingToolbar:
    "Добавьте команду на панель инструментов из библиотеки команд Obsidian. Для изменения порядка перетаскивайте элементы команд. Для удаления используйте кнопку удаления справа от команды.",
  appearance: "Внешний вид",
  buttonSubmenu: "Подменю кнопки",
  calloutType: "Тип Callout",
  cancel: "Отмена",
  changeCommandName: "Изменить название команды",
  changeSubmenuName: "Изменить название подменю",
  chooseCommand: "Выберите команду",
  chooseIcon: "Выберите значок",
  closed: "Свернуто",
  collapseState: "Состояние сворачивания",
  default: "По умолчанию",
  confirm: "Подтвердить",
  confirmDelete: "Подтвердить удаление?",
  content: "Содержимое",
  customBackgroundColor: "Пользовательский цвет фона",
  customFontColor: "Пользовательский цвет текста",
  customFontColors: "Пользовательские цвета шрифта",
  customColors: "Пользовательские цвета",
  themeColors: "Цвета темы",
  standardColors: "Стандартные цвета",
  translucentColors: "Полупрозрачные цвета",
  highlighterColors: "Цвета маркера",
  delete: "Удалить",
  dropdownMenu: "Выпадающее меню",
  editingToolbarCommands: "Команды панели инструментов",
  general: "Основные",
  inputContent: "Введите содержимое",
  inputTitle: "Введите заголовок",
  insert: "Вставить",
  menuTypeChanged: "Тип меню изменён на",
  more: "Ещё",
  open: "Развернуто",
  optionalLeaveBlankDefaultTitle:
    "Необязательно, оставьте пустым для заголовка по умолчанию",
  pleaseEnterNewName: "Введите новое название: ",
  reset: "Сбросить",
  setBackgroundColorToolbar: "Установить цвет фона панели инструментов.",
  setColorToolbarIcon: "Установить цвет значков панели инструментов.",
  setSizeToolbarIconPx:
    "Установить размер значков панели инструментов (px); по умолчанию: 18px",
  commandAlreadyExists: "Команда {name} уже существует",
  title: "Заголовок",
  toolbarBackgroundColor: "Цвет фона панели инструментов",
  toolbarCommands: "Команды панели инструментов",
  toolbarIconColor: "Цвет значков панели инструментов",
  toolbarIconSize: "Размер значков панели инструментов",
  toolbarPreviewLabel:
    "Предпросмотр панели инструментов (с примерной конфигурацией команд)",
  toInsert: "вставить",
  setCustomBackground: "🎨 Настроить цвет фона",
  setCustomFontColor: "🖌️ Настроить цвет текста",
};

export default ui;

export const commandNames: Record<CommandName, string> = {
  "Toggle toolbar": "Показать/скрыть панель инструментов",

  "Undo edit": "Отменить действие",
  "Redo edit": "Повторить действие",

  "Remove header level": "Убрать заголовок",
  "Header 1": "Заголовок 1",
  "Header 2": "Заголовок 2",
  "Header 3": "Заголовок 3",
  "Header 4": "Заголовок 4",
  "Header 5": "Заголовок 5",
  "Header 6": "Заголовок 6",

  Underline: "Подчёркнутый",
  Superscript: "Верхний индекс",
  Subscript: "Нижний индекс",
  "Clear text formatting": "Очистить форматирование текста",
  "Change font color": "Изменить цвет текста",
  "Change background color": "Изменить цвет фона",

  "Justify text": "Выровнять по ширине",
  "Align text left": "Выровнять по левому краю",
  "Center text": "Выровнять по центру",
  "Align text right": "Выровнять по правому краю",

  Callout: "Выноска",

  Headings: "Заголовки",
  Insert: "Вставка",
  Lists: "Списки",
  Alignment: "Выравнивание",
  Submenu: "Подменю",
  "Vertical split": "Разделитель",
};
