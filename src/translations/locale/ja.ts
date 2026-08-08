// 日本語

import type { CommandName } from "src/settings/defaultCommands";

import type { en } from "src/translations/en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "ここにドラッグ",
  add: "追加",
  addSeparator: "区切り線を追加",
  addSubmenu: "サブメニューを追加",
  addCommandOntoEditingToolbar:
    "Obsidian のコマンドライブラリからツールバーにコマンドを追加します。並べ替えはコマンド項目をドラッグ＆ドロップしてください。削除は各項目の右にある削除ボタンから行えます。",
  appearance: "外観",
  buttonSubmenu: "ボタンサブメニュー",
  calloutType: "コールアウトの種類",
  cancel: "キャンセル",
  changeCommandName: "コマンド名を変更",
  changeSubmenuName: "サブメニュー名を変更",
  chooseCommand: "コマンドを選択",
  chooseIcon: "アイコンを選択",
  closed: "折りたたむ",
  collapseState: "折りたたみの状態",
  default: "デフォルト",
  confirm: "確認",
  confirmDelete: "削除しますか？",
  content: "内容",
  customBackgroundColor: "背景色を選択",
  customFontColor: "文字色を選択",
  customFontColors: "カスタム文字色",
  customColors: "カスタムカラー",
  themeColors: "テーマの色",
  standardColors: "標準の色",
  translucentColors: "半透明の色",
  highlighterColors: "蛍光ペンの色",
  delete: "削除",
  dropdownMenu: "ドロップダウンメニュー",
  editingToolbarCommands: "ツールバーにコマンドを追加",
  general: "一般",
  inputContent: "内容を入力",
  inputTitle: "タイトルを入力",
  insert: "挿入",
  menuTypeChanged: "メニューの種類を次に変更しました：",
  more: "その他",
  open: "展開",
  optionalLeaveBlankDefaultTitle: "任意。空欄の場合は既定のタイトルを使用します",
  pleaseEnterNewName: "新しい名前を入力してください：",
  reset: "リセット",
  resetConfiguration: "設定をリセット",
  resetConfigurationDesc:
    "すべての設定とツールバーのコマンド一覧を初期状態に戻します。この操作は元に戻せません。",
  resetConfigurationConfirm:
    "すべての設定とツールバーのコマンド一覧を初期状態に戻します。\nこの操作は元に戻せません。",
  setBackgroundColorToolbar: "ツールバーの背景色を設定します。",
  setColorToolbarIcon: "ツールバーのアイコンの色を設定します。",
  setSizeToolbarIconPx:
    "ツールバーのアイコンサイズ（px）を設定します。既定値：18px",
  commandAlreadyExists: "コマンド {name} はすでに追加されています",
  title: "タイトル",
  toolbarBackgroundColor: "ツールバーの背景色",
  toolbarCommands: "ツールバーのコマンド",
  toolbarIconColor: "ツールバーのアイコンの色",
  toolbarIconSize: "ツールバーのアイコンサイズ",
  toolbarPreviewLabel: "ツールバーのプレビュー（コマンド構成は仮のものです）",
  toInsert: "で挿入",
  setCustomBackground: "🎨 カスタム背景色",
  setCustomBackgroundDesc: "背景色コマンドで使用するユーザー定義の色です。",
  setCustomFontColor: "🖌️ カスタム文字色",
  setCustomFontColorDesc: "文字色コマンドで使用するユーザー定義の色です。",
};

export default ui;

export const commandNames: Record<CommandName, string> = {
  "Toggle toolbar": "ツールバーの表示切り替え",

  "Undo edit": "元に戻す",
  "Redo edit": "やり直す",

  "Remove header level": "見出しを解除",
  "Header 1": "見出し1",
  "Header 2": "見出し2",
  "Header 3": "見出し3",
  "Header 4": "見出し4",
  "Header 5": "見出し5",
  "Header 6": "見出し6",

  Underline: "下線",
  Superscript: "上付き文字",
  Subscript: "下付き文字",
  "Clear text formatting": "文字書式をクリア",
  "Change font color": "文字色を変更",
  "Change background color": "背景色を変更",

  "Justify text": "両端揃え",
  "Align text left": "左揃え",
  "Center text": "中央揃え",
  "Align text right": "右揃え",

  Callout: "コールアウト",

  Headings: "見出し",
  Insert: "挿入",
  Lists: "リスト",
  Alignment: "文字揃え",
  Submenu: "サブメニュー",
  "Vertical split": "区切り線",
};
